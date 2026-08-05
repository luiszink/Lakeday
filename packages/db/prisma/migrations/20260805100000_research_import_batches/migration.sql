CREATE TABLE "research_import_batch" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "held" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_import_batch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "research_import_batch_created_ix" ON "research_import_batch"("created_at");

ALTER TABLE "research_import_batch" ADD CONSTRAINT "research_import_batch_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
