
/**
 * PUBLICATIONS SERVICE - GESTÃO DE PUBLICAÇÕES
 * ===========================================
 * 
 * Serviço responsável por operações de banco de dados relacionadas às publicações jurídicas.
 * NOTA: Este módulo tem isolamento POR USUÁRIO (diferente dos outros módulos)
 */

import { tenantDB } from './tenantDatabase';

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
  async initializeTables(tenantId: string): Promise<void> {
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
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_user_id ON \${schema}.${this.tableName}(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_oab_number ON \${schema}.${this.tableName}(oab_number)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_source ON \${schema}.${this.tableName}(source)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date ON \${schema}.${this.tableName}(publication_date)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  /**
   * Busca publicações do usuário (isolamento por usuário)
   */
  async getPublications(tenantId: string, userId: string, filters: PublicationFilters = {}): Promise<{
    publications: Publication[];
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
    
    let whereConditions = ['is_active = TRUE', 'user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;
    
    // Filtros específicos
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
      SELECT 
        id, user_id, oab_number, process_number, publication_date, content,
        source, external_id, status, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY publication_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      ${whereClause}
    `;
    
    const [publications, countResult] = await Promise.all([
      tenantDB.executeInTenantSchema<Publication>(tenantId, publicationsQuery, [...queryParams, limit, offset]),
      tenantDB.executeInTenantSchema<{total: string}>(tenantId, countQuery, queryParams)
    ]);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return {
      publications,
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
   * Busca publicação por ID (com validação de usuário)
   */
  async getPublicationById(tenantId: string, userId: string, publicationId: string): Promise<Publication | null> {
    await this.initializeTables(tenantId);
    
    const query = `
      SELECT 
        id, user_id, oab_number, process_number, publication_date, content,
        source, external_id, status, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema<Publication>(tenantId, query, [publicationId, userId]);
    return result[0] || null;
  }

  /**
   * Cria nova publicação
   */
  async createPublication(tenantId: string, userId: string, publicationData: CreatePublicationData): Promise<Publication> {
    await this.initializeTables(tenantId);
    
    const publicationId = `publication_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const query = `
      INSERT INTO \${schema}.${this.tableName} (
        id, user_id, oab_number, process_number, publication_date, content,
        source, external_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING 
        id, user_id, oab_number, process_number, publication_date, content,
        source, external_id, status, created_at, updated_at, is_active
    `;
    
    const params = [
      publicationId,
      userId,
      publicationData.oabNumber,
      publicationData.processNumber || null,
      publicationData.publicationDate,
      publicationData.content,
      publicationData.source,
      publicationData.externalId || null,
      publicationData.status || 'novo'
    ];
    
    const result = await tenantDB.executeInTenantSchema<Publication>(tenantId, query, params);
    return result[0];
  }

  /**
   * Atualiza publicação (só do próprio usuário)
   */
  async updatePublication(tenantId: string, userId: string, publicationId: string, updateData: UpdatePublicationData): Promise<Publication | null> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET 
        status = COALESCE($3, status),
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
      RETURNING 
        id, user_id, oab_number, process_number, publication_date, content,
        source, external_id, status, created_at, updated_at, is_active
    `;
    
    const result = await tenantDB.executeInTenantSchema<Publication>(tenantId, query, [publicationId, userId, updateData.status]);
    return result[0] || null;
  }

  /**
   * Exclui publicação (soft delete - só do próprio usuário)
   */
  async deletePublication(tenantId: string, userId: string, publicationId: string): Promise<boolean> {
    await this.initializeTables(tenantId);
    
    const query = `
      UPDATE \${schema}.${this.tableName}
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_active = TRUE
    `;
    
    const result = await tenantDB.executeInTenantSchema(tenantId, query, [publicationId, userId]);
    return result.length > 0;
  }

  /**
   * Obtém estatísticas das publicações do usuário
   */
  async getPublicationsStats(tenantId: string, userId: string): Promise<{
    total: number;
    novo: number;
    lido: number;
    arquivado: number;
    thisMonth: number;
  }> {
    await this.initializeTables(tenantId);
    
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
    
    const result = await tenantDB.executeInTenantSchema<any>(tenantId, query, [userId]);
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
