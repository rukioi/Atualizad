
-- CreateTable para Pipeline de Vendas (Negócios/Deals)
CREATE TABLE IF NOT EXISTS "projects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR NOT NULL,
    "description" TEXT,
    "contact_name" VARCHAR NOT NULL,
    "client_id" UUID,
    "organization" VARCHAR,
    "email" VARCHAR NOT NULL,
    "mobile" VARCHAR NOT NULL,
    "address" TEXT,
    "budget" DECIMAL(15,2),
    "currency" VARCHAR(3) DEFAULT 'BRL',
    "stage" VARCHAR DEFAULT 'contacted',
    "tags" JSONB DEFAULT '[]',
    "notes" TEXT,
    "created_by" VARCHAR NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_projects_title" ON "projects"("title");
CREATE INDEX IF NOT EXISTS "idx_projects_stage" ON "projects"("stage");
CREATE INDEX IF NOT EXISTS "idx_projects_contact_name" ON "projects"("contact_name");
CREATE INDEX IF NOT EXISTS "idx_projects_client_id" ON "projects"("client_id");
CREATE INDEX IF NOT EXISTS "idx_projects_active" ON "projects"("is_active");
CREATE INDEX IF NOT EXISTS "idx_projects_created_by" ON "projects"("created_by");
CREATE INDEX IF NOT EXISTS "idx_projects_created_at" ON "projects"("created_at" DESC);

-- AddForeignKey (opcional, se quiser relacionamento com clients)
-- ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
