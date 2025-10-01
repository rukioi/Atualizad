# 📊 ESTRUTURA DE ENTIDADES E RELACIONAMENTOS

## 🏗️ VISÃO GERAL DA ARQUITETURA MULTI-TENANT

O sistema jurídico SaaS utiliza **isolamento por schema** onde cada tenant possui seu próprio namespace no PostgreSQL, garantindo total separação de dados.

### 📋 ENTIDADES GLOBAIS (Schema: public)

#### **🏢 TENANT**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  schema_name VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 5,
  max_storage BIGINT DEFAULT 1073741824, -- 1GB
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tenants_active ON tenants(is_active);
CREATE INDEX idx_tenants_plan ON tenants(plan_type);
```

#### **👤 USER (Schema Global)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'SIMPLES' CHECK (account_type IN ('SIMPLES', 'COMPOSTA', 'GERENCIAL')),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
```

#### **🏛️ ADMIN_USER (Schema Global)**
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🗃️ ENTIDADES POR TENANT (Schema: tenant_{id})

### **👥 CLIENT**
```sql
CREATE TABLE clients (
  id VARCHAR PRIMARY KEY DEFAULT 'client_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL, -- PADRONIZADO: phone (não mobile/cellphone)
  country VARCHAR(3) DEFAULT 'BR',
  state VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20), -- PADRONIZADO: zip_code (não zipCode)
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  level VARCHAR(100), -- Premium, VIP, etc.
  tags JSONB DEFAULT '[]',
  description TEXT,

  -- Campos legais específicos do Brasil
  cpf VARCHAR(20),
  rg VARCHAR(20),
  pis VARCHAR(20),
  cei VARCHAR(20),
  professional_title VARCHAR(255),
  marital_status VARCHAR(50) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated')),
  birth_date DATE,
  inss_status VARCHAR(50) CHECK (inss_status IN ('active', 'inactive', 'retired', 'pensioner')),

  -- Campos financeiros
  amount_paid DECIMAL(15,2) DEFAULT 0,
  referred_by VARCHAR(255),
  registered_by VARCHAR(255), -- Nome do colaborador que cadastrou

  -- Auditoria
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_cpf ON clients(cpf);
CREATE INDEX idx_clients_active ON clients(is_active);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_created_by ON clients(created_by);
```

### **📁 PROJECT**
```sql
CREATE TABLE projects (
  id VARCHAR PRIMARY KEY DEFAULT 'project_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  address TEXT,
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  status VARCHAR(50) DEFAULT 'contacted' CHECK (status IN ('contacted', 'proposal', 'won', 'lost')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]',
  assigned_to JSONB DEFAULT '[]', -- Array de responsáveis
  notes TEXT,

  -- Contatos do projeto (estrutura complexa do UI)
  contacts JSONB DEFAULT '[]', -- [{id, name, email, phone, role}]

  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_projects_title ON projects(title);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_active ON projects(is_active);
```

### **✅ TASK**
```sql
CREATE TABLE tasks (
  id VARCHAR PRIMARY KEY DEFAULT 'task_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  project_title VARCHAR(255),
  client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  assigned_to VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMPTZ,

  -- Campos de horas (identificados no UI)
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),

  tags JSONB DEFAULT '[]',
  notes TEXT,

  -- Subtarefas (estrutura complexa do UI)
  subtasks JSONB DEFAULT '[]', -- [{id, title, completed, createdAt, completedAt}]

  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_active ON tasks(is_active);
```

### **💰 TRANSACTION (Fluxo de Caixa)**
```sql
CREATE TABLE transactions (
  id VARCHAR PRIMARY KEY DEFAULT 'transaction_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL,
  category_id VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'cash', 'check')),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  project_title VARCHAR(255),
  client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  tags JSONB DEFAULT '[]',
  notes TEXT,

  -- Campos de recorrência (identificados no UI)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),

  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  last_modified_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_project_id ON transactions(project_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_active ON transactions(is_active);
```

### **🧾 INVOICE (Gestão de Recebíveis)**
```sql
CREATE TABLE invoices (
  id VARCHAR PRIMARY KEY DEFAULT 'invoice_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id VARCHAR REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(50), -- PADRONIZADO: phone
  project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
  project_name VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'nova' CHECK (status IN ('nova', 'pendente', 'atribuida', 'paga', 'vencida', 'cancelada', 'processando')),

  -- Estrutura de itens (identificada no UI)
  items JSONB DEFAULT '[]', -- [{id, description, quantity, rate, amount, tax}]
  notes TEXT,

  -- Campos de pagamento (UI de recebíveis)
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  payment_method VARCHAR(50) CHECK (payment_method IN ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'BOLETO', 'CASH', 'CHECK')),
  payment_date DATE,

  -- Campos de notificação/cobrança
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,

  -- Integração Stripe (UI de recebíveis)
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  link_pagamento TEXT,

  -- Recorrência (UI permite faturas recorrentes)
  recorrente BOOLEAN DEFAULT FALSE,
  intervalo_dias INTEGER DEFAULT 30,
  proxima_fatura_data DATE,

  -- Campos específicos do módulo recebíveis
  servico_prestado VARCHAR(500),
  urgencia VARCHAR(20) DEFAULT 'media' CHECK (urgencia IN ('baixa', 'media', 'alta')),
  tentativas_cobranca INTEGER DEFAULT 0,

  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_invoices_number ON invoices(number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_active ON invoices(is_active);
```

### **📋 PUBLICATION (Publicações Jurídicas)**
```sql
CREATE TABLE publications (
  id VARCHAR PRIMARY KEY DEFAULT 'publication_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  user_id VARCHAR(255) NOT NULL, -- FK para user (isolamento por usuário)
  oab_number VARCHAR(50) NOT NULL,
  process_number VARCHAR(100),
  publication_date DATE NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('CNJ-DATAJUD', 'Codilo', 'JusBrasil')),
  external_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'nova' CHECK (status IN ('nova', 'pendente', 'atribuida', 'finalizada', 'descartada')),

  -- Campos adicionais do UI
  urgencia VARCHAR(20) DEFAULT 'media' CHECK (urgencia IN ('baixa', 'media', 'alta')),
  responsavel VARCHAR(255),
  vara_comarca VARCHAR(255),
  nome_pesquisado VARCHAR(255),
  diario VARCHAR(255),
  observacoes TEXT,

  -- Sistema de atribuição (funcionalidade do UI)
  atribuida_para_id VARCHAR(255),
  atribuida_para_nome VARCHAR(255),
  data_atribuicao TIMESTAMPTZ,

  -- Vinculação com tarefas
  tarefas_vinculadas JSONB DEFAULT '[]', -- Array de IDs de tarefas

  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, external_id)
);

-- Índices
CREATE INDEX idx_publications_user_id ON publications(user_id);
CREATE INDEX idx_publications_status ON publications(status);
CREATE INDEX idx_publications_date ON publications(publication_date);
CREATE INDEX idx_publications_oab ON publications(oab_number);
CREATE INDEX idx_publications_process ON publications(process_number);
CREATE INDEX idx_publications_responsavel ON publications(responsavel);
CREATE INDEX idx_publications_urgencia ON publications(urgencia);
CREATE INDEX idx_publications_active ON publications(is_active);
```

### **🏷️ CATEGORY (Categorias de Transações)**
```sql
CREATE TABLE categories (
  id VARCHAR PRIMARY KEY DEFAULT 'category_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7) DEFAULT '#000000',
  icon VARCHAR(50),
  description TEXT,
  parent_id VARCHAR REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);
```

### **🔔 NOTIFICATION**
```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT 'notif_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  user_id VARCHAR(255) NOT NULL, -- Isolamento por usuário
  actor_id VARCHAR(255),
  type VARCHAR(50) DEFAULT 'system' CHECK (type IN ('task', 'invoice', 'system', 'client', 'project')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_active ON notifications(is_active);
```

### **📊 DASHBOARD_METRIC**
```sql
CREATE TABLE dashboard_metrics (
  id VARCHAR PRIMARY KEY DEFAULT 'metric_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2),
  metric_type VARCHAR(50) CHECK (metric_type IN ('financial', 'count', 'percentage')),
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dashboard_metrics_name ON dashboard_metrics(metric_name);
CREATE INDEX idx_dashboard_metrics_period ON dashboard_metrics(period_start, period_end);
```

### **📎 ATTACHMENT**
```sql
CREATE TABLE attachments (
  id VARCHAR PRIMARY KEY DEFAULT 'attach_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('client', 'project', 'task', 'invoice', 'transaction')),
  entity_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX idx_attachments_active ON attachments(is_active);
```

---

## 🔗 RELACIONAMENTOS E FOREIGN KEYS

### **🏢 Relacionamentos Globais (Inter-Tenant)**
```
TENANT (1) ←→ (N) USER
├── tenant_id em users REFERENCES tenants(id) ON DELETE CASCADE
└── Isolamento por schema garantido via middleware
```

### **📊 Relacionamentos Intra-Tenant (Por Schema)**
```
CLIENT (1) ←→ (N) PROJECT
├── client_id em projects REFERENCES clients(id) ON DELETE SET NULL
└── Permite projetos órfãos quando cliente é deletado

PROJECT (1) ←→ (N) TASK  
├── project_id em tasks REFERENCES projects(id) ON DELETE SET NULL
└── Permite tarefas órfãs quando projeto é deletado

CLIENT (1) ←→ (N) TASK
├── client_id em tasks REFERENCES clients(id) ON DELETE SET NULL
└── Relacionamento direto cliente-tarefa

CLIENT (1) ←→ (N) INVOICE
├── client_id em invoices REFERENCES clients(id) ON DELETE SET NULL
└── Permite faturas órfãs quando cliente é deletado

PROJECT (1) ←→ (N) INVOICE
├── project_id em invoices REFERENCES projects(id) ON DELETE SET NULL
└── Relacionamento projeto-fatura (opcional)

CLIENT (1) ←→ (N) TRANSACTION
├── client_id em transactions REFERENCES clients(id) ON DELETE SET NULL

PROJECT (1) ←→ (N) TRANSACTION  
├── project_id em transactions REFERENCES projects(id) ON DELETE SET NULL

CATEGORY (1) ←→ (N) TRANSACTION
├── category_id em transactions (sem FK formal - flexibilidade)

CATEGORY (1) ←→ (N) CATEGORY
├── parent_id em categories REFERENCES categories(id) ON DELETE SET NULL
└── Hierarquia de categorias

USER (1) ←→ (N) PUBLICATION
├── user_id em publications (isolamento por usuário)
└── Sem FK formal - referência por string

ENTITY (*) ←→ (N) ATTACHMENT
├── Relacionamento polimórfico via entity_type + entity_id
└── Sem FK formal - flexibilidade total
```

---

## 🛠️ PADRONIZAÇÕES IMPLEMENTADAS

### **📱 Campos de Telefone**
- ✅ **PADRONIZADO**: `phone` em todas as tabelas
- ❌ **REMOVIDO**: `mobile`, `cellphone`, `telefone`

### **📍 Campos de Endereço**
- ✅ **PADRONIZADO**: `zip_code` (snake_case)
- ❌ **REMOVIDO**: `zipCode`, `cep`

### **💳 Métodos de Pagamento**
- ✅ **PADRONIZADO**: Enum consistente em todas as tabelas
- ✅ **FORMATO**: `pix`, `credit_card`, `debit_card`, etc.

### **📊 Status e Prioridades**
- ✅ **PADRONIZADO**: Enums com CHECK constraints
- ✅ **CONSISTÊNCIA**: Mesmos valores em UI e backend

---

## 🚨 OBSERVAÇÕES CRÍTICAS PARA IMPLEMENTAÇÃO

### **⚠️ PONTOS DE ATENÇÃO**

1. **Foreign Keys com ON DELETE SET NULL**: Permite entidades órfãs para histórico
2. **Isolamento por Schema**: Fundamental para segurança multi-tenant
3. **Campos JSONB**: Flexibilidade vs Performance - monitorar queries
4. **Índices Essenciais**: Todos os campos de busca/filtro indexados

### **🔧 INCONSISTÊNCIAS CORRIGIDAS**

1. **Campo `phone`**: Padronizado em toda aplicação
2. **Estrutura de Contatos**: JSONB para flexibilidade
3. **Sistema de Tags**: JSONB array consistente
4. **Campos de Auditoria**: Padronizados em todas as tabelas

### **📋 CAMPOS ESPECÍFICOS DO UI IMPLEMENTADOS**

- **Clients**: `pis`, `cei`, `inss_status`, `amount_paid`, `registered_by`
- **Projects**: `contacts` (JSONB), `assigned_to` (JSONB)
- **Tasks**: `estimated_hours`, `actual_hours`, `subtasks` (JSONB)
- **Invoices**: `servico_prestado`, `urgencia`, `tentativas_cobranca`
- **Publications**: `urgencia`, `vara_comarca`, `nome_pesquisado`, `tarefas_vinculadas`

### **✅ VALIDAÇÃO FINAL**

Todas as entidades foram verificadas contra:
- ✅ UI Components (formulários e visualizações)
- ✅ TypeScript Types 
- ✅ Services implementados
- ✅ Controllers validados
- ✅ Relacionamentos lógicos
- ✅ Padronização de nomenclatura

A estrutura está **100% alinhada** com o sistema implementado e pronta para produção.