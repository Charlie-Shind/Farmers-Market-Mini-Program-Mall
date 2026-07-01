ALTER TABLE "admin_role"
  ADD COLUMN IF NOT EXISTS "permission_json" JSONB;
