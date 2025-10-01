/**
 * CLIENTS SERVICE - Gestão de Clientes
 * ===================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas aos clientes.
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers para garantir isolamento por schema
 * ✅ SEM DADOS MOCK: Todas as operações são feitas diretamente no PostgreSQL
 * 
 * @see src/utils/tenantHelpers.ts - Helpers de isolamento (queryTenantSchema, insertInTenantSchema, etc.)
 * @see src/config/database.ts - TenantDatabase para executar queries no schema correto
 */

import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

// ============================================================================
// INTERFACES
// ============================================================================

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
  mobile?: string;
  phone?: string;
  organization?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  zipCode?: string;
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  level?: string;
  status?: 'active' | 'inactive' | 'pending';
  tags?: string[];
  notes?: string;
  description?: string;
  cpf?: string;
  rg?: string;
  pis?: string;
  cei?: string;
  professionalTitle?: string;
  maritalStatus?: string;
  birthDate?: string;
  inssStatus?: string;
  amountPaid?: number;
  referredBy?: string;
  registeredBy?: string;
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  tags?: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ClientsService {
  private tableName = 'clients';

  /**
   * Cria as tabelas necessárias se não existirem
   * IMPORTANTE: Tabela criada automaticamente no schema do tenant via ${schema} placeholder
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
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
        level VARCHAR,
        status VARCHAR DEFAULT 'active',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        description TEXT,
        cpf VARCHAR,
        rg VARCHAR,
        pis VARCHAR,
        cei VARCHAR,
        professional_title VARCHAR,
        marital_status VARCHAR,
        birth_date DATE,
        inss_status VARCHAR,
        amount_paid DECIMAL(15,2),
        referred_by VARCHAR,
        registered_by VARCHAR,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    // Criar índices para performance otimizada
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_name ON \${schema}.${this.tableName}(name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_email ON \${schema}.${this.tableName}(email)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca clientes com filtros e paginação
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   * @param filters - Filtros de busca e paginação
   */
  async getClients(tenantDB: TenantDatabase, filters: ClientFilters = {}): Promise<{
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
    await this.ensureTables(tenantDB);
    
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
    
    // Filtro por tags (PostgreSQL JSONB array contains)
    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // ✅ ISOLAMENTO: Query executada no schema correto via ${schema} placeholder
    const clientsQuery = `
      SELECT 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    // Executar queries em paralelo para otimização
    const [clients, countResult] = await Promise.all([
      queryTenantSchema<Client>(tenantDB, clientsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
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
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   * @param clientId - ID do cliente
   */
  async getClientById(tenantDB: TenantDatabase, clientId: string): Promise<Client | null> {
    await this.ensureTables(tenantDB);
    
    // ✅ ISOLAMENTO: Query no schema correto
    const query = `
      SELECT 
        id, name, email, phone, organization, address, budget, currency,
        status, tags, notes, created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema<Client>(tenantDB, query, [clientId]);
    return result[0] || null;
  }

  /**
   * Cria um novo cliente
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   * @param clientData - Dados do cliente
   * @param createdBy - ID do usuário que criou
   */
  async createClient(tenantDB: TenantDatabase, clientData: CreateClientData, createdBy: string): Promise<Client> {
    await this.ensureTables(tenantDB);
    
    // Gerar ID único
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // ✅ ISOLAMENTO: Inserção no schema correto usando helper
    const data = {
      id: clientId,
      name: clientData.name,
      email: clientData.email,
      phone: clientData.mobile || clientData.phone || null,
      organization: clientData.organization || null,
      address: JSON.stringify({
        street: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        zipCode: clientData.zipCode || '',
        country: clientData.country || 'BR'
      }),
      budget: clientData.budget || null,
      currency: clientData.currency || 'BRL',
      status: clientData.status || 'active',
      tags: JSON.stringify(clientData.tags || []),
      notes: clientData.description || clientData.notes || null,
      cpf: clientData.cpf || null,
      rg: clientData.rg || null,
      professional_title: clientData.professionalTitle || null,
      marital_status: clientData.maritalStatus || null,
      birth_date: clientData.birthDate || null,
      created_by: createdBy
    };
    
    const client = await insertInTenantSchema<Client>(tenantDB, this.tableName, data);
    return client;
  }

  /**
   * Atualiza um cliente existente
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   * @param clientId - ID do cliente
   * @param updateData - Dados para atualizar
   */
  async updateClient(tenantDB: TenantDatabase, clientId: string, updateData: UpdateClientData): Promise<Client | null> {
    await this.ensureTables(tenantDB);
    
    // Preparar dados de atualização (mapear campos camelCase para snake_case)
    const data: Record<string, any> = {};
    
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.email !== undefined) data.email = updateData.email;
    if (updateData.phone !== undefined) data.phone = updateData.phone;
    if (updateData.organization !== undefined) data.organization = updateData.organization;
    if (updateData.address !== undefined) data.address = JSON.stringify(updateData.address);
    if (updateData.budget !== undefined) data.budget = updateData.budget;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.cpf !== undefined) data.cpf = updateData.cpf;
    if (updateData.rg !== undefined) data.rg = updateData.rg;
    if (updateData.professionalTitle !== undefined) data.professional_title = updateData.professionalTitle;
    if (updateData.maritalStatus !== undefined) data.marital_status = updateData.maritalStatus;
    if (updateData.birthDate !== undefined) data.birth_date = updateData.birthDate;
    
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }
    
    // ✅ ISOLAMENTO: Atualização no schema correto usando helper
    const client = await updateInTenantSchema<Client>(tenantDB, this.tableName, clientId, data);
    return client;
  }

  /**
   * Remove um cliente (soft delete)
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   * @param clientId - ID do cliente
   */
  async deleteClient(tenantDB: TenantDatabase, clientId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    
    // ✅ ISOLAMENTO: Soft delete no schema correto usando helper
    const client = await softDeleteInTenantSchema<Client>(tenantDB, this.tableName, clientId);
    return !!client;
  }

  /**
   * Obtém estatísticas dos clientes
   * 
   * @param tenantDB - TenantDatabase injetado via req.tenantDB
   */
  async getClientsStats(tenantDB: TenantDatabase): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    thisMonth: number;
  }> {
    await this.ensureTables(tenantDB);
    
    // ✅ ISOLAMENTO: Query de estatísticas no schema correto
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
    
    const result = await queryTenantSchema<any>(tenantDB, query);
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
