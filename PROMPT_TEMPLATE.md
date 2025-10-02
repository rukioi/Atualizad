# 🤖 PROMPT TEMPLATE: Implementação CRUD Completo

## 📝 COMO USAR ESTE TEMPLATE

1. Copie todo o prompt abaixo
2. Substitua `[MÓDULO]`, `[ENTIDADE]`, `[campos específicos]` com os dados do seu módulo
3. Cole no chat do Replit Agent
4. O agente implementará automaticamente seguindo o padrão estabelecido

---

## 🎯 PROMPT PARA IMPLEMENTAÇÃO CRUD

```
# TAREFA: Implementar CRUD Completo para [MÓDULO]

Implemente CRUD completo para o módulo **[MÓDULO]** seguindo RIGOROSAMENTE o padrão estabelecido em `DOCUMENTATION_CRUD_PATTERN.md` e `src/services/clientsService.ts`.

## 📋 ESPECIFICAÇÕES DO MÓDULO

**Entidade:** [ENTIDADE] (ex: projects, tasks, invoices)  
**Tabela no DB:** [nome_tabela]  
**Endpoint Base:** `/api/[entidades]`

### Campos da Tabela

| Campo | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| id | UUID | Sim | gen_random_uuid() | Gerado automaticamente |
| [campo1] | VARCHAR | Sim | - | [descrição] |
| [campo2] | DECIMAL(15,2) | Não | - | [descrição] |
| [campo3] | JSONB | Não | '[]' | [descrição] |
| [campo4] | DATE | Não | - | [descrição] |
| status | VARCHAR | Não | 'active' | Status da entidade |
| created_by | VARCHAR | Sim | - | ID do usuário criador |
| created_at | TIMESTAMP | Sim | NOW() | Data de criação |
| updated_at | TIMESTAMP | Sim | NOW() | Data de atualização |
| is_active | BOOLEAN | Sim | TRUE | Soft delete flag |

### Relacionamentos

- [ ] Relaciona com `clients` (FK opcional): [campo_id]
- [ ] Relaciona com `projects` (FK opcional): [campo_id]
- [ ] Relaciona com `users` via `created_by`

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### BACKEND

#### 1. Service Layer (`src/services/[entidade]Service.ts`)
- [ ] Criar interface `[Entidade]` com todos os campos
- [ ] Criar interface `Create[Entidade]Data` para dados de criação
- [ ] Implementar `ensureTables()` com CREATE TABLE completo
- [ ] Adicionar índices: name, status, is_active, created_by, [campos filtráveis]
- [ ] Implementar `get[Entidades](tenantDB, filters)` com paginação
- [ ] Implementar `get[Entidade]ById(tenantDB, id)`
- [ ] Implementar `create[Entidade](tenantDB, data, userId)`
- [ ] Implementar `update[Entidade](tenantDB, id, data)`
- [ ] Implementar `delete[Entidade](tenantDB, id)` com soft delete
- [ ] Implementar método de stats/agregação se necessário
- [ ] **IMPORTANTE:** Usar CAST correto para JSONB, DATE, DECIMAL

#### 2. Controller Layer (`src/controllers/[entidade]Controller.ts`)
- [ ] Importar Zod para validação
- [ ] Criar `create[Entidade]Schema` com validação completa
- [ ] Criar `update[Entidade]Schema` como partial do create
- [ ] Implementar `get[Entidades](req, res)` com filtros da query
- [ ] Implementar `get[Entidade](req, res)` com :id params
- [ ] Implementar `create[Entidade](req, res)` com validação Zod
- [ ] Implementar `update[Entidade](req, res)` com validação Zod
- [ ] Implementar `delete[Entidade](req, res)`
- [ ] **SEMPRE verificar:** `req.user` e `req.tenantDB` no início
- [ ] Adicionar logs para debugging: `console.log('[Controller]', ...)`
- [ ] Error handling padronizado com try/catch

#### 3. Routes (`src/routes/[entidade].ts`)
- [ ] Importar middlewares: `authenticateToken`, `validateTenantAccess`
- [ ] Aplicar middlewares: `router.use(authenticateToken); router.use(validateTenantAccess);`
- [ ] Criar rotas CRUD:
  - `GET /` → lista com filtros e paginação
  - `GET /:id` → busca por ID
  - `POST /` → criação
  - `PUT /:id` → atualização
  - `DELETE /:id` → soft delete
- [ ] Exportar router como default

#### 4. Integração no App (`src/app.ts`)
- [ ] Importar rota: `import [entidade]Routes from './routes/[entidade]'`
- [ ] Registrar rota: `app.use('/api/[entidades]', [entidade]Routes)`

### FRONTEND

#### 5. Hook Customizado (`client/hooks/use[Entidades].ts`)
- [ ] Importar React Query: `useQuery`, `useMutation`, `useQueryClient`
- [ ] Importar `api` de `@/services/apiInterceptor`
- [ ] Criar interface `[Entidade]` correspondente ao backend
- [ ] Implementar `useQuery` para listagem com queryKey `['[entidades]']`
- [ ] Implementar `useMutation` para criação
- [ ] Implementar `useMutation` para atualização
- [ ] Implementar `useMutation` para exclusão
- [ ] **IMPORTANTE:** Usar `api.get/post/put/delete` NUNCA `fetch` direto
- [ ] Invalidar queries após mutations: `queryClient.invalidateQueries`
- [ ] Exportar hook com todos os métodos

#### 6. Form Component (`client/components/[Entidade]Form.tsx`)
- [ ] Usar `react-hook-form` com `zodResolver`
- [ ] Criar schema Zod para validação no frontend
- [ ] Usar componentes shadcn/ui: Input, Select, Button, etc
- [ ] Implementar `handleSubmit` que chama `onSubmit` prop
- [ ] Adicionar estados de loading e erro
- [ ] Validação em tempo real com mensagens de erro
- [ ] Suporte para edição: `defaultValues` com `initialData`

#### 7. List/Table Component (`client/components/[Entidades]Table.tsx`)
- [ ] Usar componente Table do shadcn/ui
- [ ] Implementar paginação
- [ ] Adicionar filtros (search, status, etc)
- [ ] Adicionar ações: editar, excluir, visualizar
- [ ] Loading state com Skeleton
- [ ] Empty state quando não há dados
- [ ] Ações em dropdown menu (MoreHorizontal icon)

#### 8. Integração na Página (`client/pages/[Modulo].tsx`)
- [ ] Importar hook `use[Entidades]`
- [ ] Remover TODOS os arrays de mock data
- [ ] Usar dados do hook: `const { [entidades], isLoading, create[Entidade] } = use[Entidades]()`
- [ ] Implementar handlers: `handleCreate`, `handleEdit`, `handleDelete`
- [ ] Conectar formulário aos handlers
- [ ] Adicionar Dialog para criar/editar
- [ ] Testar fluxo completo

### TESTES & VALIDAÇÃO

#### 9. Testes Funcionais
- [ ] Criar novo registro via formulário
- [ ] Editar registro existente
- [ ] Excluir registro (soft delete)
- [ ] Verificar paginação com muitos registros
- [ ] Testar filtros de busca
- [ ] Verificar isolamento multi-tenant (logar com outro tenant)

#### 10. Testes de Performance
- [ ] Query com muitos registros < 500ms
- [ ] Verificar índices criados: `EXPLAIN ANALYZE SELECT...`
- [ ] Otimizar queries JSONB se necessário

## ⚠️ PONTOS CRÍTICOS - NÃO ESQUECER

### 🔐 Autenticação
```typescript
// ✅ CORRETO - api interceptor SEM /api no path (baseURL já é '/api')
import api from '@/services/apiInterceptor';
await api.post('/entities', data);  // Resolve para /api/entities

// ❌ ERRADO - Duplicar /api causa 404
await api.post('/api/entities', data);  // Resolve para /api/api/entities - 404!

// ❌ ERRADO - Nunca usar fetch direto
fetch('/api/entities', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // ❌ Nome errado!
});
```

### 🗄️ CAST de Tipos
```typescript
// Service - Insert
const data = {
  tags: JSON.stringify(tags), // ✅ JSONB
  birthDate: `'${birthDate}'::date`, // ✅ DATE
  budget: parseFloat(budget) // ✅ DECIMAL
};

// Service - Select
const query = `
  SELECT 
    id::text,
    tags::jsonb,
    birth_date::date,
    budget::numeric
  FROM \${schema}.table
`;
```

### 🆔 Geração de IDs
```sql
-- ✅ CORRETO - PostgreSQL gera automaticamente
CREATE TABLE table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- ❌ ERRADO - Não gerar IDs manualmente no código
```

### 🏢 Isolamento Multi-Tenant
```typescript
// ✅ SEMPRE usar req.tenantDB
const result = await service.getEntities(req.tenantDB, filters);

// ❌ NUNCA usar prisma global ou queries diretas sem tenant
```

## 📊 CRITÉRIOS DE ACEITE

Marque ✅ quando completo:

- [ ] ✅ Backend CRUD completo e testado
- [ ] ✅ Frontend sem dados mock
- [ ] ✅ Formulário com validação Zod
- [ ] ✅ Tabela/lista com paginação
- [ ] ✅ Criação funcionando
- [ ] ✅ Edição funcionando
- [ ] ✅ Exclusão funcionando (soft delete)
- [ ] ✅ Isolamento multi-tenant verificado
- [ ] ✅ Performance < 500ms
- [ ] ✅ Error handling amigável

## 📚 REFERÊNCIAS

- `DOCUMENTATION_CRUD_PATTERN.md` - Padrão técnico completo
- `src/services/clientsService.ts` - Implementação de referência (Service)
- `src/controllers/clientsController.ts` - Implementação de referência (Controller)
- `client/hooks/useClients.ts` - Implementação de referência (Hook)

## 🎯 RESULTADO ESPERADO

Após implementação, o módulo deve:
1. ✅ Ter 0% de dados mock
2. ✅ Todos os dados vêm do PostgreSQL
3. ✅ CRUD completo funcional
4. ✅ Validação robusta (Zod)
5. ✅ Isolamento multi-tenant
6. ✅ Performance otimizada
7. ✅ UX profissional
```

---

## 🔄 EXEMPLO DE USO

### Implementar Módulo de Tarefas

```
# TAREFA: Implementar CRUD Completo para Tarefas

Implemente CRUD completo para o módulo **Tarefas** seguindo RIGOROSAMENTE o padrão estabelecido em `DOCUMENTATION_CRUD_PATTERN.md` e `src/services/clientsService.ts`.

## 📋 ESPECIFICAÇÕES DO MÓDULO

**Entidade:** Task  
**Tabela no DB:** tasks  
**Endpoint Base:** `/api/tasks`

### Campos da Tabela

| Campo | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| id | UUID | Sim | gen_random_uuid() | Gerado automaticamente |
| title | VARCHAR | Sim | - | Título da tarefa |
| description | TEXT | Não | - | Descrição detalhada |
| assignedTo | VARCHAR | Sim | - | ID do usuário responsável |
| status | VARCHAR | Não | 'not_started' | Status: not_started, in_progress, completed |
| priority | VARCHAR | Não | 'medium' | Prioridade: low, medium, high |
| dueDate | DATE | Não | - | Data de vencimento |
| projectId | VARCHAR | Não | - | FK para projects |
| clientId | VARCHAR | Não | - | FK para clients |
| tags | JSONB | Não | '[]' | Tags da tarefa |
| subtasks | JSONB | Não | '[]' | Sub-tarefas |
| created_by | VARCHAR | Sim | - | ID do usuário criador |
| created_at | TIMESTAMP | Sim | NOW() | Data de criação |
| updated_at | TIMESTAMP | Sim | NOW() | Data de atualização |
| is_active | BOOLEAN | Sim | TRUE | Soft delete flag |

### Relacionamentos

- [x] Relaciona com `projects` (FK opcional): projectId
- [x] Relaciona com `clients` (FK opcional): clientId
- [x] Relaciona com `users` via created_by e assignedTo

[... resto do prompt com todos os checklists...]
```

---

## 📝 NOTAS IMPORTANTES

### Para o Agente AI
- Sempre ler `DOCUMENTATION_CRUD_PATTERN.md` antes de começar
- Seguir EXATAMENTE o padrão de `clientsService.ts`
- Usar CAST corretos para tipos PostgreSQL
- NUNCA usar fetch direto - sempre `api` interceptor
- Validar isolamento multi-tenant em TODAS as operações

### Para o Desenvolvedor
- Revisar código gerado antes de fazer commit
- Testar manualmente todos os fluxos CRUD
- Verificar logs do console para erros
- Confirmar performance com muitos registros
- Validar com múltiplos tenants

---

**Versão:** 1.0  
**Data:** Outubro 2025  
**Sistema:** HABEA DESK
