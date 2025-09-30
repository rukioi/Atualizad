/**
 * CLIENTS SERVICE - GESTÃO DE CLIENTES
 * ===================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas aos clientes.
 * Substitui os dados mock por operações reais com PostgreSQL usando isolamento por tenant.
 */

import { tenantDB } from './tenantDatabase';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status: 'active' | 'inactive' | 'pending';
  tags?: string[];
  notes?: string;
  // Campos legais específicos
  cpf?: string;
  rg?: string;
  professionalTitle?: string;
  maritalStatus?: string;
  birthDate?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateClientData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status?: 'active' | 'inactive' | 'pending';
  tags?: string[];
  notes?: string;
  cpf?: string;
  rg?: string;
  professionalTitle?: string;
  maritalStatus?: string;
  birthDate?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  tags?: string[];
}

export class ClientsService {
  private tableName = 'clients';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  async initializeTables(tenantId: string): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY DEFAULT 'client_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTR(md5(random()::text), 1, 8),
        name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        phone VARCHAR,
        organization VARCHAR,
        address JSONB DEFAULT '{}',
        budget DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR DEFAULT 'active',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        cpf VARCHAR,
        rg VARCHAR,
        professional_title VARCHAR,
        marital_status VARCHAR,
        birth_date DATE,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices para performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON \${schema}.${this.tableName}(name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_email ON \${schema}.${this.tableName}(email)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  /**
   * Busca clientes com filtros e paginação
   */
  async getClients(tenantId: string, filters: ClientFilters = {}): Promise<{
    clients: Client[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    await this.initializeTables(tenantId);
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE'];
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    // Filtro por status
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    // Filtro por busca (nome ou email)
    if (filters.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    // Filtro por tags
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Query para buscar clientes
    const clientsQuery = `
      SELECT 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const [clients, countResult] = await Promise.all([
      tenantDB.executeInTenantSchema<Client>(tenantId, clientsQuery, [...queryParams, limit, offset]),
      tenantDB.executeInTenantSchema<{total: string}>(tenantId, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Busca um cliente por ID
   */
  async getClientById(tenantId: string, clientId: string): Promise<Client | null> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<Client>(tenantId, query, [clientId]);
    return result[0] || null;
  }

  /**
   * Cria um novo cliente
   */
  async createClient(tenantId: string, clientData: CreateClientData, createdBy: string): Promise<Client> {
    await this.initializeTables(tenantId);
    
    // Gerar ID único seguindo o mesmo padrão do tasksService
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const query = `
      INSERT INTO \${schema}.${this.tableName} (
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12
      )
      RETURNING 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
    `;
    
    const params = [
      clientId,
      clientData.name,
      clientData.email,
      clientData.phone || null,
      clientData.organization || null,
      JSON.stringify(clientData.address || {}),
      clientData.budget || null,
      clientData.currency || 'BRL',
      clientData.status || 'active',
      JSON.stringify(clientData.tags || []),
      clientData.notes || null,
      createdBy
    ];
    
    const result = await tenantDB.executeInTenantSchema<Client>(tenantId, query, params);
    return result[0];
  }

  /**
   * Atualiza um cliente existente
   */
  async updateClient(tenantId: string, clientId: string, updateData: UpdateClientData): Promise<Client | null> {
    await this.initializeTables(tenantId);
    
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Mapeamento dos campos para atualização
    const fieldMappings = {
      name: 'name',
      email: 'email', 
      phone: 'phone',
      organization: 'organization',
      address: 'address',
      budget: 'budget',
      currency: 'currency',
      status: 'status',
      tags: 'tags',
      notes: 'notes',
      cpf: 'cpf',
      rg: 'rg',
      professionalTitle: 'professional_title',
      maritalStatus: 'marital_status',
      birthDate: 'birth_date'
    };
    
    for (const [key, dbField] of Object.entries(fieldMappings)) {
      if (updateData.hasOwnProperty(key)) {
        const value = (updateData as any)[key];
        if (key === 'address' || key === 'tags') {
          updateFields.push(`${dbField} = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Adicionar updated_at
    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND is_active = TRUE
      RETURNING 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
    `;
    
    params.push(clientId);
    
    const result = await tenantDB.executeInTenantSchema<Client>(tenantId, query, params);
    return result[0] || null;
  }

  /**
   * Exclui um cliente (soft delete)
   */
  async deleteClient(tenantId: string, clientId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [clientId]);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas dos clientes
   */
  async getClientsStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    thisMonth: number;
  }> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<any>(tenantId, query);
    const stats = result[0];
    
    return {
      total: parseInt(stats.total || '0'),
      active: parseInt(stats.active || '0'),
      inactive: parseInt(stats.inactive || '0'),
      pending: parseInt(stats.pending || '0'),
      thisMonth: parseInt(stats.this_month || '0')
    };
  }
}

export const clientsService = new ClientsService();