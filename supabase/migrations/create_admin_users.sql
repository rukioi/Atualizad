
-- ============================================================================
-- ADMIN USERS TABLE - Necessária para o painel administrativo
-- ============================================================================

-- Criar tabela admin_users no schema público
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Inserir admin padrão para testes (senha: admin123)
-- Hash bcrypt para 'admin123': $2a$10$k8Y1THUNZ6K4WNKOCgxQMOANPKFV.rHZLSJ2J2HqYt3hf7P8.gAaG
INSERT INTO public.admin_users (email, password_hash, name, role) 
VALUES ('admin@sistema.com', '$2a$10$k8Y1THUNZ6K4WNKOCgxQMOANPKFV.rHZLSJ2J2HqYt3hf7P8.gAaG', 'Administrator', 'super_admin')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE public.admin_users IS 'Administradores do sistema com acesso ao painel admin';
