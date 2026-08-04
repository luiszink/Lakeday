-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");
CREATE INDEX "password_reset_user_expiry_ix" ON "password_reset_token"("admin_user_id", "expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;