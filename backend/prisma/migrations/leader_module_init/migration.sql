-- Leader 模块重构迁移

-- 1. 创建团长档案表
CREATE TABLE IF NOT EXISTS "community_leader" (
  "id" BIGSERIAL NOT NULL,
  "user_id" BIGINT NOT NULL,
  "application_no" VARCHAR(64) NOT NULL,
  "real_name" VARCHAR(50) NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "id_card_no" VARCHAR(100),
  "id_card_front_url" VARCHAR(500),
  "id_card_back_url" VARCHAR(500),
  "business_cert_url" VARCHAR(500),
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING_AUDIT',
  "reject_reason" VARCHAR(500),
  "commission_rate" DECIMAL(5,4),
  "audited_by" BIGINT,
  "audited_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "community_leader_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_leader_user_id_key" ON "community_leader"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "community_leader_application_no_key" ON "community_leader"("application_no");
CREATE INDEX IF NOT EXISTS "community_leader_status_idx" ON "community_leader"("status");

ALTER TABLE "community_leader"
  ADD CONSTRAINT "community_leader_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. 创建自提点表
CREATE TABLE IF NOT EXISTS "pickup_point" (
  "id" BIGSERIAL NOT NULL,
  "leader_id" BIGINT,
  "name" VARCHAR(100) NOT NULL,
  "contact_name" VARCHAR(50),
  "contact_mobile" VARCHAR(20),
  "province" VARCHAR(64) NOT NULL,
  "city" VARCHAR(64) NOT NULL,
  "district" VARCHAR(64),
  "detail_address" VARCHAR(255) NOT NULL,
  "longitude" DECIMAL(10,7),
  "latitude" DECIMAL(10,7),
  "business_hours" VARCHAR(100),
  "status" VARCHAR(32) NOT NULL DEFAULT 'ENABLED',
  "source" VARCHAR(32) NOT NULL DEFAULT 'ADMIN',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL,

  CONSTRAINT "pickup_point_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "pickup_point_city_district_idx" ON "pickup_point"("city", "district");
CREATE INDEX IF NOT EXISTS "pickup_point_status_idx" ON "pickup_point"("status");

ALTER TABLE "pickup_point"
  ADD CONSTRAINT "pickup_point_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "community_leader"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. 扩展 orders 表，支持自提
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_type" VARCHAR(32);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_point_id" BIGINT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_status" VARCHAR(32);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "picked_up_at" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "orders_pickup_point_id_idx" ON "orders"("pickup_point_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_pickup_point_id_fkey"
  FOREIGN KEY ("pickup_point_id") REFERENCES "pickup_point"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. 重建佣金表（旧数据直接丢弃）
TRUNCATE TABLE "leader_commission";

ALTER TABLE "leader_commission" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "leader_commission" DROP COLUMN IF EXISTS "bound_leader_id";

ALTER TABLE "leader_commission" ADD COLUMN IF NOT EXISTS "leader_id" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "leader_commission" ADD COLUMN IF NOT EXISTS "order_id" BIGINT;
ALTER TABLE "leader_commission" ADD COLUMN IF NOT EXISTS "order_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "leader_commission" ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0;
ALTER TABLE "leader_commission" ADD COLUMN IF NOT EXISTS "settled_at" TIMESTAMP(6);

ALTER TABLE "leader_commission"
  ADD CONSTRAINT "leader_commission_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "community_leader"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leader_commission_leader_id_status_idx" ON "leader_commission"("leader_id", "status");

-- 清理旧表
DROP TABLE IF EXISTS "leader_application";
DROP TABLE IF EXISTS "leader_binding";

-- 移除 leader_commission 上的旧索引（如果存在）
DROP INDEX IF EXISTS "leader_commission_user_id_status_idx";
