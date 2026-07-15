// Função serverless da Vercel — proxy seguro para a API da Anthropic.
// A chave NUNCA vai para o navegador: fica na env var ANTHROPIC_API_KEY (Vercel).
// O index.html chama /api/chat; esta função fala com a Anthropic e devolve só o JSON.

const CATEGORIAS = ["Casa", "Beleza", "Saúde", "Alimentação", "Transporte", "Lazer", "Roupas", "Outros"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itens"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "valor", "estimado", "categoria", "data_lembrete"],
        properties: {
          nome: { type: "string" },
          valor: { anyOf: [{ type: "number" }, { type: "null" }] },
          estimado: { type: "boolean" },
          categoria: { type: "string", enum: CATEGORIAS },
          data_lembrete: { anyOf: [{ type: "string" }, { type: "null" }] }
        }
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Chave da API não configurada no servidor" });
    return;
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const texto = (body.texto || "").toString().slice(0, 2000).trim();
  if (!texto) {
    res.status(400).json({ error: "Texto vazio" });
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const system =
    "Você interpreta mensagens de gastos domésticos em português do Brasil. " +
    "Extraia cada item de gasto com nome curto, valor em reais (número) e categoria. " +
    "estimado=true quando o valor for aproximado/estimado OU quando não houver valor nenhum; " +
    "estimado=false quando a pessoa informou um valor exato. " +
    "IMPORTANTE: se a pessoa disse um valor, MANTENHA esse valor mesmo que seja uma estimativa " +
    "(ex: 'mercado estimado 150' → valor=150, estimado=true). " +
    "Use valor=null APENAS quando nenhum valor foi informado (ex: 'comprei shampoo'). " +
    `Categorias possíveis: ${CATEGORIAS.join(", ")}. Use exatamente esses nomes. ` +
    "Casa=mercado/limpeza/luz/água; Beleza=shampoo/maquiagem/skincare; Saúde=remédio/médico/academia; " +
    "Alimentação=delivery/restaurante/lanche; Transporte=uber/ônibus/gasolina; Lazer=cinema/streaming/festa; " +
    "Roupas=roupa/sapato/bolsa; Outros=qualquer outra coisa. " +
    `Hoje é ${hoje}. Preencha data_lembrete (formato AAAA-MM-DD) só quando o texto indicar uma data futura de pagamento/compra; caso contrário use null.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: texto }]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: (data.error && data.error.message) || "Erro na IA" });
      return;
    }
    const txt = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = safeJson(txt);
    if (!parsed || !Array.isArray(parsed.itens)) {
      res.status(502).json({ error: "Resposta da IA inválida" });
      return;
    }
    res.status(200).json({ itens: parsed.itens });
  } catch (e) {
    res.status(502).json({ error: "Falha ao contatar a IA" });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}
