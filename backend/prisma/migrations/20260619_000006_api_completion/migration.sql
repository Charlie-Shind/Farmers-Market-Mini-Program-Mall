ALTER TABLE "activity"
  ADD COLUMN IF NOT EXISTS "merchant_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "rule_json" JSONB,
  ADD COLUMN IF NOT EXISTS "remark" VARCHAR(255);

DO $$
BEGIN
  ALTER TABLE "activity"
    ADD CONSTRAINT "activity_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "activity_product" (
  "id" BIGSERIAL PRIMARY KEY,
  "activity_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "sku_id" BIGINT,
  "activity_price" NUMERIC(18, 2),
  "activity_stock" INTEGER,
  "limit_per_user" INTEGER,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ENABLED',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "activity_product"
    ADD CONSTRAINT "activity_product_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "activity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "activity_product"
    ADD CONSTRAINT "activity_product_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "activity_product"
    ADD CONSTRAINT "activity_product_sku_id_fkey"
    FOREIGN KEY ("sku_id") REFERENCES "product_sku"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "activity_product_activity_id_idx" ON "activity_product"("activity_id");
CREATE INDEX IF NOT EXISTS "activity_product_product_id_idx" ON "activity_product"("product_id");

CREATE TABLE IF NOT EXISTS "activity_draft" (
  "id" BIGSERIAL PRIMARY KEY,
  "merchant_id" BIGINT NOT NULL,
  "draft_no" VARCHAR(64) NOT NULL,
  "title" VARCHAR(128),
  "activity_type" VARCHAR(32),
  "payload_json" JSONB NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "activity_draft"
    ADD CONSTRAINT "activity_draft_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "activity_draft_draft_no_key" ON "activity_draft"("draft_no");
CREATE INDEX IF NOT EXISTS "activity_draft_merchant_id_updated_at_idx" ON "activity_draft"("merchant_id", "updated_at");

CREATE TABLE IF NOT EXISTS "product_review" (
  "id" BIGSERIAL PRIMARY KEY,
  "order_no" VARCHAR(64) NOT NULL,
  "order_item_id" BIGINT NOT NULL,
  "product_id" BIGINT NOT NULL,
  "sku_id" BIGINT NOT NULL,
  "user_id" BIGINT NOT NULL,
  "merchant_id" BIGINT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "content" TEXT,
  "images" JSONB,
  "reply_content" TEXT,
  "replied_at" TIMESTAMP(6),
  "status" VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "product_review"
    ADD CONSTRAINT "product_review_order_item_id_fkey"
    FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "product_review"
    ADD CONSTRAINT "product_review_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "product_review"
    ADD CONSTRAINT "product_review_sku_id_fkey"
    FOREIGN KEY ("sku_id") REFERENCES "product_sku"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "product_review"
    ADD CONSTRAINT "product_review_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "product_review"
    ADD CONSTRAINT "product_review_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "product_review_product_id_idx" ON "product_review"("product_id");
CREATE INDEX IF NOT EXISTS "product_review_merchant_id_idx" ON "product_review"("merchant_id");
CREATE INDEX IF NOT EXISTS "product_review_user_id_idx" ON "product_review"("user_id");

CREATE TABLE IF NOT EXISTS "merchant_delivery_setting" (
  "id" BIGSERIAL PRIMARY KEY,
  "merchant_id" BIGINT NOT NULL,
  "sender_name" VARCHAR(64),
  "sender_mobile" VARCHAR(20),
  "sender_address" VARCHAR(255),
  "default_company" VARCHAR(64),
  "cold_chain_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "restricted_regions" JSONB,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "merchant_delivery_setting"
    ADD CONSTRAINT "merchant_delivery_setting_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_delivery_setting_merchant_id_key" ON "merchant_delivery_setting"("merchant_id");

CREATE TABLE IF NOT EXISTS "merchant_freight_template" (
  "id" BIGSERIAL PRIMARY KEY,
  "merchant_id" BIGINT NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "province" VARCHAR(64),
  "threshold_amount" NUMERIC(18, 2),
  "freight_amount" NUMERIC(18, 2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "merchant_freight_template"
    ADD CONSTRAINT "merchant_freight_template_merchant_id_fkey"
    FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "merchant_freight_template_merchant_id_active_idx" ON "merchant_freight_template"("merchant_id", "active");

CREATE TABLE IF NOT EXISTS "feedback" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "content" TEXT NOT NULL,
  "images" JSONB,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "reply" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "feedback"
    ADD CONSTRAINT "feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "feedback_user_id_status_idx" ON "feedback"("user_id", "status");
