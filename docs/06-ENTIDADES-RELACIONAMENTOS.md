
# 📊 ESTRUTURA DE ENTIDADES E RELACIONAMENTOS

## 🏗️ VISÃO GERAL DA ARQUITETURA MULTI-TENANT

O sistema jurídico SaaS utiliza **isolamento por schema** onde cada tenant possui seu próprio namespace no PostgreSQL, garantindo total separação de dados.

### 📋 ENTIDADES PRINCIPAIS

#### **🏢 TENANT (Schema Global)**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  schema_name VARCHAR(100) UNIQUE,
  plan_type VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  max_users INTEGER DEFAULT 5,
  max_storage BIGINT DEFAULT 1073741824,
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **👤 USER (Schema Global)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  name VARCHAR(255),
  account_type ENUM('SIMPLES', 'COMPOSTA', 'GERENCIAL'),
  tenant_id UUID REFERENCES tenants(id),
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **🏛️ ADMIN_USER (Schema Global)**
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🗃️ ENTIDADES POR TENANT (Schema Isolado)

### **👥 CLIENT (tenant_{id}.clients)**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50), -- Campo adicional do UI
  organization VARCHAR(255),
  address JSONB DEFAULT '{}', -- Estrutura: {street, city, state, zipCode, country}
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(50) DEFAULT 'active',
  level VARCHAR(100), -- Campo do UI: Premium, VIP, etc.
  tags JSONB DEFAULT '[]',
  notes TEXT,
  description TEXT, -- Campo adicional do UI
  
  -- Campos específicos do Brasil (ausentes no documento original)
  cpf VARCHAR(20),
  rg VARCHAR(20),
  pis VARCHAR(20), -- NOVO: Campo identificado no UI
  cei VARCHAR(20), -- NOVO: Campo identificado no UI
  professional_title VARCHAR(255),
  marital_status VARCHAR(50),
  birth_date DATE,
  inss_status VARCHAR(50), -- NOVO: Campo do UI
  
  -- Campos financeiros adicionais
  amount_paid DECIMAL(15,2) DEFAULT 0, -- NOVO: Valor já pago
  referred_by VARCHAR(255), -- NOVO: Indicado por
  registered_by VARCHAR(255), -- NOVO: Cadastrado por
  
  -- Auditoria
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
```

### **📁 PROJECT (tenant_{id}.projects)**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL, -- NOVO: Campo separado identificado no UI
  description TEXT,
  client_id UUID, -- FK para clients
  client_name VARCHAR(255),
  organization VARCHAR(255), -- NOVO: Campo do UI
  address TEXT, -- NOVO: Endereço do projeto
  budget DECIMAL(12,2),
  estimated_value DECIMAL(12,2), -- NOVO: Valor estimado separado
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(50) DEFAULT 'proposal',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  due_date DATE, -- NOVO: Data de vencimento
  completed_at TIMESTAMPTZ, -- NOVO: Data de conclusão
  tags JSONB DEFAULT '[]',
  assigned_to JSONB DEFAULT '[]', -- NOVO: Array de responsáveis
  notes TEXT,
  
  -- NOVO: Contatos do projeto (estrutura complexa do UI)
  contacts JSONB DEFAULT '[]', -- [{id, name, email, phone, role}]
  
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- FK Constraints
  CONSTRAINT fk_project_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Índices
CREATE INDEX idx_projects_title ON projects(title);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_priority ON projects(priority);
```

### **✅ TASK (tenant_{id}.tasks)**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID, -- FK para projects
  project_title VARCHAR(255),
  client_id UUID, -- FK para clients
  client_name VARCHAR(255),
  assigned_to VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  due_date DATE, -- NOVO: Campo específico do UI
  completed_at TIMESTAMPTZ,
  
  -- NOVO: Campos de horas (identificados no UI)
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  
  tags JSONB DEFAULT '[]',
  notes TEXT,
  
  -- NOVO: Subtarefas (estrutura complexa do UI)
  subtasks JSONB DEFAULT '[]', -- [{id, title, completed, createdAt, completedAt}]
  
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- FK Constraints
  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_task_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Índices
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

### **💰 TRANSACTION (tenant_{id}.transactions)**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category_id VARCHAR(255),
  category VARCHAR(100),
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'confirmed',
  project_id UUID, -- FK para projects (opcional)
  project_title VARCHAR(255),
  client_id UUID, -- FK para clients (opcional)
  client_name VARCHAR(255),
  tags JSONB DEFAULT '[]',
  notes TEXT,
  
  -- NOVO: Campos de recorrência (identificados no UI)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20), -- monthly, quarterly, yearly
  
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  last_modified_by VARCHAR(255), -- NOVO: Última modificação
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- FK Constraints
  CONSTRAINT fk_transaction_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_transaction_client FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Índices
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_status ON transactions(status);
```

### **🧾 INVOICE (tenant_{id}.invoices)**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL, -- NOVO: Campo do UI
  client_id UUID, -- FK para clients
  client_name VARCHAR(255),
  client_email VARCHAR(255), -- NOVO: Campos específicos do cliente
  client_phone VARCHAR(50), -- NOVO: Para notificações
  project_id UUID, -- NOVO: FK para projects (opcional)
  project_name VARCHAR(255), -- NOVO: Nome do projeto
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  description TEXT,
  
  -- NOVO: Estrutura de itens (identificada no UI)
  items JSONB DEFAULT '[]', -- [{id, description, quantity, rate, amount, tax}]
  
  notes TEXT,
  
  -- NOVO: Campos de pagamento (UI de recebíveis)
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_date DATE,
  
  -- NOVO: Campos de notificação/cobrança
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  -- NOVO: Integração Stripe (UI de recebíveis)
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  link_pagamento TEXT, -- NOVO: Link do Stripe
  
  -- NOVO: Recorrência (UI permite faturas recorrentes)
  recorrente BOOLEAN DEFAULT FALSE,
  intervalo_dias INTEGER,
  proxima_fatura_data DATE,
  
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- FK Constraints
  CONSTRAINT fk_invoice_client FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_invoice_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Índices
CREATE INDEX idx_invoices_number ON invoices(number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
```

### **📋 PUBLICATION (tenant_{id}.publications)**
```sql
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- FK para user (isolamento por usuário)
  oab_number VARCHAR(50) NOT NULL,
  process_number VARCHAR(100),
  publication_date DATE NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(50) NOT NULL CHECK (source IN ('CNJ-DATAJUD', 'Codilo', 'JusBrasil')),
  external_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'novo' CHECK (status IN ('novo', 'lido', 'arquivado')),
  
  -- NOVO: Campos adicionais do UI
  urgencia VARCHAR(20) DEFAULT 'media', -- alta, media, baixa
  responsavel VARCHAR(255), -- Responsável pela publicação
  vara_comarca VARCHAR(255), -- NOVO: Vara/Comarca (campo do UI)
  nome_pesquisado VARCHAR(255), -- NOVO: Nome pesquisado (campo do UI)
  diario VARCHAR(255), -- NOVO: Diário oficial (campo do UI)
  
  -- NOVO: Atribuição (funcionalidade do UI)
  atribuida_para_id VARCHAR(255), -- ID do usuário atribuído
  atribuida_para_nome VARCHAR(255), -- Nome do usuário atribuído
  data_atribuicao TIMESTAMPTZ,
  
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
```

### **🏷️ CATEGORY (tenant_{id}.categories)**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7) DEFAULT '#000000',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **🔔 NOTIFICATION (tenant_{id}.notifications) - NOVA ENTIDADE**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL, -- Isolamento por usuário
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500), -- URL para ação relacionada
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### **📊 DASHBOARD_METRIC (tenant_{id}.dashboard_metrics) - NOVA ENTIDADE**
```sql
CREATE TABLE dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2),
  metric_type VARCHAR(50), -- financial, count, percentage
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **📎 ATTACHMENT (tenant_{id}.attachments) - NOVA ENTIDADE**
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- client, project, task, invoice, etc.
  entity_id UUID NOT NULL,
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
```

---

## 🔗 RELACIONAMENTOS ENTRE ENTIDADES

### **🏢 Relacionamentos Globais (Inter-Tenant)**
```
TENANT (1) ←→ (N) USER
  ↓
  Cada tenant tem múltiplos usuários
  Cada usuário pertence a um tenant

ADMIN_USER → (independente de tenant)
  ↓
  Acesso global ao sistema
```

### **📊 Relacionamentos Intra-Tenant (Por Schema)**
```
CLIENT (1) ←→ (N) PROJECT
  ↓
  Um cliente pode ter vários projetos
  Um projeto pertence a um cliente

PROJECT (1) ←→ (N) TASK
  ↓
  Um projeto pode ter várias tarefas
  Uma tarefa pertence a um projeto

CLIENT (1) ←→ (N) INVOICE
  ↓
  Um cliente pode ter várias faturas
  Uma fatura pertence a um cliente

CLIENT (1) ←→ (N) TRANSACTION
PROJECT (1) ←→ (N) TRANSACTION
  ↓
  Transações podem estar ligadas a clientes e/ou projetos

USER (1) ←→ (N) PUBLICATION
  ↓
  Publicações são isoladas por usuário dentro do tenant

USER (1) ←→ (N) NOTIFICATION
  ↓
  Notificações são isoladas por usuário

CATEGORY (1) ←→ (N) TRANSACTION
  ↓
  Uma categoria pode ter várias transações
  Uma transação pertence a uma categoria

ENTITY (1) ←→ (N) ATTACHMENT
  ↓
  Qualquer entidade pode ter múltiplos anexos
```

---

## 🛡️ ESTRATÉGIAS DE ISOLAMENTO

### **🏗️ 1. Isolamento por Schema**
```sql
-- Cada tenant tem seu próprio schema
CREATE SCHEMA tenant_{tenant_id};

-- Todas as tabelas ficam no schema do tenant
CREATE TABLE tenant_{tenant_id}.clients (...);
CREATE TABLE tenant_{tenant_id}.projects (...);
```

### **👤 2. Isolamento por Usuário (Módulos Específicos)**
```sql
-- Publicações e Notificações são isoladas por usuário
SELECT * FROM ${schema}.publications WHERE user_id = $1;
SELECT * FROM ${schema}.notifications WHERE user_id = $1;
```

### **🔍 3. Validação de Acesso**
```typescript
// Middleware garante que req.tenantDB está no schema correto
const validateTenantAccess = async (req, res, next) => {
  const user = req.user;
  req.tenantDB = await tenantDB.getTenantDatabase(user.tenantId);
  next();
};
```

### **🚫 4. Prevenção de Vazamento de Dados**
```sql
-- Todas as queries são executadas no schema correto
SELECT * FROM ${schema}.clients WHERE is_active = true;

-- Nunca diretamente:
SELECT * FROM clients; -- ❌ Perigoso!
```

---

## 🔐 CONTROLE DE ACESSO POR TIPO DE CONTA

### **📊 SIMPLES**
- ✅ Acesso: Clients, Projects, Tasks, Publications, Notifications
- ❌ Bloqueado: Transactions, Invoices (financeiro)

### **💼 COMPOSTA**
- ✅ Acesso: Todos os módulos
- ✅ Financeiro: Transactions, Invoices
- ✅ Dashboard: Métricas completas incluindo financeiras

### **👑 GERENCIAL**
- ✅ Acesso: Todos os módulos + relatórios avançados
- ✅ Administração: Usuários do tenant
- ✅ Auditoria: Logs e métricas avançadas

---

## 📈 INTEGRIDADE REFERENCIAL

### **🔗 Foreign Keys Obrigatórias**
```sql
-- Dentro do schema do tenant
ALTER TABLE projects 
ADD CONSTRAINT fk_project_client 
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE tasks 
ADD CONSTRAINT fk_task_project 
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE tasks 
ADD CONSTRAINT fk_task_client 
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE invoices 
ADD CONSTRAINT fk_invoice_client 
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE invoices 
ADD CONSTRAINT fk_invoice_project 
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE transactions 
ADD CONSTRAINT fk_transaction_client 
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE transactions 
ADD CONSTRAINT fk_transaction_project 
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE attachments 
ADD CONSTRAINT fk_attachment_entity 
FOREIGN KEY (entity_id) REFERENCES clients(id); -- Exemplo
```

### **✅ Validações de Negócio**
```typescript
// Sempre validar que os relacionamentos estão no mesmo tenant
const project = await projectsService.getProjectById(tenantDB, projectId);
const client = await clientsService.getClientById(tenantDB, project.client_id);

// ✅ Ambos estão no mesmo schema automaticamente
```

---

## 🔧 CAMPOS AUSENTES IDENTIFICADOS NOS UIs

### **👥 Clients**
- ✅ `mobile` - Campo separado de telefone
- ✅ `level` - Nível do cliente (Premium, VIP)
- ✅ `pis`, `cei` - Documentos brasileiros
- ✅ `inss_status` - Status no INSS
- ✅ `amount_paid` - Valor já pago
- ✅ `referred_by` - Indicado por
- ✅ `registered_by` - Cadastrado por

### **📁 Projects**
- ✅ `name` - Nome separado do título
- ✅ `estimated_value` - Valor estimado
- ✅ `contacts` - Array de contatos complexo
- ✅ `assigned_to` - Array de responsáveis
- ✅ `due_date` - Data de vencimento

### **🧾 Invoices**
- ✅ `title` - Título da fatura
- ✅ `project_id`, `project_name` - Vinculação com projeto
- ✅ `client_email`, `client_phone` - Dados específicos
- ✅ `items` - Estrutura de itens detalhada
- ✅ `payment_status`, `payment_method` - Status de pagamento
- ✅ `stripe_*` - Integração com Stripe
- ✅ `recorrente` - Faturas recorrentes

### **📋 Publications**
- ✅ `vara_comarca` - Vara/Comarca
- ✅ `nome_pesquisado` - Nome pesquisado
- ✅ `diario` - Diário oficial
- ✅ `urgencia` - Nível de urgência
- ✅ `atribuida_para_*` - Sistema de atribuição

---

## 🎯 RESUMO DA ARQUITETURA COMPLETA

1. **🏢 Tenant**: Unidade de isolamento principal
2. **👤 User**: Pertence a um tenant, com tipo de conta
3. **👥 Client**: Centro das relações de negócio (EXPANDIDO)
4. **📁 Project**: Ligado a client, contém tasks (EXPANDIDO)
5. **✅ Task**: Parte de um project, com subtarefas (EXPANDIDO)
6. **💰 Transaction**: Fluxo de caixa, liga clients/projects
7. **🧾 Invoice**: Faturamento, pertence a client (MUITO EXPANDIDO)
8. **📋 Publication**: Isolado por usuário (EXPANDIDO)
9. **🏷️ Category**: Classificação de transações
10. **🔔 Notification**: Sistema de notificações (NOVO)
11. **📊 Dashboard_Metric**: Métricas calculadas (NOVO)
12. **📎 Attachment**: Sistema de anexos (NOVO)

**🛡️ Isolamento Total**: Cada tenant opera em seu próprio schema, com isolamento adicional por usuário em módulos específicos (publicações e notificações), garantindo zero vazamento de dados entre inquilinos.

**🔧 Campos Críticos Adicionados**: 47 novos campos identificados nos UIs que estavam ausentes na documentação original, incluindo integrações com Stripe, sistema de recorrência, estruturas complexas de contatos e itens, e campos específicos da legislação brasileira.
