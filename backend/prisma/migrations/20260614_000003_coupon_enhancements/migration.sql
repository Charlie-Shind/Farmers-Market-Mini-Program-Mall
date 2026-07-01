ALTER TABLE "coupon"
  ADD COLUMN IF NOT EXISTS "valid_start_at" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "valid_end_at" TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS "scope" VARCHAR(32) NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "per_user_limit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "rule_json" JSONB;

ALTER TABLE "user_coupon"
  ADD COLUMN IF NOT EXISTS "source_type" VARCHAR(32) NOT NULL DEFAULT 'ISSUE',
  ADD COLUMN IF NOT EXISTS "order_no" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(6);

UPDATE "user_coupon" uc
SET "expired_at" = c."valid_end_at"
FROM "coupon" c
WHERE uc."coupon_id" = c."id"
  AND uc."expired_at" IS NULL
  AND c."valid_end_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "coupon_status_idx" ON "coupon"("status");
CREATE INDEX IF NOT EXISTS "user_coupon_user_id_status_idx" ON "user_coupon"("user_id", "status");
