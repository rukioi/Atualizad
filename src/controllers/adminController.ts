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
            const users = await database.prisma.user.findMany({
              where: { tenantId: tenant.id, isActive: true }
            });
            userCount = users.length;
          } catch (userCountError) {
            console.warn(`Error counting users for tenant ${tenant.id}:`, userCountError);
          }

          try {
            // First check if schema exists before querying
            const { TenantDatabase } = await import('../config/database');
            const tenantDB = new TenantDatabase(tenant.id);
            
            const schemaCheckQuery = `
              SELECT EXISTS(
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = $1
              ) as schema_exists
            `;
            
            const schemaCheck = await tenantDB.query(schemaCheckQuery, [tenant.schemaName]);
            
            if (schemaCheck?.rows?.[0]?.schema_exists) {
              // Only query stats if schema exists
              const statsQuery = `
                SELECT 
                  COALESCE((SELECT COUNT(*) FROM ${tenant.schemaName}.clients WHERE is_active = true), 0) as clients,
                  COALESCE((SELECT COUNT(*) FROM ${tenant.schemaName}.projects WHERE is_active = true), 0) as projects,
                  COALESCE((SELECT COUNT(*) FROM ${tenant.schemaName}.tasks WHERE is_active = true), 0) as tasks,
                  COALESCE((SELECT COUNT(*) FROM ${tenant.schemaName}.transactions WHERE is_active = true), 0) as transactions,
                  COALESCE((SELECT COUNT(*) FROM ${tenant.schemaName}.invoices WHERE is_active = true), 0) as invoices
              `;

              const result = await tenantDB.query(statsQuery);

              if (result && result.rows && result.rows[0]) {
                stats = {
                  clients: parseInt(result.rows[0].clients || '0'),
                  projects: parseInt(result.rows[0].projects || '0'),
                  tasks: parseInt(result.rows[0].tasks || '0'),
                  transactions: parseInt(result.rows[0].transactions || '0'),
                  invoices: parseInt(result.rows[0].invoices || '0'),
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
        // TODO: Implementar criação de schema para tenant
        console.log(`Schema should be created for tenant: ${tenant.schemaName}`);
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

      // TODO: Implementar atualização real do status do tenant
      const updatedTenant = await database.toggleTenantStatus(id, isActive);

      res.json({
        message: 'Tenant status updated successfully',
        tenant: updatedTenant,
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
}

export const adminController = new AdminController();