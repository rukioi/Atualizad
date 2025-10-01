
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
  organization VARCHAR(255),
  address JSONB DEFAULT '{}',
  budget DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(50) DEFAULT 'active',
  tags JSONB DEFAULT '[]',
  notes TEXT,
  -- Campos específicos do Brasil
  cpf VARCHAR(20),
  rg VARCHAR(20),
  professional_title VARCHAR(255),
  marital_status VARCHAR(50),
  birth_date DATE,
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **📁 PROJECT (tenant_{id}.projects)**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID, -- FK para clients
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'proposal',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  budget DECIMAL(12,2),
  estimated_value DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  tags JSONB DEFAULT '[]',
  notes TEXT,
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **✅ TASK (tenant_{id}.tasks)**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID, -- FK para projects
  project_title VARCHAR(255),
  assigned_to VARCHAR(255),
  status VARCHAR(50) DEFAULT 'not_started',
  priority VARCHAR(20) DEFAULT 'medium',
  progress INTEGER DEFAULT 0,
  due_date DATE,
  tags JSONB DEFAULT '[]',
  notes TEXT,
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
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
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(20),
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **🧾 INVOICE (tenant_{id}.invoices)**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(50) NOT NULL,
  client_id UUID, -- FK para clients
  client_name VARCHAR(255),
  project_id UUID, -- FK para projects (opcional)
  project_name VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  description TEXT,
  items JSONB DEFAULT '[]',
  notes TEXT,
  -- Auditoria
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **📋 PUBLICATION (tenant_{id}.publications)**
```sql
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'notification',
  status VARCHAR(20) DEFAULT 'novo',
  user_id VARCHAR(255), -- FK para user (isolamento por usuário)
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
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

CATEGORY (1) ←→ (N) TRANSACTION
  ↓
  Uma categoria pode ter várias transações
  Uma transação pertence a uma categoria
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

### **🔍 2. Validação de Acesso**
```typescript
// Middleware garante que req.tenantDB está no schema correto
const validateTenantAccess = async (req, res, next) => {
  const user = req.user;
  req.tenantDB = await tenantDB.getTenantDatabase(user.tenantId);
  next();
};
```

### **🚫 3. Prevenção de Vazamento de Dados**
```sql
-- Todas as queries são executadas no schema correto
SELECT * FROM ${schema}.clients WHERE is_active = true;

-- Nunca diretamente:
SELECT * FROM clients; -- ❌ Perigoso!
```

---

## 🔐 CONTROLE DE ACESSO POR TIPO DE CONTA

### **📊 SIMPLES**
- ✅ Acesso: Clients, Projects, Tasks, Publications
- ❌ Bloqueado: Transactions, Invoices (financeiro)

### **💼 COMPOSTA**
- ✅ Acesso: Todos os módulos
- ✅ Financeiro: Transactions, Invoices

### **👑 GERENCIAL**
- ✅ Acesso: Todos os módulos + relatórios avançados
- ✅ Administração: Usuários do tenant

---

## 📈 INTEGRIDADE REFERENCIAL

### **🔗 Foreign Keys Lógicas**
```sql
-- Dentro do schema do tenant
ALTER TABLE projects 
ADD CONSTRAINT fk_project_client 
FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE tasks 
ADD CONSTRAINT fk_task_project 
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE invoices 
ADD CONSTRAINT fk_invoice_client 
FOREIGN KEY (client_id) REFERENCES clients(id);
```

### **✅ Validações de Negócio**
```typescript
// Sempre validar que os relacionamentos estão no mesmo tenant
const project = await projectsService.getProjectById(tenantDB, projectId);
const client = await clientsService.getClientById(tenantDB, project.client_id);

// ✅ Ambos estão no mesmo schema automaticamente
```

---

## 🎯 RESUMO DA ARQUITETURA

1. **🏢 Tenant**: Unidade de isolamento principal
2. **👤 User**: Pertence a um tenant, com tipo de conta
3. **👥 Client**: Centro das relações de negócio
4. **📁 Project**: Ligado a client, contém tasks
5. **✅ Task**: Parte de um project
6. **💰 Transaction**: Fluxo de caixa, liga clients/projects
7. **🧾 Invoice**: Faturamento, pertence a client
8. **📋 Publication**: Isolado por usuário
9. **🏷️ Category**: Classificação de transações

**🛡️ Isolamento Total**: Cada tenant opera em seu próprio schema, garantindo zero vazamento de dados entre inquilinos.
