# SPEC v2 — Mês, parcelas e fechamento (RF08–RF12)

> Emenda à SPEC da Anny (`SPEC-orcamento-domestico-ANNY.pdf`, RF01–RF07). As RF01–RF07 continuam valendo; esta emenda **acrescenta** e, onde muda algo que já existe, diz exatamente o quê.
> Status: **APROVADA pelo Alecs em 31/10/2026** (decisão de 31/10/2026: o Alecs aprova, a Anny lê e incorpora na SPEC dela).

## Por que
Os dados do banco (31/10/2026) mostram 55 gastos lançados e 44 apagados — quase todos compras parceladas ("Panelas parcela 2", "Liquidificador (parcela 3)"…) lançadas, apagadas e relançadas, porque o app grava todas as parcelas no mês atual. E o painel soma todos os meses juntos: o "total do grupo" é o acumulado desde julho, não o mês. Desde 02/09 ninguém lança nada.

O app é um **controle de gastos do mês**, não um orçamento com metas: **fora do escopo** metas por categoria, registro de renda/entradas e saldo.

## Catálogo

| endereço | requisito | § | validação |
|---|---|---|---|
| RF08 | Parcelamento: uma compra em N vezes vira N lançamentos, um por mês | §1 | teste ponta a ponta "panela 500 em 5x" |
| RF09 | Todo gasto nasce **pendente**; marcar ✓ pago (e desmarcar) | §2 | teste ponta a ponta |
| RF10 | Painel = mês atual; na virada, o pendente passa pro mês novo | §3 | teste com mês simulado |
| RF11 | Meses anteriores, numa tela separada | §4 | teste ponta a ponta |
| RF12 | Resumo do mês fechado no Telegram, dia 1 de manhã | §5 | disparo manual + 1º dia 1 real |
| RF13 | Admin apaga gasto **de vez** (some do banco), em qualquer mês, pra limpar testes | §6 | teste ponta a ponta + conferir o banco |

## §1 Parcelamento ⟨RF08⟩
- A IA passa a devolver, por item, `parcelas` (inteiro ≥ 1; 1 = à vista) e `valor` = **valor TOTAL da compra**. "panela 500 em 5x" e "panela 5x de 100" dão os dois `valor=500, parcelas=5`.
- O app divide em centavos: parcelas iguais e a diferença do arredondamento vai na **última** (100 em 3x → 33,33 · 33,33 · 33,34).
- A parcela 1 cai no **mês atual**; a parcela k cai no mês atual + (k−1).
- Nome de cada lançamento: `<nome> (k/N)` — ex.: `Panelas (2/5)`.
- Se o texto trouxe data de lembrete, a parcela k leva a mesma data + (k−1) meses (dia 31 em mês curto → último dia do mês).
- As N parcelas compartilham um identificador de compra (`parcela_grupo`).
- **Apagar** uma parcela pergunta: "só esta" ou "todas as parcelas desta compra que ainda não foram pagas". Pro admin, a segunda opção vira "todas as parcelas desta compra" (inclusive pagas e de outros meses — ver RF13).
- Notificação no Telegram (RF05): **uma por compra**, não uma por parcela — `Panelas — R$ 500,00 em 5x de R$ 100,00`.
- Limite: 2 a 24 parcelas. Fora disso, a IA trata como à vista e o app avisa no chat.

## §2 Pago × pendente ⟨RF09⟩
- Todo gasto novo nasce **pendente** (decisão do Alecs, 31/10/2026).
- Cada gasto no painel ganha um botão ✓: toca → **pago** (grava a data do pagamento); toca de novo → volta a pendente.
- Quem pode marcar: quem lançou e os admins (mesma regra do apagar da RF01).
- Valor estimado ou sem valor (RF02) não muda: o ~R$ e o laranja continuam; pago/pendente é uma dimensão **independente** de estimado.

## §3 Mês atual e virada ⟨RF10⟩
**Muda a RF03 (painel):** o painel deixa de somar tudo e mostra **só o mês atual**:
- Total do mês · já pago · pendente; "meus gastos do mês".
- Gráfico por categoria do mês.
- Lista: pendentes primeiro, depois pagos.
- Parcelas de meses futuros não aparecem no mês atual (aparecem quando o mês delas chegar).

**Virada do mês:** todo gasto **pendente** de um mês que já passou **muda para o mês atual** e mostra a etiqueta `↪ veio de out`. Ele sai do total do mês antigo e passa a contar no novo (decisão do Alecs, 31/10/2026). O mês de origem fica guardado (`mes_origem`) e não muda mais, mesmo que o gasto role por vários meses (mostra sempre o mês em que nasceu).

**Quem faz a virada:** a rotina do dia 1 (§5) e também o próprio app ao abrir (se a rotina falhar ou atrasar, o painel nunca mostra um mês velho com pendentes perdidos). A operação é idempotente — rodar duas vezes dá o mesmo resultado.

Mês = calendário de Brasília.

## §4 Meses anteriores ⟨RF11⟩
- Nova aba **🗓️ Meses**, separada do painel.
- Lista dos meses fechados, do mais recente pro mais antigo: total pago no mês e uma barra comparando os meses entre si.
- Tocar num mês abre o detalhe: total, por categoria, por pessoa, a lista do que foi pago e uma linha "passou pro mês seguinte: N itens, R$ X" (o que estava pendente na virada).
- Só leitura: nos meses fechados não se lança, apaga nem marca nada — **exceto o admin, que pode apagar de vez** (RF13).

## §5 Resumo mensal no Telegram ⟨RF12⟩
- Dia 1 de cada mês, de manhã (~08:00 de Brasília), no grupo "Orçamento Familiar" (mesmo bot da RF05).
- Ordem: (1) faz a virada (§3); (2) manda o resumo do mês que fechou:
  ```
  📅 Fechamento de outubro/2026
  Total pago: R$ 1.234,56
  Por categoria: 🏠 Casa R$ 800,00 · 🍔 Alimentação R$ 300,00 · …
  Por pessoa: Pai R$ 900,00 · Anny R$ 334,56
  ↪ Passaram pra novembro: 3 itens, R$ 450,00
  ```
- Mês sem nenhum gasto: manda mesmo assim ("nenhum gasto registrado em outubro").
- O admin ganha um botão "Enviar resumo do mês passado 🧪" pra testar sem esperar o dia 1.

## §6 Admin apaga de vez ⟨RF13⟩
Pedido do Alecs (31/10/2026): poder testar à vontade e limpar os gastos de teste sem deixar rastro.
- **Membro comum:** apagar continua como hoje (RF01) — o gasto some do app e fica no banco marcado `apagado`.
- **Admin:** o 🗑️ apaga **de vez** — o gasto sai do banco e não entra em total, histórico (RF11) nem resumo do Telegram (RF12). Vale em **qualquer** gasto: de qualquer pessoa, pago ou pendente, do mês atual, de mês futuro (parcela) ou de mês fechado.
- Confirmação em dois toques: o 🗑️ vira "apagar de vez?" por 3 segundos; o segundo toque apaga, sem toque volta ao normal (nada de janela `confirm()`).
- Compra parcelada: o admin escolhe "só esta" ou "todas as parcelas desta compra".
- Não tem desfazer — é o ponto de apagar de vez.

## Dados (migração no Supabase)
Colunas novas em `gastos`: `pago` (boolean, padrão falso), `pago_em` (data/hora), `mes_origem` (texto `AAAA-MM`), `parcela_grupo` (uuid), `parcela_num` e `parcela_total` (inteiros). As políticas de RLS públicas continuam como estão (decisão original da Anny); a RF13 precisa de uma política que permita **DELETE** em `gastos` — a migração confere se já existe e cria só se faltar.

**Gastos que já existem (11 ativos, jul–set):** ⚠️ decisão em aberto — proposta: marcar todos como **pagos** no mês em que estão, senão todos rolariam juntos pra novembro na 1ª virada. As "Panelas parcela 2–5" ficaram as quatro em setembro (o defeito que esta SPEC corrige); a proposta é deixá-las como estão e quem quiser apaga e relança como "panelas 500 em 5x".

## Casos de sucesso e falha
- "comprei shampoo 28" → 1 gasto pendente de R$ 28 no mês atual.
- "panela 500 em 5x" → 5 gastos `Panelas (1/5)`…`(5/5)` de R$ 100, um por mês a partir do atual; 1 notificação.
- "mercado estimado 150 em 3x" → 3 parcelas de R$ 50 com `~R$` (estimado continua estimado).
- Gasto pendente de outubro, abrir o app em 01/11 → aparece em novembro com `↪ veio de out`; outubro mostra "passou pro mês seguinte: 1 item".
- Marcar pago e desmarcar → volta a pendente, sem mudar o mês.
- Rotina do dia 1 falha → o app faz a virada ao abrir; o resumo pode ser mandado pelo botão do admin.
- Supabase fora do ar → erro com a causa real (lição de 15/07), nunca "nenhum gasto".
- Admin apaga de vez uma parcela de teste num mês fechado → some do detalhe do mês e do banco; as outras parcelas ficam.
- Admin apaga "todas as parcelas" de uma compra de teste → nenhuma sobra no banco, em mês nenhum.
- Membro comum apaga → some do app, continua no banco como `apagado` (como hoje).

## Fora do escopo
Metas por categoria · renda/entradas e saldo · editar gasto depois de lançado · parcial semanal no Telegram · comparação de meses dentro do painel do mês atual.

## Restrições que continuam
`index.html` único (a Anny edita pelo celular) + funções em `api/`. A rotina do dia 1 é um **Vercel Cron** (`vercel.json` na raiz, permitido no plano grátis: 1×/dia) chamando `api/resumo.js`, protegido por uma variável `CRON_SECRET` que precisa ser criada na Vercel **da Anny** (ela ou o Alecs pelo login dela). **Criada em 31/10/2026** (Production, tipo Secret; o valor ninguém precisa guardar — só a Vercel usa).
