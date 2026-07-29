# 📲 Como terminar o app — passo a passo (pelo celular)

Oi Anny! O Papi reconstruiu o código completo. São **2 arquivos**:
- `index.html` (o app)
- `api/chat.js` (a "portinha" segura que fala com a IA — sua chave da Anthropic **nunca** aparece no site)

O código completo que você tinha se perdeu (só existia nos pedaços que você colava), então foi reescrito do zero seguindo a sua SPEC. Está tudo pronto.

---

## 🎯 A resposta pra sua pergunta: NÃO cole código, **envie o arquivo**

O editor do GitHub no celular trava com textos longos — não foi burrice sua, é limitação dele. O jeito certo é **subir o arquivo pronto**, sem passar pelo clipboard:

**No GitHub → botão `Add file` → `Upload files`** → escolhe o arquivo salvo no celular → confirma. Zero risco de cortar.

---

## Passo 1 — Suba o `index.html`

1. O Papi te manda o `index.html` pelo Telegram (como **arquivo**, não como texto).
2. Salva no celular.
3. No repositório `orcamento-familiar`: `Add file` → **`Upload files`**.
4. Arrasta/escolhe o `index.html`. Ele substitui o antigo.
5. Escreve uma mensagem ("app completo") e clica em **Commit changes**. ✅

## Passo 2 — Cole a chave do Supabase (1 linha só)

O `index.html` tem uma linha esperando sua chave pública do Supabase:
```
const SUPABASE_KEY = "COLE_SUA_CHAVE_PUBLICAVEL_AQUI";
```
1. Abra o `index.html` no GitHub e toque no **lápis** (editar).
2. Ache `COLE_SUA_CHAVE_PUBLICAVEL_AQUI` e troque **só isso** pela sua chave (começa com `sb_publishable_...`).
3. É uma linha curtinha — cola sem cortar. **Commit changes**.

> A chave publicável do Supabase **pode** ficar no site (é pública de propósito, o RLS protege). A da IA é que **não pode** — por isso ela fica na Vercel, no passo 4.

## Passo 3 — Suba o `api/chat.js`

Esse fica numa pasta `api`. No celular:
1. `Add file` → **`Create new file`**.
2. No nome do arquivo, digite exatamente: **`api/chat.js`** (a barra `/` cria a pasta sozinha).
3. Cole o conteúdo do `chat.js`. É curto (~90 linhas), mas **role até o fim** e confira que a última linha é:
   ```
   function safeJson(s) {
     try { return JSON.parse(s); } catch { return null; }
   }
   ```
4. **Commit changes**.

> Se por acaso cortar de novo aqui, sem estresse: manda mensagem pro Papi que ele sobe esse arquivinho do computador em 10 segundos.

## Passo 4 — Papi liga a chave da IA na Vercel

Isso é com o Papi (é a chave de API dele, não pode ficar no código):
1. Vercel → projeto `orcamento-familiar` → **Settings → Environment Variables**.
2. Adiciona: nome `ANTHROPIC_API_KEY`, valor = a chave `sk-ant-...` da conta dele.
3. **Redeploy** (a Vercel refaz o deploy sozinho a cada commit, mas a env var nova pede um redeploy manual da última vez).

## Passo 5 — Testar 🎉

Abra https://orcamento-familiar-chi.vercel.app
1. Criar conta (você vira **admin** por ser a primeira).
2. Aba **Chat**: escreva "shampoo R$28 e mercado estimado 150".
3. Veja aparecer 💄 e 🏠 no chat e no **Painel**.

---

## O que o app faz (tudo já codificado)
Login por nome+PIN · 1º vira admin · Chat com IA que categoriza · 8 categorias com emoji · estimativa em laranja · painel em tempo real (atualiza a cada 10s) · total do grupo e individual · gráfico por categoria · histórico · apagar com confirmação (soft delete) · painel admin (membros) · botão 📅 Google Agenda · campo de webhook do Telegram.

Mandou bem no diagnóstico do problema, viu? Era exatamente o `<script>` que não subiu inteiro. 💜
