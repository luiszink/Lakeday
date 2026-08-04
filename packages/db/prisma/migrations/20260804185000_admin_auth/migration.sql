-- CreateEnum
CREATE TYPE "LoginAuditEvent" AS ENUM ('SUCCESS', 'PASSWORD_FAILURE', 'TOTP_FAILURE', 'RECOVERY_CODE_USED', 'LOCKED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'TOTP_ENROLLED');

-- AlterTable
ALTER TABLE "admin_user"
    ADD COLUMN "recovery_code_hashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "locked_until" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "login_audit" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID,
    "email" TEXT NOT NULL,
    "event" "LoginAuditEvent" NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_rate_limit" (
    "key" TEXT NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "login_rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "login_audit_email_created_ix" ON "login_audit"("email", "created_at");
CREATE INDEX "login_audit_user_created_ix" ON "login_audit"("admin_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "login_audit" ADD CONSTRAINT "login_audit_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;