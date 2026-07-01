ALTER TABLE "chat_conversation"
  ADD COLUMN IF NOT EXISTS "scene_type" VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "scene_label" VARCHAR(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "scene_source" VARCHAR(255) NOT NULL DEFAULT '';

UPDATE "chat_conversation"
SET
  "scene_type" = CASE
    WHEN "order_no" IS NOT NULL AND "order_no" <> '' THEN 'ORDER'
    WHEN "product_id" IS NOT NULL THEN 'PRODUCT'
    ELSE 'GENERAL'
  END,
  "scene_label" = CASE
    WHEN "order_no" IS NOT NULL AND "order_no" <> '' THEN '来自订单'
    WHEN "product_id" IS NOT NULL THEN '来自商品详情'
    ELSE '在线客服'
  END,
  "scene_source" = CASE
    WHEN "order_no" IS NOT NULL AND "order_no" <> '' THEN "order_no"
    WHEN "product_id" IS NOT NULL THEN COALESCE("title", '')
    ELSE ''
  END
WHERE "scene_label" = '' AND "scene_source" = '' AND "scene_type" = 'GENERAL';
