# 📘 PADRÃO DE IMPLEMENTAÇÃO CRUD - HABEA DESK
## Documentação Técnica Completa para Implementação de Módulos

---

## 🎯 VISÃO GERAL

Este documento estabelece o padrão oficial para implementação de CRUD completo em todos os módulos do sistema. Baseado na implementação bem-sucedida do módulo **CRM > Clientes**.

---

## 🔐 1. AUTENTICAÇÃO E SEGURANÇA

### 1.1 Token Management (Frontend)

**✅ CORRETO:**
```typescript
// client/services/apiInterceptor.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Interceptor de Request - Adiciona token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token'); // ✅ Nome correto
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
```

**❌ ERRADO:**
```typescript
// NÃO usar fetch direto sem token
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // ❌ FALTA: Authorization header
  }
});

// ❌ ERRADO: Nome incorreto da chave
localStorage.getItem('token') // Deve ser 'access_token'
```

### 1.2 Autenticação Backend

**Middleware de Autenticação:**
```typescript
// src/middleware/auth.ts
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = await authService.verifyAccessToken(token);
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      accountType: decoded.accountType,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
```

**Isolamento Multi-Tenant:**
```typescript
// src/middleware/tenant-isolation.ts
export const validateTenantAccess = async (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const tenantDB = await tenantDatabase.getTenantDB(req.user.tenantId);
    req.tenantDB = tenantDB; // ✅ Injeta TenantDatabase no request
    req.tenant = { id: req.user.tenantId, name: tenantDB.tenant.name };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Tenant access denied' });
  }
};
```

---

## 🗄️ 2. ESTRUTURA DE BANCO DE DADOS

### 2.1 Tipos de Dados e CAST

| Campo | Tipo no DB | Tipo no TypeScript | CAST na Query | CAST no Insert |
|-------|------------|-------------------|---------------|----------------|
| **id** | UUID | string | `id::text` | `gen_random_uuid()` |
| **name** | VARCHAR | string | - | - |
| **email** | VARCHAR | string | - | - |
| **phone** | VARCHAR | string \| null | - | - |
| **budget** | DECIMAL(15,2) | number \| null | `budget::numeric` | `${budget}` |
| **tags** | JSONB | string[] | `tags::jsonb` | `'${JSON.stringify(tags)}'::jsonb` |
| **address** | JSONB | object | `address::jsonb` | `'${JSON.stringify(address)}'::jsonb` |
| **birth_date** | DATE | string (ISO) | `birth_date::date` | `'${birthDate}'::date` |
| **created_at** | TIMESTAMP | string (ISO) | `created_at` | `NOW()` |
| **updated_at** | TIMESTAMP | string (ISO) | `updated_at` | `NOW()` |
| **is_active** | BOOLEAN | boolean | `is_active` | `true` |

### 2.2 Geração de IDs

**✅ PADRÃO CORRETO - UUID Auto-gerado:**
```sql
CREATE TABLE IF NOT EXISTS ${schema}.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ✅ PostgreSQL gera automaticamente
  name VARCHAR NOT NULL,
  -- ...
);
```

**📝 IMPORTANTE:**
- IDs são gerados automaticamente pelo PostgreSQL usando `gen_random_uuid()`
- No frontend, não enviamos o `id` no payload de criação
- O backend retorna o registro completo com o `id` gerado

### 2.3 Template de CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS ${schema}.TABLE_NAME (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campos obrigatórios
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  
  -- Campos opcionais simples
  phone VARCHAR,
  organization VARCHAR,
  notes TEXT,
  description TEXT,
  
  -- Campos numéricos
  budget DECIMAL(15,2),
  amount_paid DECIMAL(15,2),
  
  -- Campos enum/varchar com default
  status VARCHAR DEFAULT 'active',
  currency VARCHAR(3) DEFAULT 'BRL',
  level VARCHAR,
  
  -- Campos complexos (JSONB)
  tags JSONB DEFAULT '[]',
  address JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Campos de data
  birth_date DATE,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP,
  
  -- Campos de auditoria (OBRIGATÓRIOS)
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_TABLE_NAME_name ON ${schema}.TABLE_NAME(name);
CREATE INDEX IF NOT EXISTS idx_TABLE_NAME_email ON ${schema}.TABLE_NAME(email);
CREATE INDEX IF NOT EXISTS idx_TABLE_NAME_status ON ${schema}.TABLE_NAME(status);
CREATE INDEX IF NOT EXISTS idx_TABLE_NAME_active ON ${schema}.TABLE_NAME(is_active);
CREATE INDEX IF NOT EXISTS idx_TABLE_NAME_created_by ON ${schema}.TABLE_NAME(created_by);
```

---

## 📦 3. ESTRUTURA DE SERVIÇOS (BACKEND)

### 3.1 Template de Service

```typescript
// src/services/entityService.ts
import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

export interface Entity {
  id: string;
  name: string;
  // ... outros campos
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateEntityData {
  name: string;
  // ... campos obrigatórios e opcionais
}

export class EntityService {
  private tableName = 'entities';

  /**
   * Cria tabela automaticamente se não existir
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        -- ... outros campos
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    // Criar índices
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON \${schema}.${this.tableName}(name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Lista entidades com paginação
   */
  async getEntities(tenantDB: TenantDatabase, filters: any = {}) {
    await this.ensureTables(tenantDB);
    
    const { page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        id::text, name, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;
    
    const entities = await queryTenantSchema<Entity>(tenantDB, query, [limit, offset]);
    const [{ total }] = await queryTenantSchema<{ total: string }>(tenantDB, countQuery);
    
    return {
      entities,
      pagination: {
        page,
        limit,
        total: parseInt(total),
        totalPages: Math.ceil(parseInt(total) / limit),
        hasNext: page * limit < parseInt(total),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Cria nova entidade
   */
  async createEntity(tenantDB: TenantDatabase, data: CreateEntityData, userId: string): Promise<Entity> {
    await this.ensureTables(tenantDB);
    
    const entityData = {
      name: data.name,
      // ... outros campos com CAST apropriado
      tags: data.tags ? JSON.stringify(data.tags) : '[]',
      created_by: userId
    };
    
    return await insertInTenantSchema<Entity>(tenantDB, this.tableName, entityData);
  }

  /**
   * Atualiza entidade
   */
  async updateEntity(tenantDB: TenantDatabase, id: string, data: Partial<CreateEntityData>): Promise<Entity> {
    await this.ensureTables(tenantDB);
    
    const updateData: any = { ...data };
    if (data.tags) updateData.tags = JSON.stringify(data.tags);
    
    return await updateInTenantSchema<Entity>(tenantDB, this.tableName, id, updateData);
  }

  /**
   * Soft delete (marca is_active = false)
   */
  async deleteEntity(tenantDB: TenantDatabase, id: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const entity = await softDeleteInTenantSchema<Entity>(tenantDB, this.tableName, id);
    return !!entity;
  }
}

export const entityService = new EntityService();
```

### 3.2 Template de Controller

```typescript
// src/controllers/entityController.ts
import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { entityService } from '../services/entityService';

const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // ... outros campos com validação Zod
  tags: z.array(z.string()).default([]),
  status: z.string().default('active')
});

const updateEntitySchema = createEntitySchema.partial();

export class EntityController {
  async getEntities(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await entityService.getEntities(req.tenantDB, filters);
      res.json(result);
    } catch (error) {
      console.error('[EntityController] Get entities error:', error);
      res.status(500).json({
        error: 'Failed to fetch entities',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createEntity(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validação com Zod
      const validatedData = createEntitySchema.parse(req.body);
      
      // Criação no banco
      const entity = await entityService.createEntity(
        req.tenantDB,
        validatedData,
        req.user.id
      );

      res.status(201).json({
        message: 'Entity created successfully',
        entity
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }
      
      console.error('[EntityController] Create entity error:', error);
      res.status(400).json({
        error: 'Failed to create entity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateEntity(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateEntitySchema.parse(req.body);
      
      const entity = await entityService.updateEntity(req.tenantDB, id, validatedData);
      
      res.json({
        message: 'Entity updated successfully',
        entity
      });
    } catch (error) {
      console.error('[EntityController] Update entity error:', error);
      res.status(400).json({
        error: 'Failed to update entity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteEntity(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      await entityService.deleteEntity(req.tenantDB, id);
      
      res.json({ message: 'Entity deleted successfully' });
    } catch (error) {
      console.error('[EntityController] Delete entity error:', error);
      res.status(400).json({
        error: 'Failed to delete entity',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const entityController = new EntityController();
```

### 3.3 Template de Routes

```typescript
// src/routes/entity.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant-isolation';
import { entityController } from '../controllers/entityController';

const router = Router();

// ✅ Middleware de autenticação e isolamento multi-tenant
router.use(authenticateToken);
router.use(validateTenantAccess);

// CRUD endpoints
router.get('/', (req, res) => entityController.getEntities(req as any, res));
router.get('/:id', (req, res) => entityController.getEntity(req as any, res));
router.post('/', (req, res) => entityController.createEntity(req as any, res));
router.put('/:id', (req, res) => entityController.updateEntity(req as any, res));
router.delete('/:id', (req, res) => entityController.deleteEntity(req as any, res));

export default router;
```

---

## 🎨 4. ESTRUTURA FRONTEND

### 4.1 Hook Customizado (React Query)

```typescript
// client/hooks/useEntities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/apiInterceptor';

interface Entity {
  id: string;
  name: string;
  // ... outros campos
}

export function useEntities() {
  const queryClient = useQueryClient();

  // GET - Lista
  const { data, isLoading, error } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data } = await api.get('/api/entities');
      return data;
    }
  });

  // POST - Criar
  const createEntity = useMutation({
    mutationFn: async (entityData: Partial<Entity>) => {
      const { data } = await api.post('/api/entities', entityData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    }
  });

  // PUT - Atualizar
  const updateEntity = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Entity> }) => {
      const response = await api.put(`/api/entities/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    }
  });

  // DELETE - Deletar
  const deleteEntity = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/entities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    }
  });

  return {
    entities: data?.entities || [],
    pagination: data?.pagination,
    isLoading,
    error,
    createEntity,
    updateEntity,
    deleteEntity
  };
}
```

### 4.2 Form Component

```typescript
// client/components/EntityForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const entitySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional(),
  // ... outros campos
});

type EntityFormData = z.infer<typeof entitySchema>;

interface EntityFormProps {
  initialData?: EntityFormData;
  onSubmit: (data: EntityFormData) => void;
  onCancel: () => void;
}

export function EntityForm({ initialData, onSubmit, onCancel }: EntityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: initialData
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nome</label>
        <Input {...register('name')} placeholder="Nome da entidade" />
        {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
```

---

## ✅ 5. CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar `src/services/entityService.ts` com CRUD completo
- [ ] Criar `src/controllers/entityController.ts` com validação Zod
- [ ] Criar `src/routes/entity.ts` com middleware de auth
- [ ] Registrar rotas em `src/app.ts`: `app.use('/api/entities', entityRoutes)`
- [ ] Testar endpoints com dados reais no PostgreSQL
- [ ] Verificar isolamento multi-tenant

### Frontend
- [ ] Criar hook `client/hooks/useEntities.ts` com React Query
- [ ] Criar componente de formulário `client/components/EntityForm.tsx`
- [ ] Criar componente de lista `client/components/EntitiesTable.tsx`
- [ ] Integrar com página principal
- [ ] Usar `api` de `apiInterceptor.ts` (nunca fetch direto!)
- [ ] Testar criação, edição e exclusão no navegador

---

## 🔧 6. TROUBLESHOOTING

### Erro: "Invalid or expired token"
**Causa:** Token não está sendo passado corretamente
**Solução:** Usar `api` de `apiInterceptor.ts` que adiciona o token automaticamente

### Erro: 404 Not Found (path duplication)
**Causa:** Usar `/api/endpoint` com axios que já tem `baseURL: '/api'` resulta em `/api/api/endpoint`
**Solução:** 
```typescript
// ✅ CORRETO
await api.post('/notifications', data);  // baseURL já tem '/api'

// ❌ ERRADO
await api.post('/api/notifications', data);  // Duplica para /api/api/notifications
```

### Erro: "Tenant access denied"
**Causa:** Middleware de tenant não está injetando `req.tenantDB`
**Solução:** Verificar ordem de middlewares: `authenticateToken` → `validateTenantAccess`

### Erro: JSONB parse
**Causa:** Não está fazendo `JSON.stringify()` antes de inserir
**Solução:** `tags: JSON.stringify(data.tags)` no service

### IDs não estão sendo gerados
**Causa:** Falta `DEFAULT gen_random_uuid()` na criação da tabela
**Solução:** Adicionar `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`

---

## 📝 CONCLUSÃO

Este padrão garante:
✅ Isolamento multi-tenant perfeito
✅ Autenticação segura com tokens
✅ Tipos de dados corretos (CAST adequados)
✅ IDs gerados automaticamente pelo PostgreSQL
✅ Sem dados mock - tudo real no banco
✅ Performance otimizada com índices

**Autor:** Sistema HABEA DESK  
**Data:** Outubro 2025  
**Baseado em:** Módulo CRM > Clientes (implementação de referência)
