CREATE TABLE "chat_conversation" (
  "id" BIGSERIAL NOT NULL,
  "conversation_key" VARCHAR(160) NOT NULL,
  "buyer_id" BIGINT NOT NULL,
  "merchant_id" BIGINT NOT NULL,
  "product_id" BIGINT,
  "order_no" VARCHAR(64),
  "title" VARCHAR(128),
  "last_message_id" BIGINT,
  "last_message_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(6),

  CONSTRAINT "chat_conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_message" (
  "id" BIGSERIAL NOT NULL,
  "conversation_id" BIGINT NOT NULL,
  "sender_id" BIGINT NOT NULL,
  "receiver_id" BIGINT NOT NULL,
  "sender_role" VARCHAR(16) NOT NULL,
  "content_type" VARCHAR(16) NOT NULL DEFAULT 'TEXT',
  "content" TEXT NOT NULL,
  "attachments" JSONB,
  "read_at" TIMESTAMP(6),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(6),

  CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_conversation_conversation_key_key" ON "chat_conversation"("conversation_key");
CREATE UNIQUE INDEX "chat_conversation_last_message_id_key" ON "chat_conversation"("last_message_id");
CREATE INDEX "chat_conversation_buyer_id_last_message_at_idx" ON "chat_conversation"("buyer_id", "last_message_at");
CREATE INDEX "chat_conversation_merchant_id_last_message_at_idx" ON "chat_conversation"("merchant_id", "last_message_at");
CREATE INDEX "chat_conversation_order_no_idx" ON "chat_conversation"("order_no");
CREATE INDEX "chat_conversation_product_id_idx" ON "chat_conversation"("product_id");

CREATE INDEX "chat_message_conversation_id_created_at_idx" ON "chat_message"("conversation_id", "created_at");
CREATE INDEX "chat_message_receiver_id_read_at_idx" ON "chat_message"("receiver_id", "read_at");
CREATE INDEX "chat_message_sender_id_created_at_idx" ON "chat_message"("sender_id", "created_at");

ALTER TABLE "chat_conversation"
  ADD CONSTRAINT "chat_conversation_buyer_id_fkey"
  FOREIGN KEY ("buyer_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_conversation"
  ADD CONSTRAINT "chat_conversation_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_conversation"
  ADD CONSTRAINT "chat_conversation_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_message"
  ADD CONSTRAINT "chat_message_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "chat_conversation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_message"
  ADD CONSTRAINT "chat_message_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_message"
  ADD CONSTRAINT "chat_message_receiver_id_fkey"
  FOREIGN KEY ("receiver_id") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_conversation"
  ADD CONSTRAINT "chat_conversation_last_message_id_fkey"
  FOREIGN KEY ("last_message_id") REFERENCES "chat_message"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
