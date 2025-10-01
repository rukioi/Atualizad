-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "plan_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "state" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "zip_code" TEXT,
    "budget" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "level" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "pis" TEXT,
    "cei" TEXT,
    "professional_title" TEXT,
    "marital_status" TEXT,
    "birth_date" DATE,
    "inss_status" TEXT,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "referred_by" TEXT,
    "registered_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "organization" TEXT,
    "address" TEXT,
    "budget" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'contacted',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "due_date" DATE,
    "completed_at" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "assigned_to" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "project_id" TEXT,
    "project_title" TEXT,
    "client_id" TEXT,
    "client_name" TEXT,
    "assigned_to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE,
    "end_date" DATE,
    "completed_at" TIMESTAMP(3),
    "estimated_hours" DECIMAL(5,2),
    "actual_hours" DECIMAL(5,2),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "subtasks" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "category_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "payment_method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "project_id" TEXT,
    "project_title" TEXT,
    "client_id" TEXT,
    "client_name" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" TEXT,
    "created_by" TEXT NOT NULL,
    "last_modified_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_id" TEXT,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "project_id" TEXT,
    "project_name" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'nova',
    "items" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "payment_date" DATE,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "reminders_sent" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "link_pagamento" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "intervalo_dias" INTEGER NOT NULL DEFAULT 30,
    "proxima_fatura_data" DATE,
    "servico_prestado" TEXT,
    "urgencia" TEXT NOT NULL DEFAULT 'media',
    "tentativas_cobranca" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "oab_number" TEXT NOT NULL,
    "process_number" TEXT,
    "publication_date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'nova',
    "urgencia" TEXT NOT NULL DEFAULT 'media',
    "responsavel" TEXT,
    "vara_comarca" TEXT,
    "nome_pesquisado" TEXT,
    "diario" TEXT,
    "observacoes" TEXT,
    "atribuida_para_id" TEXT,
    "atribuida_para_nome" TEXT,
    "data_atribuicao" TIMESTAMP(3),
    "tarefas_vinculadas" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "icon" TEXT,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_metrics" (
    "id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" DECIMAL(15,2),
    "metric_type" TEXT,
    "period_start" DATE,
    "period_end" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "file_type" TEXT,
    "uploaded_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_clients_name" ON "clients"("name");

-- CreateIndex
CREATE INDEX "idx_clients_email" ON "clients"("email");

-- CreateIndex
CREATE INDEX "idx_clients_status" ON "clients"("status");

-- CreateIndex
CREATE INDEX "idx_clients_cpf" ON "clients"("cpf");

-- CreateIndex
CREATE INDEX "idx_clients_active" ON "clients"("is_active");

-- CreateIndex
CREATE INDEX "idx_clients_phone" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "idx_clients_created_by" ON "clients"("created_by");

-- CreateIndex
CREATE INDEX "idx_projects_title" ON "projects"("title");

-- CreateIndex
CREATE INDEX "idx_projects_status" ON "projects"("status");

-- CreateIndex
CREATE INDEX "idx_projects_client_id" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "idx_projects_priority" ON "projects"("priority");

-- CreateIndex
CREATE INDEX "idx_projects_created_by" ON "projects"("created_by");

-- CreateIndex
CREATE INDEX "idx_projects_active" ON "projects"("is_active");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_assigned_to" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_tasks_project_id" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "idx_tasks_client_id" ON "tasks"("client_id");

-- CreateIndex
CREATE INDEX "idx_tasks_priority" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "idx_tasks_active" ON "tasks"("is_active");

-- CreateIndex
CREATE INDEX "idx_transactions_type" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "idx_transactions_date" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "idx_transactions_category_id" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "idx_transactions_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_transactions_project_id" ON "transactions"("project_id");

-- CreateIndex
CREATE INDEX "idx_transactions_client_id" ON "transactions"("client_id");

-- CreateIndex
CREATE INDEX "idx_transactions_active" ON "transactions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "idx_invoices_number" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "idx_invoices_status" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "idx_invoices_due_date" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "idx_invoices_client_id" ON "invoices"("client_id");

-- CreateIndex
CREATE INDEX "idx_invoices_project_id" ON "invoices"("project_id");

-- CreateIndex
CREATE INDEX "idx_invoices_payment_status" ON "invoices"("payment_status");

-- CreateIndex
CREATE INDEX "idx_invoices_active" ON "invoices"("is_active");

-- CreateIndex
CREATE INDEX "idx_publications_user_id" ON "publications"("user_id");

-- CreateIndex
CREATE INDEX "idx_publications_status" ON "publications"("status");

-- CreateIndex
CREATE INDEX "idx_publications_date" ON "publications"("publication_date");

-- CreateIndex
CREATE INDEX "idx_publications_oab" ON "publications"("oab_number");

-- CreateIndex
CREATE INDEX "idx_publications_process" ON "publications"("process_number");

-- CreateIndex
CREATE INDEX "idx_publications_responsavel" ON "publications"("responsavel");

-- CreateIndex
CREATE INDEX "idx_publications_urgencia" ON "publications"("urgencia");

-- CreateIndex
CREATE INDEX "idx_publications_active" ON "publications"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "publications_user_id_external_id_key" ON "publications"("user_id", "external_id");

-- CreateIndex
CREATE INDEX "idx_categories_type" ON "categories"("type");

-- CreateIndex
CREATE INDEX "idx_categories_parent" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_categories_active" ON "categories"("is_active");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_read" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_active" ON "notifications"("is_active");

-- CreateIndex
CREATE INDEX "idx_dashboard_metrics_name" ON "dashboard_metrics"("metric_name");

-- CreateIndex
CREATE INDEX "idx_dashboard_metrics_period" ON "dashboard_metrics"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_attachments_entity" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_attachments_uploaded_by" ON "attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "idx_attachments_active" ON "attachments"("is_active");

-- CreateIndex
CREATE INDEX "idx_tenants_active" ON "tenants"("is_active");

-- CreateIndex
CREATE INDEX "idx_tenants_plan" ON "tenants"("plan_type");

-- CreateIndex
CREATE INDEX "idx_users_tenant" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_active" ON "users"("is_active");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
