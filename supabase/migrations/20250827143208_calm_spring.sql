-- ============================================================================
-- SETUP INICIAL DO BANCO DE DADOS SUPABASE
-- ============================================================================

-- Função para criar schema de tenant
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    schema_name TEXT := 'tenant_' || replace(tenant_uuid::text, '-', '');
BEGIN
    -- Criar schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Criar tabelas do tenant
    EXECUTE format('
        -- Users table (tenant-specific users)
        CREATE TABLE IF NOT EXISTS %I.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR UNIQUE NOT NULL,
            name VARCHAR NOT NULL,
            phone VARCHAR,
            avatar_url VARCHAR,
            role VARCHAR DEFAULT ''user'',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Clients table
        CREATE TABLE IF NOT EXISTS %I.clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL,
            email VARCHAR,
            phone VARCHAR,
            organization VARCHAR,
            address JSONB,
            budget DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR DEFAULT ''BRL'',
            status VARCHAR DEFAULT ''active'',
            tags TEXT[],
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS %I.projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR NOT NULL,
            description TEXT,
            client_id UUID,
            client_name VARCHAR,
            organization VARCHAR,
            address VARCHAR,
            budget DECIMAL(15,2) DEFAULT 0,
            currency VARCHAR DEFAULT ''BRL'',
            status VARCHAR DEFAULT ''contacted'',
            priority VARCHAR DEFAULT ''medium'',
            progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            start_date DATE,
            due_date DATE,
            completed_at TIMESTAMP,
            tags TEXT[],
            assigned_to TEXT[],
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS %I.tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR NOT NULL,
            description TEXT,
            project_id UUID,
            project_title VARCHAR,
            client_id UUID,
            client_name VARCHAR,
            assigned_to VARCHAR,
            status VARCHAR DEFAULT ''not_started'',
            priority VARCHAR DEFAULT ''medium'',
            progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            start_date DATE,
            end_date DATE,
            completed_at TIMESTAMP,
            estimated_hours DECIMAL(5,2),
            actual_hours DECIMAL(5,2),
            tags TEXT[],
            notes TEXT,
            subtasks JSONB DEFAULT ''[]'',
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
        );

        -- Transactions table (Cash Flow)
        CREATE TABLE IF NOT EXISTS %I.transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR CHECK (type IN (''income'', ''expense'')),
            amount DECIMAL(15,2) NOT NULL,
            category_id VARCHAR,
            category VARCHAR,
            description TEXT NOT NULL,
            date DATE NOT NULL,
            payment_method VARCHAR,
            status VARCHAR DEFAULT ''confirmed'',
            project_id UUID,
            project_title VARCHAR,
            client_id UUID,
            client_name VARCHAR,
            tags TEXT[],
            notes TEXT,
            is_recurring BOOLEAN DEFAULT false,
            recurring_frequency VARCHAR,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
        );

        -- Invoices table (Billing)
        CREATE TABLE IF NOT EXISTS %I.invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            number VARCHAR UNIQUE NOT NULL,
            title VARCHAR NOT NULL,
            description TEXT,
            client_id UUID,
            client_name VARCHAR,
            client_email VARCHAR,
            client_phone VARCHAR,
            amount DECIMAL(15,2) NOT NULL,
            currency VARCHAR DEFAULT ''BRL'',
            status VARCHAR DEFAULT ''draft'',
            due_date DATE,
            paid_at TIMESTAMP,
            payment_method VARCHAR,
            items JSONB DEFAULT ''[]'',
            tags TEXT[],
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
        );

        -- Publications table (isolated by user)
        CREATE TABLE IF NOT EXISTS %I.publications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            oab_number VARCHAR,
            process_number VARCHAR,
            publication_date DATE,
            content TEXT,
            source VARCHAR,
            external_id VARCHAR,
            status VARCHAR DEFAULT ''nova'',
            urgency VARCHAR DEFAULT ''media'',
            responsible VARCHAR,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, external_id)
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_%1$s_clients_created_by ON %I.clients(created_by);
        CREATE INDEX IF NOT EXISTS idx_%1$s_clients_status ON %I.clients(status);
        CREATE INDEX IF NOT EXISTS idx_%1$s_projects_client_id ON %I.projects(client_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_projects_status ON %I.projects(status);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_project_id ON %I.tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_assigned_to ON %I.tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_status ON %I.tasks(status);
        CREATE INDEX IF NOT EXISTS idx_%1$s_transactions_date ON %I.transactions(date);
        CREATE INDEX IF NOT EXISTS idx_%1$s_transactions_type ON %I.transactions(type);
        CREATE INDEX IF NOT EXISTS idx_%1$s_invoices_status ON %I.invoices(status);
        CREATE INDEX IF NOT EXISTS idx_%1$s_invoices_due_date ON %I.invoices(due_date);
        CREATE INDEX IF NOT EXISTS idx_%1$s_publications_user_id ON %I.publications(user_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_publications_status ON %I.publications(status);

    ', schema_name, schema_name, schema_name, schema_name, schema_name, 
       schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name, schema_name,
       schema_name, schema_name, schema_name, schema_name, schema_name);

    RETURN schema_name;
END;
$$ LANGUAGE plpgsql;

-- Função para aplicar migrations a todos os tenants
CREATE OR REPLACE FUNCTION apply_migration_to_all_tenants(migration_sql TEXT)
RETURNS TABLE(tenant_id UUID, schema_name TEXT, success BOOLEAN, error_message TEXT) AS $$
DECLARE
    tenant_record RECORD;
    result_tenant_id UUID;
    result_schema_name TEXT;
    result_success BOOLEAN;
    result_error_message TEXT;
BEGIN
    FOR tenant_record IN 
        SELECT t.id, t.schema_name 
        FROM tenants t 
        WHERE t.is_active = true
    LOOP
        BEGIN
            result_tenant_id := tenant_record.id;
            result_schema_name := tenant_record.schema_name;
            
            -- Replace ${schema} placeholder with actual schema name
            EXECUTE replace(migration_sql, '${schema}', tenant_record.schema_name);
            
            result_success := true;
            result_error_message := NULL;
            
        EXCEPTION WHEN OTHERS THEN
            result_success := false;
            result_error_message := SQLERRM;
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de um tenant
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_uuid UUID)
RETURNS TABLE(
    clients_count BIGINT,
    projects_count BIGINT,
    tasks_count BIGINT,
    transactions_count BIGINT,
    invoices_count BIGINT
) AS $$
DECLARE
    schema_name TEXT := 'tenant_' || replace(tenant_uuid::text, '-', '');
BEGIN
    RETURN QUERY EXECUTE format('
        SELECT 
            (SELECT COUNT(*) FROM %I.clients WHERE is_active = true) as clients_count,
            (SELECT COUNT(*) FROM %I.projects WHERE is_active = true) as projects_count,
            (SELECT COUNT(*) FROM %I.tasks WHERE is_active = true) as tasks_count,
            (SELECT COUNT(*) FROM %I.transactions WHERE is_active = true) as transactions_count,
            (SELECT COUNT(*) FROM %I.invoices WHERE is_active = true) as invoices_count
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Trigger function para audit log automático
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit log entry
    INSERT INTO audit_logs (
        user_id, tenant_id, table_name, record_id, operation, old_data, new_data
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', true)::UUID, gen_random_uuid()),
        current_setting('app.current_tenant_id', true)::UUID,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Views para dashboard metrics (serão criadas por tenant)
-- Exemplo de view que será aplicada a cada tenant:
/*
CREATE VIEW tenant_xxx.dashboard_metrics AS
SELECT 
    -- Financial metrics
    (SELECT SUM(amount) FROM tenant_xxx.transactions WHERE type = 'income' AND date >= DATE_TRUNC('month', NOW())) as monthly_revenue,
    (SELECT SUM(amount) FROM tenant_xxx.transactions WHERE type = 'expense' AND date >= DATE_TRUNC('month', NOW())) as monthly_expenses,
    
    -- Client metrics
    (SELECT COUNT(*) FROM tenant_xxx.clients WHERE is_active = true) as total_clients,
    (SELECT COUNT(*) FROM tenant_xxx.clients WHERE created_at >= DATE_TRUNC('month', NOW())) as new_clients_this_month,
    
    -- Project metrics
    (SELECT COUNT(*) FROM tenant_xxx.projects WHERE is_active = true) as total_projects,
    (SELECT AVG(progress) FROM tenant_xxx.projects WHERE is_active = true AND status NOT IN ('won', 'lost')) as avg_project_progress,
    
    -- Task metrics
    (SELECT COUNT(*) FROM tenant_xxx.tasks WHERE is_active = true) as total_tasks,
    (SELECT COUNT(*) FROM tenant_xxx.tasks WHERE status = 'completed') as completed_tasks;
*/