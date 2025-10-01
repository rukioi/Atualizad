/**
 * PROJECTS SERVICE - Gestão de Projetos
 * =====================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ SEM DADOS MOCK: Operações reais no PostgreSQL
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
  client_name: string;
  client_id?: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status: 'contacted' | 'proposal' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  tags: string[];
  assigned_to: string[];
  notes?: string;
  contacts: ProjectContact[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ProjectContact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface CreateProjectData {
  title: string;
  description?: string;
  clientName: string;
  clientId?: string;
  organization?: string;
  address?: string;
  budget?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  status?: 'contacted' | 'proposal' | 'won' | 'lost';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  assignedTo?: string[];
  notes?: string;
  contacts?: ProjectContact[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> {}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  tags?: string[];
  assignedTo?: string[];
}

class ProjectsService {
  private tableName = 'projects';

  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id VARCHAR PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        client_name VARCHAR NOT NULL,
        client_id VARCHAR,
        organization VARCHAR,
        address TEXT,
        budget DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR DEFAULT 'contacted',
        priority VARCHAR DEFAULT 'medium',
        start_date DATE,
        due_date DATE,
        tags JSONB DEFAULT '[]',
        assigned_to JSONB DEFAULT '[]',
        notes TEXT,
        contacts JSONB DEFAULT '[]',
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await queryTenantSchema(tenantDB, createTableQuery);

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_title ON \${schema}.${this.tableName}(title)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_priority ON \${schema}.${this.tableName}(priority)`
    ];

    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  async getProjects(tenantDB: TenantDatabase, filters: ProjectFilters = {}): Promise<{
    projects: Project[];
    pagination: any;
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
      whereConditions.push(`(title ILIKE $${paramIndex} OR client_name ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const projectsQuery = `
      SELECT * FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM \${schema}.${this.tableName} ${whereClause}`;

    const [projects, countResult] = await Promise.all([
      queryTenantSchema<Project>(tenantDB, projectsQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      projects,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  async getProjectById(tenantDB: TenantDatabase, projectId: string): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const query = `SELECT * FROM \${schema}.${this.tableName} WHERE id = $1 AND is_active = TRUE`;
    const result = await queryTenantSchema<Project>(tenantDB, query, [projectId]);
    return result[0] || null;
  }

  async createProject(tenantDB: TenantDatabase, projectData: CreateProjectData, createdBy: string): Promise<Project> {
    await this.ensureTables(tenantDB);

    const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const data = {
      id: projectId,
      title: projectData.title,
      description: projectData.description || null,
      client_name: projectData.clientName,
      client_id: projectData.clientId || null,
      organization: projectData.organization || null,
      address: projectData.address || null,
      budget: projectData.budget || null,
      currency: projectData.currency || 'BRL',
      status: projectData.status || 'contacted',
      priority: projectData.priority || 'medium',
      start_date: projectData.startDate || null,
      due_date: projectData.dueDate || null,
      tags: JSON.stringify(projectData.tags || []),
      assigned_to: JSON.stringify(projectData.assignedTo || []),
      notes: projectData.notes || null,
      contacts: JSON.stringify(projectData.contacts || []),
      created_by: createdBy
    };

    return await insertInTenantSchema<Project>(tenantDB, this.tableName, data);
  }

  async updateProject(tenantDB: TenantDatabase, projectId: string, updateData: UpdateProjectData): Promise<Project | null> {
    await this.ensureTables(tenantDB);

    const data: Record<string, any> = {};

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.clientName !== undefined) data.client_name = updateData.clientName;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.organization !== undefined) data.organization = updateData.organization;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.budget !== undefined) data.budget = updateData.budget;
    if (updateData.currency !== undefined) data.currency = updateData.currency;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.priority !== undefined) data.priority = updateData.priority;
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

  async deleteProject(tenantDB: TenantDatabase, projectId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const project = await softDeleteInTenantSchema<Project>(tenantDB, this.tableName, projectId);
    return !!project;
  }
}

export const projectsService = new ProjectsService();
