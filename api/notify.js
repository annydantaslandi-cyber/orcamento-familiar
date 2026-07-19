// Função serverless da Vercel — envia a notificação de gasto pro Telegram.
// O token do bot fica SECRETO na env var (igual a chave da IA); nunca vai pro cliente.
// Texto puro (sem parse_mode) de propósito: evita a armadilha de escape do Markdown/HTML.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    res.status(500).json({ error: "Bot do Telegram não configurado no servidor" });
    return;
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const teste = body.teste === true;

  let texto;
  if (teste) {
    texto = "🔔 Teste de notificação — se você recebeu isto, o Orçamento Familiar está conectado ao Telegram. ✅";
  } else {
    const membro = String(body.membro || "Alguém").slice(0, 60);
    const item = String(body.item || "gasto").slice(0, 80);
    const categoria = String(body.categoria || "").slice(0, 40);
    const valor = String(body.valor || "").slice(0, 30);
    texto = `💰 Novo gasto — ${membro} registrou:\n${categoria ? categoria + " · " : ""}${item} — ${valor}`;
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto, disable_notification: false })
    });
    const data = await r.json();
    if (!data.ok) {
      // erro do Telegram (chat_id errado, bot bloqueado, etc.) — devolve a descrição crua
      res.status(502).json({ error: data.description || "Telegram recusou o envio" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: "Falha ao contatar o Telegram" });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}
