-- CreateEnum
CREATE TYPE "SourceHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SourceApprovalState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "licence"
  ADD COLUMN "terms_url" TEXT,
  ADD COLUMN "attribution_text" TEXT,
  ADD COLUMN "permission_evidence" TEXT;

-- AlterTable
ALTER TABLE "source_record" ADD COLUMN "source_origin_id" UUID;

-- CreateTable
CREATE TABLE "source_origin" (
    "id" UUID NOT NULL,
    "origin_url" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "licence_id" UUID NOT NULL,
    "refresh_cadence_hours" INTEGER,
    "health" "SourceHealth" NOT NULL DEFAULT 'UNKNOWN',
    "attribution_text" TEXT,
    "notes" TEXT,
    "approval_state" "SourceApprovalState" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_origin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_origin_origin_url_source_type_key"
  ON "source_origin"("origin_url", "source_type");
CREATE INDEX "source_origin_approval_state_ix"
  ON "source_origin"("approval_state");

-- AddForeignKey
ALTER TABLE "source_record"
  ADD CONSTRAINT "source_record_source_origin_id_fkey"
  FOREIGN KEY ("source_origin_id") REFERENCES "source_origin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_origin"
  ADD CONSTRAINT "source_origin_licence_id_fkey"
  FOREIGN KEY ("licence_id") REFERENCES "licence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_origin"
  ADD CONSTRAINT "source_origin_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "source_origin"
  ADD CONSTRAINT "source_origin_refresh_cadence_hours_check"
  CHECK ("refresh_cadence_hours" IS NULL OR "refresh_cadence_hours" > 0);
