# 🎯 PLANO ESTRATÉGICO: Remoção de Mock Data e Implementação CRUD Completo

## 📋 OVERVIEW

Plano profissional para converter todos os módulos que usam dados mock para CRUD completo com PostgreSQL, seguindo o padrão estabelecido em `CRM > Clientes`.

---

## 🏗️ MÓDULOS A SEREM IMPLEMENTADOS

### 1. **CRM > Pipeline de Vendas (Deals/Projects)** ⚠️ PRIORIDADE ALTA
**Status Atual:** Mock data  
**Complexidade:** Média  
**Tempo Estimado:** 4-6 horas

**Tarefas:**
1. ✅ Backend já implementado (`src/services/projectsService.ts`)
2. ❌ Frontend usando mock data (`client/pages/CRM.tsx` linha ~120-180)
3. ❌ Integrar hook `useProjects` com API real
4. ❌ Remover array `mockDeals`
5. ❌ Testar criação, edição, exclusão e movimentação de cards
6. ❌ Implementar notificações reais (já corrigida autenticação)

**Campos Críticos:**
- `id`: UUID auto-gerado
- `title`: VARCHAR (obrigatório)
- `contactName`: VARCHAR (obrigatório)
- `stage`: VARCHAR (contacted, proposal, won, lost)
- `budget`: DECIMAL(15,2)
- `tags`: JSONB
- `contacts`: JSONB
- `assignedTo`: JSONB

---

### 2. **Tarefas (Tasks)** ⚠️ PRIORIDADE ALTA
**Status Atual:** Mock data  
**Complexidade:** Média  
**Tempo Estimado:** 4-5 horas

**Tarefas:**
1. ✅ Backend já implementado (`src/services/tasksService.ts`)
2. ❌ Frontend precisa integração completa
3. ❌ Criar hook `useTasks` com React Query
4. ❌ Implementar Kanban board real (substituir mock)
5. ❌ Vincular tarefas a projetos e clientes
6. ❌ Implementar filtros por status, prioridade, responsável

**Campos Críticos:**
- `id`: UUID
- `title`: VARCHAR
- `assignedTo`: VARCHAR (userId)
- `status`: VARCHAR (not_started, in_progress, completed)
- `priority`: VARCHAR (low, medium, high)
- `projectId`: UUID (FK opcional)
- `clientId`: UUID (FK opcional)
- `subtasks`: JSONB

---

### 3. **Transações (Cash Flow)** ⚠️ PRIORIDADE MÉDIA
**Status Atual:** Mock data  
**Complexidade:** Média-Alta  
**Tempo Estimado:** 5-7 horas

**Tarefas:**
1. ✅ Backend já implementado (`src/services/transactionsService.ts`)
2. ❌ Frontend usando dados mock
3. ❌ Implementar categorização de despesas/receitas
4. ❌ Criar gráficos reais (substituir dados fictícios)
5. ❌ Implementar filtros por data, categoria, tipo
6. ❌ Calcular saldo real baseado no banco

**Campos Críticos:**
- `type`: VARCHAR (income, expense)
- `amount`: DECIMAL(15,2)
- `category`: VARCHAR
- `date`: DATE
- `paymentMethod`: VARCHAR
- `status`: VARCHAR (confirmed, pending)
- `isRecurring`: BOOLEAN
- `recurringFrequency`: VARCHAR

---

### 4. **Faturas (Invoices)** ⚠️ PRIORIDADE MÉDIA
**Status Atual:** Mock data  
**Complexidade:** Alta  
**Tempo Estimado:** 6-8 horas

**Tarefas:**
1. ✅ Backend já implementado (`src/services/invoicesService.ts`)
2. ❌ Frontend usando dados mock
3. ❌ Implementar geração automática de números de fatura
4. ❌ Integrar com Stripe para links de pagamento
5. ❌ Implementar sistema de lembretes (email/WhatsApp)
6. ❌ Gerar PDFs de faturas (usando biblioteca)
7. ❌ Vincular faturas a projetos e clientes

**Campos Críticos:**
- `number`: VARCHAR UNIQUE (auto-gerado: INV-YYYY-NNNN)
- `amount`: DECIMAL(15,2)
- `dueDate`: DATE
- `status`: VARCHAR (nova, enviada, paga, vencida)
- `items`: JSONB (array de itens da fatura)
- `paymentStatus`: VARCHAR
- `linkPagamento`: VARCHAR (Stripe)
- `stripeInvoiceId`: VARCHAR

---

### 5. **Publicações Jurídicas** ⚠️ PRIORIDADE BAIXA
**Status Atual:** Mock data  
**Complexidade:** Baixa-Média  
**Tempo Estimado:** 3-4 horas

**Tarefas:**
1. ✅ Backend já implementado (`src/services/publicationsService.ts`)
2. ❌ Frontend usando dados mock
3. ❌ Implementar filtros por status, urgência, responsável
4. ❌ Vincular publicações a tarefas
5. ❌ Implementar sistema de atribuição

**Campos Críticos:**
- `userId`: VARCHAR (isolamento por usuário)
- `oabNumber`: VARCHAR
- `processNumber`: VARCHAR
- `publicationDate`: DATE
- `content`: TEXT
- `status`: VARCHAR (nova, lida, arquivada)
- `tarefasVinculadas`: JSONB

---

### 6. **Dashboard Métricas** ⚠️ PRIORIDADE MÉDIA
**Status Atual:** Parcialmente mock  
**Complexidade:** Média  
**Tempo Estimado:** 4-5 horas

**Tarefas:**
1. ✅ Backend parcialmente implementado
2. ❌ Calcular métricas reais de todos os módulos
3. ❌ Implementar gráficos com dados reais
4. ❌ Criar cache de métricas para performance
5. ❌ Filtros por período (dia, semana, mês, ano)

---

## 🔄 METODOLOGIA DE IMPLEMENTAÇÃO

### Fase 1: Preparação (1 hora por módulo)
1. **Análise de Dependências**
   - Verificar se backend está completo
   - Identificar campos faltantes na tabela
   - Mapear relacionamentos com outras tabelas

2. **Criação de Interfaces TypeScript**
   - Definir tipos no frontend baseado no backend
   - Garantir consistência entre frontend/backend

3. **Setup de Validação**
   - Criar schemas Zod para validação
   - Padronizar mensagens de erro

### Fase 2: Implementação Backend (2-3 horas por módulo)
1. **Service Layer**
   - Verificar e corrigir métodos CRUD
   - Adicionar métodos de agregação (stats, counts)
   - Implementar soft delete

2. **Controller Layer**
   - Validação com Zod
   - Error handling padronizado
   - Logs de auditoria

3. **Routes**
   - Configurar middlewares (auth + tenant)
   - Testar endpoints com Postman/Thunder Client

### Fase 3: Implementação Frontend (3-4 horas por módulo)
1. **Hooks Personalizados**
   - Criar hook `useEntities` com React Query
   - Implementar mutations (create, update, delete)
   - Cache e invalidação automática

2. **Componentes UI**
   - Criar/atualizar formulários
   - Implementar tabelas/listas
   - Adicionar loading states e error handling

3. **Integração**
   - Remover arrays de mock data
   - Conectar componentes aos hooks reais
   - Testar fluxos completos

### Fase 4: Testes & Validação (1-2 horas por módulo)
1. **Testes Funcionais**
   - Criar, editar, excluir registros
   - Testar filtros e paginação
   - Validar isolamento multi-tenant

2. **Testes de Performance**
   - Verificar queries lentas
   - Adicionar índices se necessário
   - Otimizar JSONB queries

3. **Testes de UI/UX**
   - Verificar responsividade
   - Testar estados de erro
   - Validar feedback ao usuário

---

## 📊 PRIORIZAÇÃO E SEQUÊNCIA

### Sprint 1 (Semana 1) - CRÍTICO
1. ✅ **CRM > Clientes** (JÁ IMPLEMENTADO - REFERÊNCIA)
2. **CRM > Pipeline de Vendas** (4-6h)
3. **Tarefas** (4-5h)

### Sprint 2 (Semana 2) - IMPORTANTE
4. **Transações** (5-7h)
5. **Faturas** (6-8h)
6. **Dashboard Métricas** (4-5h)

### Sprint 3 (Semana 3) - COMPLEMENTAR
7. **Publicações Jurídicas** (3-4h)
8. **Otimizações Finais** (4-6h)
9. **Testes End-to-End** (4-6h)

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Migração de Dados Existentes
Se houver dados de teste criados com mock:
```sql
-- Limpar dados mock antes de começar
DELETE FROM ${schema}.projects WHERE created_by = 'mock-user';
DELETE FROM ${schema}.tasks WHERE created_by = 'mock-user';
```

### 2. Compatibilidade de Tipos
**Frontend → Backend:**
- Datas: Usar ISO string `YYYY-MM-DD`
- Números: Converter strings para number
- JSONB: Sempre usar `JSON.stringify()` e `JSON.parse()`
- Arrays vazios: `[]` em vez de `null`

### 3. Performance
- Adicionar índices em campos filtráveis
- Implementar paginação em todas as listagens
- Cache de queries frequentes (React Query)
- Limitar resultados (max 100 por página)

### 4. Segurança
- SEMPRE validar entrada com Zod
- NUNCA confiar em dados do frontend
- Usar prepared statements (já implementado nos helpers)
- Verificar permissões de tenant em cada operação

---

## 📈 MÉTRICAS DE SUCESSO

### Critérios de Aceita\u00e7\u00e3o (por módulo)
- [ ] ✅ 0% de dados mock no frontend
- [ ] ✅ 100% dos dados vêm do PostgreSQL
- [ ] ✅ CRUD completo funcional (Create, Read, Update, Delete)
- [ ] ✅ Validação robusta (Zod no backend)
- [ ] ✅ Isolamento multi-tenant verificado
- [ ] ✅ Performance < 500ms para queries simples
- [ ] ✅ Paginação implementada em listas
- [ ] ✅ Error handling amigável ao usuário
- [ ] ✅ Logs de auditoria para operações críticas

---

## 🛠️ FERRAMENTAS E RECURSOS

### Desenvolvimento
- **Backend:** TypeScript, Express, Prisma, Zod
- **Frontend:** React, TypeScript, React Query, Zod
- **Database:** PostgreSQL 15+
- **Testing:** Thunder Client (API), React DevTools (Frontend)

### Documentação de Referência
- `DOCUMENTATION_CRUD_PATTERN.md` - Padrão técnico completo
- `PROMPT_TEMPLATE.md` - Prompt para implementação
- `src/services/clientsService.ts` - Implementação de referência
- `src/controllers/clientsController.ts` - Controller de referência

---

## 📝 CONCLUSÃO

Este plano garante:
- ✅ Remoção sistemática de todos os dados mock
- ✅ Implementação CRUD completa e robusta
- ✅ Padronização em todos os módulos
- ✅ Qualidade e manutenibilidade do código
- ✅ Performance e escalabilidade
- ✅ Segurança multi-tenant

**Tempo Total Estimado:** 35-50 horas  
**Prioridade:** Começar pelo Pipeline de Vendas (maior impacto)

---

**Criado:** Outubro 2025  
**Sistema:** HABEA DESK  
**Versão:** 1.0
