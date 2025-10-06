/**
 * DEALS SERVICE - Pipeline de Vendas (CRM)
 * =========================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas ao pipeline de vendas.
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers para garantir isolamento por schema
 * ✅ SEM DADOS MOCK: Todas as operações são feitas diretamente no PostgreSQL
 * 
 * @see src/utils/tenantHelpers.ts - Helpers de isolamento
 * @see src/config/database.ts - TenantDatabase
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

export interface Deal {
  id: string;
  title: string;
  contactName: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  budget?: number;
  currency: string;
  stage: string;
  tags: string[];
  description?: string;
  clientId?: string;
  created_by: string;
  registered_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateDealData {
  title: string;
  contactName: string;
  organization?: string;
  email?: string;
  phone?: string;
  mobile?: string; // Aceita mobile do frontend mas salva como phone
  address?: string;
  budget?: number;
  currency?: string;
  stage?: string;
  tags?: string[];
  description?: string;
  clientId?: string;
}

export interface UpdateDealData extends Partial<CreateDealData> {}

export interface DealFilters {
  page?: number;
  limit?: number;
  stage?: string;
  search?: string;
  tags?: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DealsService {
  private tableName = 'deals';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        contact_name VARCHAR NOT NULL,
        organization VARCHAR,
        email VARCHAR,
        phone VARCHAR,
        address TEXT,
        budget DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'BRL',
        stage VARCHAR DEFAULT 'contacted',
        tags JSONB DEFAULT '[]',
        description TEXT,
        client_id UUID,
        created_by VARCHAR NOT NULL,
        registered_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    // Adicionar coluna registered_by se não existir (para tabelas já criadas)
    try {
      await queryTenantSchema(tenantDB, `
        ALTER TABLE \${schema}.${this.tableName}
        ADD COLUMN IF NOT EXISTS registered_by VARCHAR
      `);
    } catch (error) {
      // Ignorar erro se a coluna já existir
      console.log('Column registered_by may already exist');
    }
    
    // Criar índices para performance
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_stage ON \${schema}.${this.tableName}(stage)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_contact_name ON \${schema}.${this.tableName}(contact_name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON \${schema}.${this.tableName}(created_at DESC)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca deals com filtros e paginação
   */
  async getDeals(tenantDB: TenantDatabase, filters: DealFilters = {}): Promise<{
    deals: Deal[];
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

    // Construir query WHERE
    let whereClause = 'WHERE is_active = TRUE';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.stage) {
      whereClause += ` AND stage = $${paramIndex}`;
      params.push(filters.stage);
      paramIndex++;
    }

    if (filters.search) {
      whereClause += ` AND (
        title ILIKE $${paramIndex} OR
        contact_name ILIKE $${paramIndex} OR
        organization ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause += ` AND tags ?| $${paramIndex}`;
      params.push(filters.tags);
      paramIndex++;
    }

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;

    const countResult = await queryTenantSchema(tenantDB, countQuery, params);
    const total = parseInt(countResult[0]?.total || '0');

    // Query de dados
    const dataQuery = `
      SELECT *
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const deals = await queryTenantSchema(tenantDB, dataQuery, [...params, limit, offset]);

    // Processar tags JSON e garantir registered_by
    const processedDeals = deals.map((deal: any) => ({
      ...deal,
      tags: Array.isArray(deal.tags) ? deal.tags : [],
      registered_by: deal.registered_by || null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      deals: processedDeals,
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
   * Busca deal por ID
   */
  async getDealById(tenantDB: TenantDatabase, id: string): Promise<Deal | null> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT *
      FROM \${schema}.${this.tableName}
      WHERE id = $1::uuid AND is_active = TRUE
    `;

    const result = await queryTenantSchema(tenantDB, query, [id]);
    
    if (!result || result.length === 0) {
      return null;
    }

    const deal = result[0];
    return {
      ...deal,
      tags: Array.isArray(deal.tags) ? deal.tags : [],
      registered_by: deal.registered_by || null
    };
  }

  /**
   * Cria novo deal
   */
  async createDeal(
    tenantDB: TenantDatabase,
    userId: string,
    userName: string,
    data: CreateDealData
  ): Promise<Deal> {
    await this.ensureTables(tenantDB);

    // Normalizar phone (aceita mobile do frontend)
    const phone = data.phone || data.mobile;

    const dealData = {
      title: data.title,
      contact_name: data.contactName,
      organization: data.organization || null,
      email: data.email || null,
      phone: phone || null,
      address: data.address || null,
      budget: data.budget || null,
      currency: data.currency || 'BRL',
      stage: data.stage || 'contacted',
      tags: JSON.stringify(data.tags || []),
      description: data.description || null,
      client_id: data.clientId || null,
      created_by: userId,
      registered_by: userName
    };

    const result = await insertInTenantSchema(tenantDB, this.tableName, dealData);

    return {
      ...result,
      tags: Array.isArray(data.tags) ? data.tags : [],
      registered_by: userName
    };
  }

  /**
   * Atualiza deal
   */
  async updateDeal(
    tenantDB: TenantDatabase,
    id: string,
    data: UpdateDealData
  ): Promise<Deal> {
    await this.ensureTables(tenantDB);

    // Normalizar phone (aceita mobile do frontend)
    const phone = data.phone || data.mobile;

    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.contactName !== undefined) updateData.contact_name = data.contactName;
    if (data.organization !== undefined) updateData.organization = data.organization;
    if (data.email !== undefined) updateData.email = data.email;
    if (phone !== undefined) updateData.phone = phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.clientId !== undefined) updateData.client_id = data.clientId;

    const result = await updateInTenantSchema(tenantDB, this.tableName, id, updateData);

    return {
      ...result,
      tags: Array.isArray(result.tags) ? result.tags : [],
      registered_by: result.registered_by || null
    };
  }

  /**
   * Deleta deal (soft delete)
   */
  async deleteDeal(tenantDB: TenantDatabase, id: string): Promise<void> {
    await this.ensureTables(tenantDB);
    await softDeleteInTenantSchema(tenantDB, this.tableName, id);
  }

  /**
   * Busca deals por estágio (para Kanban)
   */
  async getDealsByStage(tenantDB: TenantDatabase, stage: string): Promise<Deal[]> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT *
      FROM \${schema}.${this.tableName}
      WHERE stage = $1 AND is_active = TRUE
      ORDER BY created_at DESC
    `;

    const deals = await queryTenantSchema(tenantDB, query, [stage]);

    return deals.map((deal: any) => ({
      ...deal,
      tags: Array.isArray(deal.tags) ? deal.tags : [],
      registered_by: deal.registered_by || null
    }));
  }

  /**
   * Move deal para outro estágio
   */
  async moveDealToStage(
    tenantDB: TenantDatabase,
    id: string,
    newStage: string
  ): Promise<Deal> {
    return this.updateDeal(tenantDB, id, { stage: newStage });
  }
}

export const dealsService = new DealsService();
