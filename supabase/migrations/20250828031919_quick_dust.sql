/*
  # Administrative System Setup

  1. Global Tables
    - `tenants` - Tenant management
    - `users` - User accounts with tenant isolation
    - `registration_keys` - Secure registration system
    - `admin_users` - Administrative panel access
    - `tenant_settings` - API configurations per tenant
    - `usage_logs` - Usage monitoring
    - `audit_logs` - Global audit trail

  2. Security
    - Enable RLS on all tables
    - Admin-only policies for sensitive data
    - Tenant isolation policies
    - Automatic cleanup policies

  3. Functions
    - Tenant schema creation
    - Usage tracking
    - Automatic cleanup
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Global Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  schema_name text UNIQUE NOT NULL,
  plan_type text DEFAULT 'basic' CHECK (plan_type IN ('basic', 'premium', 'enterprise')),
  is_active boolean DEFAULT true,
  max_users integer DEFAULT 5,
  max_storage bigint DEFAULT 1073741824, -- 1GB
  plan_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Global Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('SIMPLES', 'COMPOSTA', 'GERENCIAL')),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  must_change_password boolean DEFAULT false,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Registration Keys Table
CREATE TABLE IF NOT EXISTS registration_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (account_type IN ('SIMPLES', 'COMPOSTA', 'GERENCIAL')),
  uses_allowed integer DEFAULT 1,
  uses_left integer NOT NULL,
  single_use boolean DEFAULT true,
  expires_at timestamptz,
  revoked boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  used_logs jsonb DEFAULT '[]'
);

-- Admin Users Table (separate from regular users)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tenant Settings (API configurations)
CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_api_key text,
  whatsapp_phone_number text,
  codilo_api_key text,
  resend_api_key text,
  stripe_secret_key text,
  stripe_webhook_secret text,
  n8n_webhook_url text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Usage Logs Table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  resource text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Global Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  operation text NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Admin policies (full access for admin users)
CREATE POLICY "Admin full access to tenants" ON tenants
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to users" ON users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to registration_keys" ON registration_keys
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to admin_users" ON admin_users
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to tenant_settings" ON tenant_settings
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin read access to usage_logs" ON usage_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin read access to audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- User policies (tenant isolation)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can access own refresh tokens" ON refresh_tokens
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_uuid uuid)
RETURNS void AS $$
DECLARE
    schema_name text := 'tenant_' || replace(tenant_uuid::text, '-', '');
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Create tables
    EXECUTE format('
        -- Clients table
        CREATE TABLE IF NOT EXISTS %I.clients (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            email text,
            phone text,
            organization text,
            address jsonb,
            budget decimal(15,2) DEFAULT 0,
            currency text DEFAULT ''BRL'',
            status text DEFAULT ''active'',
            tags text[] DEFAULT ARRAY[]::text[],
            notes text,
            created_by uuid,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            is_active boolean DEFAULT true
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS %I.projects (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title text NOT NULL,
            description text,
            client_id uuid,
            client_name text,
            organization text,
            address text,
            budget decimal(15,2) DEFAULT 0,
            currency text DEFAULT ''BRL'',
            status text DEFAULT ''contacted'',
            priority text DEFAULT ''medium'',
            progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            start_date date,
            due_date date,
            completed_at timestamptz,
            tags text[] DEFAULT ARRAY[]::text[],
            assigned_to text[] DEFAULT ARRAY[]::text[],
            notes text,
            created_by uuid,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            is_active boolean DEFAULT true,
            CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES %I.clients(id) ON DELETE SET NULL
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS %I.tasks (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title text NOT NULL,
            description text,
            project_id uuid,
            project_title text,
            client_id uuid,
            client_name text,
            assigned_to text NOT NULL,
            status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
            priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            start_date date,
            end_date date,
            completed_at timestamptz,
            estimated_hours decimal(5,2),
            actual_hours decimal(5,2),
            tags text[] DEFAULT ARRAY[]::text[],
            notes text,
            subtasks jsonb DEFAULT '[]',
            created_by uuid NOT NULL,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            is_active boolean DEFAULT true,
            CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES %I.projects(id) ON DELETE SET NULL,
            CONSTRAINT fk_tasks_client FOREIGN KEY (client_id) REFERENCES %I.clients(id) ON DELETE SET NULL
        );

        -- Transactions table (Cash Flow)
        CREATE TABLE IF NOT EXISTS %I.transactions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            type text CHECK (type IN ('income', 'expense')),
            amount decimal(15,2) NOT NULL,
            category_id text,
            category text,
            description text NOT NULL,
            date date NOT NULL,
            payment_method text,
            status text DEFAULT ''confirmed'',
            project_id uuid,
            project_title text,
            client_id uuid,
            client_name text,
            tags text[] DEFAULT ARRAY[]::text[],
            notes text,
            is_recurring boolean DEFAULT false,
            recurring_frequency text,
            created_by uuid,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            is_active boolean DEFAULT true,
            CONSTRAINT fk_transactions_project FOREIGN KEY (project_id) REFERENCES %I.projects(id) ON DELETE SET NULL,
            CONSTRAINT fk_transactions_client FOREIGN KEY (client_id) REFERENCES %I.clients(id) ON DELETE SET NULL
        );

        -- Invoices table
        CREATE TABLE IF NOT EXISTS %I.invoices (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            number text UNIQUE NOT NULL,
            title text NOT NULL,
            description text,
            client_id uuid,
            client_name text,
            client_email text,
            client_phone text,
            amount decimal(15,2) NOT NULL,
            currency text DEFAULT ''BRL'',
            status text DEFAULT ''draft'',
            due_date date,
            paid_at timestamptz,
            payment_method text,
            items jsonb DEFAULT ''[]'',
            tags text[] DEFAULT ARRAY[]::text[],
            notes text,
            created_by uuid,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            is_active boolean DEFAULT true,
            CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES %I.clients(id) ON DELETE SET NULL
        );

        -- Publications table (user-isolated)
        CREATE TABLE IF NOT EXISTS %I.publications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL,
            oab_number text,
            process_number text,
            publication_date date,
            content text,
            source text,
            external_id text,
            status text DEFAULT ''nova'',
            urgency text DEFAULT ''media'',
            responsible text,
            notes text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            UNIQUE(user_id, external_id),
            CONSTRAINT fk_publications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_%1$s_clients_created_by ON %I.clients(created_by);
        CREATE INDEX IF NOT EXISTS idx_%1$s_projects_client_id ON %I.projects(client_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_created_by ON %I.tasks(created_by);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_project_id ON %I.tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_tasks_client_id ON %I.tasks(client_id);
        CREATE INDEX IF NOT EXISTS idx_%1$s_transactions_created_by ON %I.transactions(created_by);
        CREATE INDEX IF NOT EXISTS idx_%1$s_publications_user_id ON %I.publications(user_id);

        -- Indexes for tasks table
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON %I.tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON %I.tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON %I.tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON %I.tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON %I.tasks(client_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON %I.tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_active ON %I.tasks(is_active);

    ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply migrations to all tenant schemas
CREATE OR REPLACE FUNCTION apply_migration_to_all_tenants(migration_sql text)
RETURNS void AS $$
DECLARE
    tenant_record record;
    schema_name text;
BEGIN
    FOR tenant_record IN SELECT id, schema_name FROM tenants WHERE is_active = true
    LOOP
        schema_name := tenant_record.schema_name;
        -- Replace ${schema} placeholder with actual schema name
        EXECUTE replace(migration_sql, '${schema}', schema_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for automatic cleanup (runs daily)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Clean audit logs older than 7 days
    DELETE FROM audit_logs WHERE created_at < now() - interval '7 days';

    -- Clean usage logs older than 30 days
    DELETE FROM usage_logs WHERE created_at < now() - interval '30 days';

    -- Clean expired registration keys
    DELETE FROM registration_keys WHERE expires_at < now() AND revoked = true;

    -- Clean inactive refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < now() OR is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default admin user (password: admin123!)
INSERT INTO admin_users (email, password_hash, name, role) 
VALUES (
  'admin@lawsaas.com',
  crypt('admin123!', gen_salt('bf', 12)),
  'System Administrator',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_registration_keys_expires ON registration_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_date ON usage_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at);