/**
 * PROJECTS SERVICE - Gestão de Projetos/Casos
 * ============================================
 * 
 * ✅ ISOL AMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
 * ✅ ID AUTOMÁTICO: PostgreSQL gen_random_uuid()
 * ✅ CAST EXPLÍCITO: JSONB e DATE fields
 * 
 * Baseado no padrão do clientsService.ts
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

export interface Project {
  id: string;
  title: string;
  description?: string;
  client_id?: string;
  client_name: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency: 'BRL' | 'USD' | 'EUR';
  status: 'contacted' | 'proposal' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  start_date: string;
  due_date: string;
  completed_at?: string;
  tags: string[];
  assigned_to: string[];
  notes?: string;
  contacts: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  clientId?: string;
  clientName: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status?: 'contacted' | 'proposal' | 'won' | 'lost';
  priority?: 'low' | 'medium' | 'high';
  progress?: number;
  startDate: string;
  dueDate: string;
  tags?: string[];
  assignedTo?: string[];
  notes?: string;
  contacts?: any[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  tags?: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ProjectsService {
  private tableName = 'projects';

  /**
   * Garante que a tabela tenha todas as colunas necessárias
   * IMPORTANTE: Adiciona colunas que podem estar faltando em tenants antigos
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    // Verifica se a tabela existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '\${schema}'
        AND table_name = '${this.tableName}'
      )
    `;
    
    const tableExists = await queryTenantSchema<{exists: boolean}>(tenantDB, checkTableQuery);
    
    if (!tableExists || tableExists.length === 0) {
      console.log('Table projects does not exist in tenant schema');
      return;
    }

    // Adicionar coluna due_date se não existir
    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE
      `);
    } catch (e) {
      console.log('Column due_date already exists or error:', e);
    }

    // Adicionar coluna completed_at se não existir
    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE
      `);
    } catch (e) {
      console.log('Column completed_at already exists or error:', e);
    }

    // Adicionar coluna assigned_to se não existir
    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ADD COLUMN IF NOT EXISTS assigned_to JSONB DEFAULT '[]'::jsonb
      `);
    } catch (e) {
      console.log('Column assigned_to already exists or error:', e);
    }

    // Adicionar coluna contacts se não existir
    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb
      `);
    } catch (e) {
      console.log('Column contacts already exists or error:', e);
    }

    // Atualizar due_date com valores de end_date se due_date estiver null
    try {
      await tenantDB.executeInTenantSchema(`
        UPDATE \${schema}.projects 
        SET due_date = end_date 
        WHERE due_date IS NULL AND end_date IS NOT NULL
      `);
    } catch (e) {
      console.log('Error migrating end_date to due_date:', e);
    }

    // Preencher valores NULL em start_date com created_at
    try {
      await tenantDB.executeInTenantSchema(`
        UPDATE \${schema}.projects 
        SET start_date = created_at 
        WHERE start_date IS NULL
      `);
    } catch (e) {
      console.log('Error filling NULL start_date:', e);
    }

    // Preencher valores NULL em due_date com created_at + 30 dias
    try {
      await tenantDB.executeInTenantSchema(`
        UPDATE \${schema}.projects 
        SET due_date = created_at + INTERVAL '30 days' 
        WHERE due_date IS NULL
      `);
    } catch (e) {
      console.log('Error filling NULL due_date:', e);
    }

    // Garantir que start_date e due_date sejam NOT NULL
    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ALTER COLUMN start_date SET NOT NULL
      `);
    } catch (e) {
      console.log('Column start_date already NOT NULL or error:', e);
    }

    try {
      await tenantDB.executeInTenantSchema(`
        ALTER TABLE \${schema}.projects 
        ALTER COLUMN due_date SET NOT NULL
      `);
    } catch (e) {
      console.log('Column due_date already NOT NULL or error:', e);
    }
  }

  /**
   * Lista projetos com paginação e filtros
   */
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

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      whereConditions.push(`priority = $${paramIndex}`);
      queryParams.push(filters.priority);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        client_name ILIKE $${paramIndex} OR 
        organization ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      whereConditions.push(`tags ?| $${paramIndex}`);
      queryParams.push(filters.tags);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const projectsQuery = `
      SELECT 
        id::text,
        title,
        COALESCE(description, '') as description,
        COALESCE(client_id::text, NULL) as client_id,
        client_name,
        COALESCE(organization, '') as organization,
        COALESCE(address, '') as address,
        COALESCE(budget::numeric, 0) as budget,
        COALESCE(currency, 'BRL') as currency,
        status,
        priority,
        COALESCE(progress, 0) as progress,
        start_date::text,
        due_date::text,
        COALESCE(completed_at::text, NULL) as completed_at,
        COALESCE(tags::jsonb, '[]'::jsonb) as tags,
        COALESCE(assigned_to::jsonb, '[]'::jsonb) as assigned_to,
        COALESCE(notes, '') as notes,
        COALESCE(contacts::jsonb, '[]'::jsonb) as contacts,
        created_by::text,
        created_at::text,
        updated_at::text,
        is_active
      FROM \${schema}.${this.tableName}
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM \${schema}.${this.tableName}
      WHERE ${whereClause}
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

  /**
   * Busca projeto por ID
   */
  async getProjectById(tenantDB: TenantDatabase, projectId: string): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT 
        id::text,
        title,
        COALESCE(description, '') as description,
        COALESCE(client_id::text, NULL) as client_id,
        client_name,
        COALESCE(organization, '') as organization,
        COALESCE(address, '') as address,
        COALESCE(budget::numeric, 0) as budget,
        COALESCE(currency, 'BRL') as currency,
        status,
        priority,
        COALESCE(progress, 0) as progress,
        start_date::text,
        due_date::text,
        COALESCE(completed_at::text, NULL) as completed_at,
        COALESCE(tags::jsonb, '[]'::jsonb) as tags,
        COALESCE(assigned_to::jsonb, '[]'::jsonb) as assigned_to,
        COALESCE(notes, '') as notes,
        COALESCE(contacts::jsonb, '[]'::jsonb) as contacts,
        created_by::text,
        created_at::text,
        updated_at::text,
        is_active
      FROM \${schema}.${this.tableName}
      WHERE id::text = $1 AND is_active = TRUE
    `;

    const result = await queryTenantSchema<Project>(tenantDB, query, [projectId]);
    return result[0] || null;
  }

  /**
   * Cria novo projeto
   */
  async createProject(tenantDB: TenantDatabase, projectData: CreateProjectData, createdBy: string): Promise<Project> {
    await this.ensureTables(tenantDB);

    // Validar APENAS campos obrigatórios
    if (!projectData.title) throw new Error('Título é obrigatório');
    if (!projectData.clientName) throw new Error('Cliente é obrigatório');
    if (!projectData.startDate) throw new Error('Data de início é obrigatória');
    if (!projectData.dueDate) throw new Error('Data de vencimento é obrigatória');

    // Montar dados com APENAS campos essenciais e identificáveis
    const data: Record<string, any> = {
      // CAMPOS OBRIGATÓRIOS
      title: projectData.title,
      client_name: projectData.clientName,
      status: projectData.status || 'contacted',
      priority: projectData.priority || 'medium',
      start_date: projectData.startDate,
      due_date: projectData.dueDate,
      created_by: createdBy,
      
      // CAMPOS OPCIONAIS ESSENCIAIS
      description: projectData.description || null,
      client_id: projectData.clientId || null,
      budget: projectData.budget || null,
      currency: projectData.currency || 'BRL',
      progress: projectData.progress || 0,
      tags: projectData.tags || [],
      notes: projectData.notes || null
    };

    // Adicionar campos opcionais somente se preenchidos
    if (projectData.organization) data.organization = projectData.organization;
    if (projectData.address) data.address = projectData.address;
    if (projectData.assignedTo && projectData.assignedTo.length > 0) data.assigned_to = projectData.assignedTo;
    if (projectData.contacts && projectData.contacts.length > 0) data.contacts = projectData.contacts;

    return await insertInTenantSchema<Project>(tenantDB, this.tableName, data);
  }

  /**
   * Atualiza projeto existente
   */
  async updateProject(tenantDB: TenantDatabase, projectId: string, updateData: UpdateProjectData): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const data: Record<string, any> = {};

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.clientName !== undefined) data.client_name = updateData.clientName;
    if (updateData.organization !== undefined) data.organization = updateData.organization;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.budget !== undefined) data.budget = updateData.budget;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.priority !== undefined) data.priority = updateData.priority;
    if (updateData.progress !== undefined) data.progress = updateData.progress;
    if (updateData.startDate !== undefined) data.start_date = updateData.startDate;
    if (updateData.dueDate !== undefined) data.due_date = updateData.dueDate;
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.assignedTo !== undefined) data.assigned_to = JSON.stringify(updateData.assignedTo);
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.contacts !== undefined) data.contacts = JSON.stringify(updateData.contacts);

    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    return await updateInTenantSchema<Project>(tenantDB, this.tableName, projectId, data);
  }

  /**
   * Deleta projeto (soft delete)
   */
  async deleteProject(tenantDB: TenantDatabase, projectId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const project = await softDeleteInTenantSchema<Project>(tenantDB, this.tableName, projectId);
    return !!project;
  }

  /**
   * Estatísticas de projetos
   */
  async getProjectsStats(tenantDB: TenantDatabase): Promise<{
    total: number;
    avgProgress: number;
    overdue: number;
    revenue: number;
    byStatus: {
      contacted: number;
      proposal: number;
      won: number;
      lost: number;
    };
    byPriority: {
      low: number;
      medium: number;
      high: number;
    };
  }> {
    await this.ensureTables(tenantDB);
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COALESCE(AVG(progress), 0) as avg_progress,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('won', 'lost')) as overdue,
        COALESCE(SUM(CASE WHEN status = 'won' THEN budget ELSE 0 END), 0) as revenue,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE status = 'proposal') as proposal,
        COUNT(*) FILTER (WHERE status = 'won') as won,
        COUNT(*) FILTER (WHERE status = 'lost') as lost,
        COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
        COUNT(*) FILTER (WHERE priority = 'medium') as priority_medium,
        COUNT(*) FILTER (WHERE priority = 'high') as priority_high
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;
    
    const result = await queryTenantSchema<any>(tenantDB, query);
    const stats = result[0];
    
    return {
      total: parseInt(stats.total || '0'),
      avgProgress: Math.round(parseFloat(stats.avg_progress || '0')),
      overdue: parseInt(stats.overdue || '0'),
      revenue: parseFloat(stats.revenue || '0'),
      byStatus: {
        contacted: parseInt(stats.contacted || '0'),
        proposal: parseInt(stats.proposal || '0'),
        won: parseInt(stats.won || '0'),
        lost: parseInt(stats.lost || '0')
      },
      byPriority: {
        low: parseInt(stats.priority_low || '0'),
        medium: parseInt(stats.priority_medium || '0'),
        high: parseInt(stats.priority_high || '0')
      }
    };
  }
}

export const projectsService = new ProjectsService();
