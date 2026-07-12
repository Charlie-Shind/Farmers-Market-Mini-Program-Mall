ALTER TABLE "product"
  ADD COLUMN IF NOT EXISTS "group_buy_config" JSONB;
