-- Migração da SPEC v2 (RF08–RF13) — rodada no SQL Editor do Supabase em 31/10/2026.
-- Só acrescenta colunas: o app antigo continua funcionando com elas.
ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pago_em timestamptz,
  ADD COLUMN IF NOT EXISTS mes_origem text,
  ADD COLUMN IF NOT EXISTS parcela_grupo uuid,
  ADD COLUMN IF NOT EXISTS parcela_num integer,
  ADD COLUMN IF NOT EXISTS parcela_total integer;
UPDATE gastos SET mes_origem = mes WHERE mes_origem IS NULL;
-- Os gastos que já existiam (jul–set) viram pagos; senão rolariam todos pro mês atual na 1ª virada.
UPDATE gastos SET pago = true, pago_em = criado_em WHERE apagado = false;
-- RLS: a política "acesso total gastos" (ALL, public) já cobre o DELETE da RF13 — nada a criar.
