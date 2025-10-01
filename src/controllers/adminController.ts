import { Request, Response } from 'express';
import { z } from 'zod';
import { database } from '../config/database';

// Validation schemas
const createKeySchema = z.object({
  tenantId: z.string().uuid().optional(),
  accountType: z.enum(['SIMPLES', 'COMPOSTA', 'GERENCIAL']),
  usesAllowed: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  singleUse: z.boolean().optional(),
  metadata: z.any().optional(),
});

const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  planType: z.string().default('basic'),
  maxUsers: z.number().min(1).default(5),
  maxStorage: z.number().min(1).default(1073741824), // 1GB
});

export class AdminController {
  // Registration Keys Management
  async createRegistrationKey(req: Request, res: Response) {
    try {
      console.log('Creating registration key with data:', req.body);

      const createKeySchema = z.object({
        tenantId: z.string().uuid('TenantId is required and must be a valid UUID'),
        accountType: z.enum(['SIMPLES', 'COMPOSTA', 'GERENCIAL'], {
          errorMap: () => ({ message: 'Account type must be SIMPLES, COMPOSTA, or GERENCIAL' })
        }),
        usesAllowed: z.number().int().min(1).optional().default(1),
        expiresAt: z.string().datetime().optional(),
        singleUse: z.boolean().optional().default(true),
      });

      const validatedData = createKeySchema.parse(req.body);
      console.log('Validated data:', validatedData);

      // Verificar se o tenant existe e está ativo
      const tenants = await database.getAllTenants();
      const tenant = tenants.rows.find(t => t.id === validatedData.tenantId);
      
      if (!tenant) {
        console.error('Tenant not found:', validatedData.tenantId);
        return res.status(400).json({
          error: 'Invalid tenant',
          message: 'The specified tenant does not exist',
        });
      }

      if (!tenant.isActive) {
        console.error('Tenant is inactive:', validatedData.tenantId);
        return res.status(400).json({
          error: 'Inactive tenant',
          message: 'Cannot create registration keys for inactive tenants',
        });
      }

      const { registrationKeyService } = await import('../services/registrationKeyService');
      const key = await registrationKeyService.generateKey({
        tenantId: validatedData.tenantId,
        accountType: validatedData.accountType,
        usesAllowed: validatedData.usesAllowed || 1,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        singleUse: validatedData.singleUse ?? true,
      }, 'admin');

      console.log('Registration key created successfully:', key);

      res.status(201).json({
        message: 'Registration key created successfully',
        key, // Return the plain key only once
        data: {
          key,
          accountType: validatedData.accountType,
          usesAllowed: validatedData.usesAllowed || 1,
          singleUse: validatedData.singleUse ?? true,
          expiresAt: validatedData.expiresAt,
          tenantId: validatedData.tenantId,
        },
      });
    } catch (error) {
      console.error('Create registration key error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to create registration key',
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  async getRegistrationKeys(req: Request, res: Response) {
    try {
      const tenantId = req.query.tenantId as string;

      const { registrationKeyService } = await import('../services/registrationKeyService');
      const keys = await registrationKeyService.listKeys(tenantId);

      // Transform the data to match the expected format
      const formattedKeys = keys.map(key => ({
        id: key.id,
        key: '***HIDDEN***', // Never return the actual key
        accountType: key.account_type,
        isUsed: key.uses_left === 0,
        isRevoked: key.revoked,
        usedBy: key.used_logs ? JSON.parse(key.used_logs)[0]?.email : null,
        usedAt: key.used_logs ? JSON.parse(key.used_logs)[0]?.usedAt : null,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        usesAllowed: key.uses_allowed,
        usesLeft: key.uses_left,
      }));

      res.json(formattedKeys);
    } catch (error) {
      console.error('Get registration keys error:', error);
      res.status(500).json({
        error: 'Failed to fetch registration keys',
      });
    }
  }

  async revokeRegistrationKey(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: 'Registration key ID is required',
        });
      }

      const { registrationKeyService } = await import('../services/registrationKeyService');
      await registrationKeyService.revokeKey(id);

      res.json({
        message: 'Registration key revoked successfully',
      });
    } catch (error) {
      console.error('Revoke registration key error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to revoke registration key',
      });
    }
  }

  // Tenant Management
  async getTenants(req: Request, res: Response) {
    try {
      const tenants = await database.getAllTenants();

      // Buscar estatísticas de cada tenant
      const tenantsWithStats = await Promise.all(
        tenants.rows.map(async (tenant: any) => {
          let stats = {
            clients: 0,
            projects: 0,
            tasks: 0,
            transactions: 0,
            invoices: 0,
          };

          // Count users for this tenant
          let userCount = 0;
          try {
            const { prisma } = await import('../config/database');
            const users = await prisma.user.findMany({
              where: { tenantId: tenant.id, isActive: true }
            });
            userCount = users.length;
            console.log(`Tenant ${tenant.id} (${tenant.name}) has ${userCount} users`);
          } catch (userCountError) {
            console.warn(`Error counting users for tenant ${tenant.id}:`, userCountError);
          }

          try {
            // First check if schema exists before querying
            const { prisma } = await import('../config/database');
            
            const schemaCheckQuery = `
              SELECT EXISTS(
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = $1
              ) as schema_exists
            `;
            
            const schemaCheckResult = await prisma.$queryRawUnsafe(schemaCheckQuery, tenant.schemaName);
            const schemaExists = schemaCheckResult?.[0]?.schema_exists;
            
            if (schemaExists) {
              // Only query stats if schema exists
              const statsQuery = `
                SELECT 
                  COALESCE((SELECT COUNT(*) FROM "${tenant.schemaName}".clients WHERE is_active = true), 0)::int as clients,
                  COALESCE((SELECT COUNT(*) FROM "${tenant.schemaName}".projects WHERE is_active = true), 0)::int as projects,
                  COALESCE((SELECT COUNT(*) FROM "${tenant.schemaName}".tasks WHERE is_active = true), 0)::int as tasks,
                  COALESCE((SELECT COUNT(*) FROM "${tenant.schemaName}".transactions WHERE is_active = true), 0)::int as transactions,
                  COALESCE((SELECT COUNT(*) FROM "${tenant.schemaName}".invoices WHERE is_active = true), 0)::int as invoices
              `;

              const result = await prisma.$queryRawUnsafe(statsQuery);

              if (result && result[0]) {
                stats = {
                  clients: result[0].clients || 0,
                  projects: result[0].projects || 0,
                  tasks: result[0].tasks || 0,
                  transactions: result[0].transactions || 0,
                  invoices: result[0].invoices || 0,
                };
              }
            }
          } catch (statsError) {
            console.warn(`Error fetching stats for tenant ${tenant.id}:`, statsError);
            // Manter stats zerados se houver erro
          }

          return {
            id: tenant.id,
            name: tenant.name,
            schemaName: tenant.schemaName,
            planType: tenant.planType,
            isActive: tenant.isActive,
            maxUsers: tenant.maxUsers,
            userCount: userCount,
            createdAt: tenant.createdAt,
            stats,
          };
        })
      );

      res.json({ tenants: tenantsWithStats });
    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({
        error: 'Failed to fetch tenants',
      });
    }
  }

  async createTenant(req: Request, res: Response) {
    try {
      const validatedData = createTenantSchema.parse(req.body);

      // Gerar schema name único
      const schemaName = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Criar tenant no banco
      const tenantData = {
        name: validatedData.name,
        schemaName: schemaName,
        planType: validatedData.planType || 'basic',
        isActive: true,
        maxUsers: validatedData.maxUsers || 5,
        maxStorage: validatedData.maxStorage || 1073741824, // 1GB
      };

      const tenant = await database.createTenant(tenantData);

      // Criar schema e tabelas para o tenant
      try {
        console.log(`Creating schema for tenant: ${tenant.schemaName}`);
        await this.createTenantSchema(tenant.id, tenant.schemaName);
        console.log(`Schema created successfully for tenant: ${tenant.schemaName}`);
      } catch (schemaError) {
        console.error('Error creating tenant schema:', schemaError);
        // Se falhou ao criar schema, remover o tenant criado
        await database.deleteTenant(tenant.id);
        throw new Error('Failed to create tenant schema');
      }

      res.status(201).json({
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          schemaName: tenant.schemaName,
          planType: tenant.planType,
          isActive: tenant.isActive,
          maxUsers: tenant.maxUsers,
          userCount: 0,
          createdAt: tenant.createdAt,
          stats: {
            clients: 0,
            projects: 0,
            tasks: 0,
            transactions: 0,
            invoices: 0,
          },
        },
      });
    } catch (error) {
      console.error('Create tenant error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create tenant',
      });
    }
  }

  async deleteTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // TODO: Implementar exclusão real do tenant e seu schema
      await database.deleteTenant(id);

      res.json({
        message: 'Tenant deleted successfully',
      });
    } catch (error) {
      console.error('Delete tenant error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete tenant',
      });
    }
  }

  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // TODO: Implementar atualização real do tenant
      const updatedTenant = await database.updateTenant(id, updateData);

      res.json({
        message: 'Tenant updated successfully',
        tenant: updatedTenant,
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update tenant',
      });
    }
  }

  async toggleTenantStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      console.log(`Toggling tenant status for ${id} to ${isActive}`);

      // Validar se o tenant existe
      const tenants = await database.getAllTenants();
      const tenant = tenants.rows.find((t: any) => t.id === id);
      
      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant not found',
        });
      }

      // Atualizar status do tenant
      const updatedTenant = await database.updateTenant(id, { isActive });

      console.log(`Tenant ${id} status updated to ${isActive}`);

      // Converter BigInt para string para evitar erro de serialização
      const cleanTenant = {
        id: updatedTenant.id,
        name: updatedTenant.name,
        schemaName: updatedTenant.schemaName,
        planType: updatedTenant.planType,
        isActive: updatedTenant.isActive,
        maxUsers: Number(updatedTenant.maxUsers),
        userCount: 0,
        createdAt: updatedTenant.createdAt,
        stats: {
          clients: 0,
          projects: 0,
          tasks: 0,
          transactions: 0,
          invoices: 0,
        },
      };

      res.json({
        message: 'Tenant status updated successfully',
        tenant: cleanTenant,
      });
    } catch (error) {
      console.error('Toggle tenant status error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to toggle tenant status',
      });
    }
  }

  // Global Metrics
  async getGlobalMetrics(req: Request, res: Response) {
    try {
      // Métricas reais do banco
      const [tenants, users, registrationKeys] = await Promise.all([
        database.getAllTenants(),
        database.getAllUsers(),
        database.getAllRegistrationKeys()
      ]);

      // Contar tenants ativos
      const activeTenants = tenants.rows.filter((t: any) => t.isActive).length;

      // Agrupar chaves de registro por tipo de conta
      const keysByType = registrationKeys.reduce((acc: any, key: any) => {
        const type = key.accountType;
        const existing = acc.find((item: any) => item.accountType === type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ accountType: type, count: 1 });
        }
        return acc;
      }, [] as { accountType: string; count: number }[]);

      // Atividade recente (últimos registros de tenants e usuários)
      const recentActivity = [
        ...tenants.rows.slice(-3).map((tenant: any) => ({
          id: tenant.id,
          level: 'info' as const,
          message: `Tenant "${tenant.name}" created`,
          createdAt: tenant.createdAt,
        })),
        ...users.rows.slice(-3).map((user: any) => ({
          id: user.id,
          level: 'info' as const,
          message: `User "${user.name}" registered`,
          createdAt: user.createdAt,
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

      const metrics = {
        tenants: {
          total: tenants.rows.length,
          active: activeTenants,
        },
        users: {
          total: users.rows.length,
        },
        registrationKeys: keysByType,
        recentActivity,
      };

      res.json(metrics);
    } catch (error) {
      console.error('Get global metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch global metrics',
      });
    }
  }

  // Helper method to create tenant schema
  private async createTenantSchema(tenantId: string, schemaName: string) {
    try {
      const { prisma } = await import('../config/database');
      
      // Create schema
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      console.log(`Schema ${schemaName} created successfully`);

      // Create tables in the tenant schema
      const createTablesSQL = `
        -- Clients table
        CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          cpf_cnpj VARCHAR(20),
          address TEXT,
          notes TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS "${schemaName}".projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          client_id UUID,
          status VARCHAR(50) DEFAULT 'proposal',
          priority VARCHAR(20) DEFAULT 'medium',
          progress INTEGER DEFAULT 0,
          estimated_value DECIMAL(12,2),
          start_date DATE,
          end_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tasks table
        CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          project_id UUID,
          assigned_to VARCHAR(255),
          status VARCHAR(50) DEFAULT 'not_started',
          priority VARCHAR(20) DEFAULT 'medium',
          due_date DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Transactions table
        CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
          category VARCHAR(100),
          date DATE NOT NULL,
          project_id UUID,
          client_id UUID,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Invoices table
        CREATE TABLE IF NOT EXISTS "${schemaName}".invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          number VARCHAR(50) NOT NULL,
          client_id UUID,
          project_id UUID,
          amount DECIMAL(12,2) NOT NULL,
          due_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await prisma.$executeRawUnsafe(createTablesSQL);
      console.log(`Tables created successfully in schema ${schemaName}`);

    } catch (error) {
      console.error(`Error creating schema ${schemaName}:`, error);
      throw error;
    }
  }
}

export const adminController = new AdminController();