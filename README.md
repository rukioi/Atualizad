# 🏛️ SaaS Backend - Sistema de Gestão Jurídica

Backend completo e robusto para sistema SaaS multi-tenant de gestão de escritórios de advocacia.

## 🚀 Características Principais

### 🏢 Arquitetura Multi-Tenant
- **Isolamento por Schema**: Cada tenant possui schema PostgreSQL isolado
- **Segurança Robusta**: Validação cross-tenant rigorosa
- **Escalabilidade**: Preparado para milhares de tenants

### 🔐 Sistema de Autenticação
- **JWT + Refresh Tokens**: Access token (15min) + Refresh rotativo (7 dias)
- **Tipos de Conta**: Simples, Composta, Gerencial
- **Chaves de Registro**: Sistema seguro de convites

### 📊 Módulos Implementados
- **Dashboard**: Métricas em tempo real por tipo de conta
- **CRM**: Gestão completa de clientes
- **Projetos**: Controle de projetos jurídicos
- **Tarefas**: Sistema de tarefas e responsabilidades
- **Fluxo de Caixa**: Controle financeiro (Composta/Gerencial)
- **Faturamento**: Sistema de cobranças (Composta/Gerencial)

## 🛠️ Stack Tecnológica

- **Runtime**: Node.js 20 LTS + TypeScript
- **Framework**: Express.js com middleware de segurança
- **Banco de Dados**: PostgreSQL via Supabase
- **ORM**: Prisma com migrations automáticas
- **Autenticação**: JWT + bcrypt
- **Validação**: Zod schemas
- **Containerização**: Docker multi-stage

## 📋 Pré-requisitos

- Node.js 20+ LTS
- PostgreSQL 15+ (ou Supabase)
- Redis (opcional, para cache)
- Docker (opcional)

## 🚀 Setup Rápido

### 1. Instalação de Dependências

```bash
npm install
```

### 2. Configuração do Banco

```bash
# Configurar variáveis de ambiente
cp .env.example .env

# Executar migrations
npx prisma migrate dev

# Gerar cliente Prisma
npx prisma generate
```

### 3. Setup Inicial do Banco

```bash
# Executar script de setup (criar funções SQL)
psql $DATABASE_URL -f scripts/setup-database.sql
```

### 4. Iniciar Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🔑 Sistema de Chaves de Registro

### Gerar Chave de Registro

```bash
curl -X POST http://localhost:4000/api/admin/keys \
  -H "Content-Type: application/json" \
  -d '{
    "accountType": "GERENCIAL",
    "usesAllowed": 1,
    "singleUse": true
  }'
```

### Registrar Usuário

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@escritorio.com",
    "password": "MinhaSenh@123",
    "name": "Dr. Administrador",
    "key": "CHAVE_GERADA_ACIMA"
  }'
```

## 📡 Endpoints da API

### 🔐 Autenticação
```
POST /api/auth/register     # Registro com chave
POST /api/auth/login        # Login
POST /api/auth/refresh      # Renovar tokens
GET  /api/auth/me           # Perfil do usuário
PUT  /api/auth/me           # Atualizar perfil
```

### 👥 CRM (Clientes)
```
GET    /api/clients         # Listar clientes
GET    /api/clients/:id     # Obter cliente
POST   /api/clients         # Criar cliente
PUT    /api/clients/:id     # Atualizar cliente
DELETE /api/clients/:id     # Deletar cliente
```

### 🏗️ Projetos
```
GET    /api/projects        # Listar projetos
GET    /api/projects/:id    # Obter projeto
POST   /api/projects        # Criar projeto
PUT    /api/projects/:id    # Atualizar projeto
DELETE /api/projects/:id    # Deletar projeto
```

### ✅ Tarefas
```
GET    /api/tasks           # Listar tarefas
GET    /api/tasks/:id       # Obter tarefa
POST   /api/tasks           # Criar tarefa
PUT    /api/tasks/:id       # Atualizar tarefa
DELETE /api/tasks/:id       # Deletar tarefa
GET    /api/tasks/stats/overview # Estatísticas
```

### 💰 Transações (Composta/Gerencial)
```
GET    /api/transactions    # Listar transações
GET    /api/transactions/:id # Obter transação
POST   /api/transactions    # Criar transação
PUT    /api/transactions/:id # Atualizar transação
DELETE /api/transactions/:id # Deletar transação
```

### 🧾 Faturas (Composta/Gerencial)
```
GET    /api/invoices        # Listar faturas
GET    /api/invoices/:id    # Obter fatura
POST   /api/invoices        # Criar fatura
PUT    /api/invoices/:id    # Atualizar fatura
DELETE /api/invoices/:id    # Deletar fatura
GET    /api/invoices/stats/overview # Estatísticas
```

### 📊 Dashboard
```
GET /api/dashboard/metrics     # Métricas gerais
GET /api/dashboard/financeiro  # Dados financeiros
GET /api/dashboard/clientes    # Métricas de clientes
GET /api/dashboard/projetos    # Métricas de projetos
```

### 🔧 Admin
```
GET    /api/admin/tenants   # Listar tenants
POST   /api/admin/tenants   # Criar tenant
DELETE /api/admin/tenants/:id
GET    /api/admin/keys      # Listar chaves
POST   /api/admin/keys      # Gerar chave
PATCH  /api/admin/keys/:id/revoke
GET    /api/admin/metrics   # Métricas globais
```

## 🔒 Tipos de Conta e Permissões

### 🟢 Conta Simples
- ✅ **CRM**: Acesso completo a clientes
- ✅ **Projetos**: Gestão de projetos
- ✅ **Tarefas**: Sistema de tarefas
- ❌ **Financeiro**: Dados financeiros zerados no dashboard
- ❌ **Transações**: Sem acesso ao fluxo de caixa
- ❌ **Faturas**: Sem acesso ao faturamento

### 🟡 Conta Composta
- ✅ **Todos os módulos**: Acesso completo
- ✅ **Dashboard Financeiro**: Gráficos e métricas completas
- ✅ **Transações**: Criar/editar fluxo de caixa
- ✅ **Faturas**: Sistema de faturamento
- ❌ **Configurações**: Sem acesso administrativo

### 🔴 Conta Gerencial
- ✅ **Acesso Total**: Todos os módulos e funcionalidades
- ✅ **Configurações**: Gestão de usuários e sistema
- ✅ **Auditoria**: Logs e relatórios avançados
- ✅ **Administração**: Controle completo do tenant

## 🗄️ Estrutura do Banco

### Schema Admin (Global)
```sql
-- Tenants, Users, Registration Keys, System Logs, Audit Logs
```

### Schema por Tenant
```sql
tenant_abc123/
├── users           # Usuários do tenant
├── clients         # CRM - Clientes
├── projects        # Projetos jurídicos
├── tasks           # Tarefas e responsabilidades
├── transactions    # Fluxo de caixa
├── invoices        # Faturamento
└── publications    # Publicações (isolado por usuário)
```

## 🔄 Fluxo de Dados

### 1. Registro de Usuário
```
Chave de Registro → Validação → Criação de Tenant (se necessário) → Usuário Criado
```

### 2. Operações CRUD
```
Autenticação → Validação de Tenant → Operação no Schema → Audit Log → Resposta
```

### 3. Dashboard Metrics
```
Requisição → Verificação de Tipo de Conta → Query no Schema → Cache → Resposta
```

## 🧪 Testes

### Executar Testes
```bash
npm test
```

### Testes de Integração
```bash
npm run test:integration
```

### Coverage
```bash
npm run test:coverage
```

## 🐳 Docker

### Desenvolvimento
```bash
docker-compose up -d
```

### Produção
```bash
docker build -t law-saas-backend .
docker run -p 4000:4000 law-saas-backend
```

## 📊 Monitoramento

### Health Check
```bash
curl http://localhost:4000/health
```

### Métricas
- **Endpoint**: `/api/admin/metrics`
- **Logs**: Estruturados em JSON
- **Auditoria**: Todas as operações logadas

## 🔧 Configuração de Produção

### Variáveis de Ambiente Obrigatórias
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=https://your-frontend.com
```

### Variáveis Opcionais
```env
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 🚨 Segurança

### Implementado
- ✅ **CORS** configurado
- ✅ **Helmet** para headers de segurança
- ✅ **Rate Limiting** (1000 req/15min por IP)
- ✅ **Input Validation** com Zod
- ✅ **Password Hashing** com bcrypt (12 rounds)
- ✅ **SQL Injection Prevention** via Prisma
- ✅ **Cross-Tenant Access Prevention**

### Auditoria
- ✅ **Audit Logs**: Todas as operações CRUD
- ✅ **System Logs**: Erros e eventos do sistema
- ✅ **Request Logging**: Logs de requisições HTTP

## 📈 Performance

### Otimizações Implementadas
- **Indexes**: Criados automaticamente para queries frequentes
- **Pagination**: Implementada em todas as listagens
- **Soft Delete**: Preserva dados para auditoria
- **Connection Pooling**: Via Prisma

### Métricas de Performance
- **Response Time**: < 200ms para operações simples
- **Database Queries**: Otimizadas com indexes
- **Memory Usage**: Monitorado via health check

## 🔄 Migrations

### Aplicar Migration a Todos os Tenants
```sql
SELECT * FROM apply_migration_to_all_tenants('
  ALTER TABLE ${schema}.clients ADD COLUMN new_field VARCHAR;
');
```

### Criar Novo Tenant
```sql
SELECT create_tenant_schema('550e8400-e29b-41d4-a716-446655440000');
```

## 📚 Documentação Adicional

- **[Arquitetura Detalhada](./docs/01-VISAO-GERAL-ARQUITETURA.md)**
- **[Documentação de Módulos](./docs/02-DOCUMENTACAO-MODULOS.md)**
- **[Playbook Técnico](./docs/03-PLAYBOOK-TECNICO.md)**
- **[Métricas e Fórmulas](./docs/04-ANEXO-METRICAS-GLOBAIS.md)**
- **[Error Handling](./docs/05-ERROR-HANDLING.md)**

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: dev@lawsaas.com
- **Documentação**: [docs/](./docs/)
- **Issues**: GitHub Issues

---

**🎯 Status**: ✅ Produção Ready  
**🔄 Última Atualização**: Janeiro 2025  
**👥 Equipe**: Backend Team