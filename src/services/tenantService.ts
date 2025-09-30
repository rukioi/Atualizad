import { database, TenantDatabase } from '../config/database';

export class TenantService {
  async createTenant(name: string): Promise<string> {
    const tenantData = {
      name,
      schemaName: `tenant_${Date.now()}`,
      isActive: true,
      planType: 'basic',
      maxUsers: 5,
      maxStorage: 1073741824, // 1GB
    };

    const tenant = await database.createTenant(tenantData);
    return tenant.id;
  }

  async getTenantDatabase(tenantId: string): Promise<TenantDatabase> {
    return new TenantDatabase(tenantId);
  }

  async getAllTenants() {
    return await database.getAllTenants();
  }

  async updateTenant(id: string, updateData: any) {
    return await database.updateTenant(id, updateData);
  }

  async deleteTenant(id: string) {
    return await database.deleteTenant(id);
  }

  async getTenantStats(tenantId: string) {
    try {
      const tenantDB = await this.getTenantDatabase(tenantId);
      
      // TODO: Implementar quando esquema de tenant estiver criado
      // Por enquanto, retornar estatísticas zeradas
      // Quando implementar: validar schemaName e fazer query segura
    } catch (error) {
      console.warn(`Error fetching tenant stats for ${tenantId}:`, error);
    }
    
    // Fallback para stats zerados se houver erro
    return {
      clients: 0,
      projects: 0,
      tasks: 0,
      transactions: 0,
      invoices: 0,
    };
  }
}

export const tenantService = new TenantService();