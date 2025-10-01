/**
 * PUBLICATIONS SERVICE - Gestão de Publicações Jurídicas
 * =======================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ ISOLAMENTO POR USUÁRIO: Publicações são isoladas por usuário (diferente de outros módulos)
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
 */

import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

export interface Publication {
  id: string;
  user_id: string;
  oab_number: string;
  process_number?: string;
  publication_date: string;
  content: string;
  source: 'CNJ-DATAJUD' | 'Codilo' | 'JusBrasil';
  external_id?: string;
  status: 'novo' | 'lido' | 'arquivado';
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreatePublicationData {
  oabNumber: string;
  processNumber?: string;
  publicationDate: string;
  content: string;
  source: 'CNJ-DATAJUD' | 'Codilo' | 'JusBrasil';
  externalId?: string;
  status?: 'novo' | 'lido' | 'arquivado';
}

export interface UpdatePublicationData extends Partial<CreatePublicationData> {}

export interface PublicationFilters {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class PublicationsService {
  private tableName = 'publications';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        oab_number VARCHAR NOT NULL,
        process_number VARCHAR,
        publication_date DATE NOT NULL,
        content TEXT NOT NULL,
        source VARCHAR NOT NULL CHECK (source IN ('CNJ-DATAJUD', 'Codilo', 'JusBrasil')),
        external_id VARCHAR,
        status VARCHAR DEFAULT 'novo' CHECK (status IN ('novo', 'lido', 'arquivado')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(user_id, external_id)
      )
    `;
    
    await queryTenantSchema(tenantDB, createTableQuery);
    
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON \${schema}.${this.tableName}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_oab_number ON \${schema}.${this.tableName}(oab_number)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_source ON \${schema}.${this.tableName}(source)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date ON \${schema}.${this.tableName}(publication_date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca publicações do usuário (isolamento por usuário)
   */
  async getPublications(tenantDB: TenantDatabase, userId: string, filters: PublicationFilters = {}): Promise<{
    publications: Publication[];
    pagination: any;
  }> {
    await this.ensureTables(tenantDB);
    
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;
    
    let whereConditions = ['is_active = TRUE', 'user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }
    
    if (filters.source) {
      whereConditions.push(`source = $${paramIndex}`);
      queryParams.push(filters.source);
      paramIndex++;
    }
    
    if (filters.search) {
      whereConditions.push(`(content ILIKE $${paramIndex} OR process_number ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    if (filters.dateFrom) {
      whereConditions.push(`publication_date >= $${paramIndex}`);
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }
    
    if (filters.dateTo) {
      whereConditions.push(`publication_date <= $${paramIndex}`);
      queryParams.push(filters.dateTo);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const publicationsQuery = `
      SELECT * FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY publication_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `SELECT COUNT(*) as total FROM \${schema}.${this.tableName} ${whereClause}`;
    
    const [publications, countResult] = await Promise.all([
      queryTenantSchema<Publication>(tenantDB, publicationsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      publications,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  /**
   * Busca publicação por ID (com validação de usuário)
   */
  async getPublicationById(tenantDB: TenantDatabase, userId: string, publicationId: string): Promise<Publication | null> {
    await this.ensureTables(tenantDB);
    
    const query = `
      SELECT * FROM \${schema}.${this.tableName}
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema<Publication>(tenantDB, query, [publicationId, userId]);
    return result[0] || null;
  }

  /**
   * Cria nova publicação
   */
  async createPublication(tenantDB: TenantDatabase, userId: string, publicationData: CreatePublicationData): Promise<Publication> {
    await this.ensureTables(tenantDB);
    
    const publicationId = `publication_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const data = {
      id: publicationId,
      user_id: userId,
      oab_number: publicationData.oabNumber,
      process_number: publicationData.processNumber || null,
      publication_date: publicationData.publicationDate,
      content: publicationData.content,
      source: publicationData.source,
      external_id: publicationData.externalId || null,
      status: publicationData.status || 'novo'
    };
    
    return await insertInTenantSchema<Publication>(tenantDB, this.tableName, data);
  }

  /**
   * Atualiza publicação (só do próprio usuário)
   */
  async updatePublication(tenantDB: TenantDatabase, userId: string, publicationId: string, updateData: UpdatePublicationData): Promise<Publication | null> {
    await this.ensureTables(tenantDB);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        status = COALESCE($3, status),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
      RETURNING *
    `;
    
    const result = await queryTenantSchema<Publication>(tenantDB, query, [publicationId, userId, updateData.status]);
    return result[0] || null;
  }

  /**
   * Remove publicação (soft delete - só do próprio usuário)
   */
  async deletePublication(tenantDB: TenantDatabase, userId: string, publicationId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema(tenantDB, query, [publicationId, userId]);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas das publicações do usuário
   */
  async getPublicationsStats(tenantDB: TenantDatabase, userId: string): Promise<{
    total: number;
    novo: number;
    lido: number;
    arquivado: number;
    thisMonth: number;
  }> {
    await this.ensureTables(tenantDB);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'novo') as novo,
        COUNT(*) FILTER (WHERE status = 'lido') as lido,
        COUNT(*) FILTER (WHERE status = 'arquivado') as arquivado,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month
      FROM \${schema}.${this.tableName}
      WHERE user_id = $1 AND is_active = TRUE
    `;
    
    const result = await queryTenantSchema<any>(tenantDB, query, [userId]);
    const stats = result[0];
    
    return {
      total: parseInt(stats.total || '0'),
      novo: parseInt(stats.novo || '0'),
      lido: parseInt(stats.lido || '0'),
      arquivado: parseInt(stats.arquivado || '0'),
      thisMonth: parseInt(stats.this_month || '0')
    };
  }
}

export const publicationsService = new PublicationsService();
