
/**
 * PROJECTS SERVICE - Gestão de Projetos/Negócios (Pipeline)
 * =========================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
 * ✅ ID AUTOMÁTICO: PostgreSQL gen_random_uuid()
 * ✅ CAST EXPLÍCITO: JSONB e DATE fields
 */

import { TenantDatabase } from '../config/database';
import {
  queryTenantSchema,
  insertInTenantSchema,
  updateInTenantSchema,
  softDeleteInTenantSchema
} from '../utils/tenantHelpers';

export interface Project {
  id: string;
  title: string;
  description?: string;
  contact_name: string;
  client_id?: string;
  organization?: string;
  email: string;
  mobile: string;
  address?: string;
  budget?: number;
  currency: 'BRL' | 'USD' | 'EUR';
  stage: 'contacted' | 'proposal' | 'won' | 'lost';
  tags: string[];
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  contactName: string;
  clientId?: string;
  organization?: string;
  email: string;
  mobile: string;
  address?: string;
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  stage?: 'contacted' | 'proposal' | 'won' | 'lost';
  tags?: string[];
  notes?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  stage?: string;
  search?: string;
  tags?: string[];
}

class ProjectsService {
  private tableName = 'projects';

  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    // Check if table exists and has correct schema
    const checkTableQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = (SELECT schemaname FROM pg_tables WHERE tablename = '${this.tableName}' AND schemaname LIKE 'tenant_%' LIMIT 1)
        AND table_name = '${this.tableName}'
        AND column_name IN ('status', 'stage')
    `;

    try {
      const existingColumns = await queryTenantSchema<{ column_name: string }>(tenantDB, checkTableQuery);
      const hasStatus = existingColumns.some(col => col.column_name === 'status');
      const hasStage = existingColumns.some(col => col.column_name === 'stage');

      // If table has 'status' but not 'stage', rename it
      if (hasStatus && !hasStage) {
        console.log('[ProjectsService] Migrating old status column to stage');
        await queryTenantSchema(tenantDB, `
          ALTER TABLE \${schema}.${this.tableName} 
          RENAME COLUMN status TO stage
        `);
      }
    } catch (error) {
      // Table doesn't exist yet, will be created below
      console.log('[ProjectsService] Table does not exist yet, will create');
    }

    // Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        description TEXT,
        contact_name VARCHAR NOT NULL,
        client_id UUID,
        organization VARCHAR,
        email VARCHAR NOT NULL,
        mobile VARCHAR NOT NULL,
        address TEXT,
        budget DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'BRL',
        stage VARCHAR DEFAULT 'contacted',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await queryTenantSchema(tenantDB, createTableQuery);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_title ON \${schema}.${this.tableName}(title)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_stage ON \${schema}.${this.tableName}(stage)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_contact_name ON \${schema}.${this.tableName}(contact_name)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
    ];

    for (const indexQuery of indexes) {
      try {
        await queryTenantSchema(tenantDB, indexQuery);
      } catch (error) {
        console.warn(`[ProjectsService] Failed to create index:`, error);
      }
    }
  }

  async getProjects(tenantDB: TenantDatabase, filters: ProjectFilters = {}): Promise<{
    projects: Project[];
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

    if (filters.stage) {
      whereConditions.push(`stage = $${paramIndex}`);
      queryParams.push(filters.stage);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex} OR organization ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const projectsQuery = `
      SELECT 
        id, title, description, contact_name, client_id, organization, 
        email, mobile, address, budget, currency, stage, tags, notes,
        created_by, created_at, updated_at, is_active
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

    const [projects, countResult] = await Promise.all([
      queryTenantSchema<Project>(tenantDB, projectsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      projects,
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

  async getProjectById(tenantDB: TenantDatabase, projectId: string): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT 
        id, title, description, contact_name, client_id, organization,
        email, mobile, address, budget, currency, stage, tags, notes,
        created_by, created_at, updated_at, is_active
      FROM \${schema}.${this.tableName}
      WHERE id = $1 AND is_active = TRUE
    `;

    const result = await queryTenantSchema<Project>(tenantDB, query, [projectId]);
    return result[0] || null;
  }

  async createProject(tenantDB: TenantDatabase, projectData: CreateProjectData, createdBy: string): Promise<Project> {
    await this.ensureTables(tenantDB);

    const data = {
      title: projectData.title,
      description: projectData.description || null,
      contact_name: projectData.contactName,
      client_id: projectData.clientId || null,
      organization: projectData.organization || null,
      email: projectData.email,
      mobile: projectData.mobile,
      address: projectData.address || null,
      budget: projectData.budget || null,
      currency: projectData.currency || 'BRL',
      stage: projectData.stage || 'contacted',
      tags: JSON.stringify(projectData.tags || []),
      notes: projectData.notes || null,
      created_by: createdBy
    };

    return await insertInTenantSchema<Project>(tenantDB, this.tableName, data);
  }

  async updateProject(tenantDB: TenantDatabase, projectId: string, updateData: UpdateProjectData): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const data: Record<string, any> = {};

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.contactName !== undefined) data.contact_name = updateData.contactName;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.organization !== undefined) data.organization = updateData.organization;
    if (updateData.email !== undefined) data.email = updateData.email;
    if (updateData.mobile !== undefined) data.mobile = updateData.mobile;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.budget !== undefined) data.budget = updateData.budget;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.stage !== undefined) data.stage = updateData.stage;
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.notes !== undefined) data.notes = updateData.notes;

    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    return await updateInTenantSchema<Project>(tenantDB, this.tableName, projectId, data);
  }

  async deleteProject(tenantDB: TenantDatabase, projectId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const project = await softDeleteInTenantSchema<Project>(tenantDB, this.tableName, projectId);
    return !!project;
  }

  async getProjectsStats(tenantDB: TenantDatabase): Promise<{
    total: number;
    contacted: number;
    proposal: number;
    won: number;
    lost: number;
    thisMonth: number;
  }> {
    await this.ensureTables(tenantDB);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE stage = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE stage = 'proposal') as proposal,
        COUNT(*) FILTER (WHERE stage = 'won') as won,
        COUNT(*) FILTER (WHERE stage = 'lost') as lost,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;
    
    const result = await queryTenantSchema<any>(tenantDB, query);
    const stats = result[0];
    
    return {
      total: parseInt(stats.total || '0'),
      contacted: parseInt(stats.contacted || '0'),
      proposal: parseInt(stats.proposal || '0'),
      won: parseInt(stats.won || '0'),
      lost: parseInt(stats.lost || '0'),
      thisMonth: parseInt(stats.this_month || '0')
    };
  }
}

export const projectsService = new ProjectsService();
