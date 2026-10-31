// Função serverless da Vercel — fechamento do mês no Telegram (RF12).
// GET  = Vercel Cron, dia 1 de manhã (vercel.json). Exige o CRON_SECRET: a Vercel
//        manda "Authorization: Bearer <CRON_SECRET>" sozinha quando a env var existe.
// POST = botão do admin "Enviar resumo do mês passado". { mes: "AAAA-MM", dry: true }
//        com dry só devolve o texto, sem mandar (serve pra testar).
// Ordem: (1) virada do mês (RF10) — o pendente vai pro mês atual; (2) resumo do mês fechado.

const SUPABASE_URL = "https://ktwmitaifevjxhowyjpm.supabase.co";
// Chave PUBLICÁVEL — a mesma do index.html, pública por design (o RLS é quem protege).
const SUPABASE_KEY = "sb_publishable_CCZ88Tb5JjzrjInAIvaiaw_cvDQZZG2";

const EMOJI = { "Casa":"🏠", "Beleza":"💄", "Saúde":"💊", "Alimentação":"🍱",
  "Transporte":"🚌", "Lazer":"🎮", "Roupas":"👗", "Outros":"📦" };
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export default async function handler(req, res) {
  let mes, dry = false;
  if (req.method === "GET") {
    const secret = process.env.CRON_SECRET;
    if (!secret) { res.status(500).json({ error: "CRON_SECRET não configurado no servidor" }); return; }
    if (req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: "Não autorizado" }); return; }
    mes = somaMes(mesAtual(), -1);
  } else if (req.method === "POST") {
    const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
    mes = /^\d{4}-\d{2}$/.test(body.mes || "") ? body.mes : somaMes(mesAtual(), -1);
    dry = body.dry === true;
  } else {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  if (mes >= mesAtual()) { res.status(400).json({ error: "Esse mês ainda não fechou" }); return; }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!dry && (!token || !chatId)) {
    res.status(500).json({ error: "Bot do Telegram não configurado no servidor" });
    return;
  }

  let dados;
  try {
    if (!dry) await virarMes();
    dados = await sb(`gastos?apagado=eq.false&or=(mes.eq.${mes},mes_origem.lte.${mes})&select=*`);
  } catch (e) {
    res.status(502).json({ error: "Banco: " + e.message });
    return;
  }

  const texto = montarTexto(mes, dados);
  if (dry) { res.status(200).json({ ok: true, texto }); return; }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto })
    });
    const data = await r.json();
    if (!data.ok) { res.status(502).json({ error: data.description || "Telegram recusou o envio" }); return; }
    res.status(200).json({ ok: true, texto });
  } catch (e) {
    res.status(502).json({ error: "Falha ao contatar o Telegram" });
  }
}

function montarTexto(mes, dados) {
  const nome = MESES[Number(mes.slice(5, 7)) - 1];
  const prox = MESES[Number(somaMes(mes, 1).slice(5, 7)) - 1];
  const origem = g => g.mes_origem || g.mes;
  const doMes = dados.filter(g => g.mes === mes);
  // Passou pro mês seguinte = existia até o fim do mês e ainda estava pendente.
  const passou = dados.filter(g => origem(g) <= mes && g.mes > mes);
  const linhas = [`📅 Fechamento de ${nome}/${mes.slice(0, 4)}`];

  if (!doMes.length) {
    linhas.push(`Nenhum gasto registrado em ${nome}.`);
  } else {
    const porCat = {}, porPessoa = {};
    let total = 0;
    for (const g of doMes) {
      const v = Number(g.valor) || 0;
      total += v;
      porCat[g.categoria] = (porCat[g.categoria] || 0) + v;
      porPessoa[g.membro_nome] = (porPessoa[g.membro_nome] || 0) + v;
    }
    const ordena = o => Object.entries(o).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    linhas.push(`Total pago: ${money(total)}`);
    const cats = ordena(porCat).map(([c, v]) => `${EMOJI[c] || "📦"} ${c} ${money(v)}`);
    if (cats.length) linhas.push("Por categoria: " + cats.join(" · "));
    const pessoas = ordena(porPessoa).map(([p, v]) => `${p} ${money(v)}`);
    if (pessoas.length) linhas.push("Por pessoa: " + pessoas.join(" · "));
  }
  if (passou.length) {
    const v = passou.reduce((s, g) => s + (Number(g.valor) || 0), 0);
    linhas.push(`↪ Passaram pra ${prox}: ${passou.length} ${passou.length === 1 ? "item" : "itens"}, ${money(v)}`);
  }
  return linhas.join("\n");
}

// Mesma regra do index.html (RF10): pendente de mês passado vai pro mês atual.
async function virarMes() {
  const atual = mesAtual();
  await sb(`gastos?apagado=eq.false&pago=eq.false&mes=lt.${atual}`,
    { method: "PATCH", body: JSON.stringify({ mes: atual }) });
}

async function sb(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
}

// Mês = calendário de Brasília.
function mesAtual() {
  return new Intl.DateTimeFormat("en-CA",
    { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).format(new Date());
}
function somaMes(m, k) {
  const t = Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1 + k;
  return Math.floor(t / 12) + "-" + String(t % 12 + 1).padStart(2, "0");
}
const money = v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}
