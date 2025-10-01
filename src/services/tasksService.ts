/**
 * TASKS SERVICE - Gestão de Tarefas
 * ==================================
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

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  project_title?: string;
  client_id?: string;
  client_name?: string;
  assigned_to: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress: number;
  tags: string[];
  notes?: string;
  subtasks: any[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  projectId?: string;
  projectTitle?: string;
  clientId?: string;
  clientName?: string;
  assignedTo: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
  tags?: string[];
  notes?: string;
  subtasks?: any[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  assignedTo?: string;
  projectId?: string;
}

class TasksService {
  private tableName = 'tasks';

  /**
   * Cria as tabelas necessárias se não existirem
   * IMPORTANTE: Tabela criada automaticamente no schema do tenant
   */
  private async ensureTables(tenantDB: TenantDatabase): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id VARCHAR PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        project_id VARCHAR,
        project_title VARCHAR,
        client_id VARCHAR,
        client_name VARCHAR,
        assigned_to VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
        priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        start_date DATE,
        end_date DATE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        tags JSONB DEFAULT '[]',
        notes TEXT,
        subtasks JSONB DEFAULT '[]',
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await queryTenantSchema(tenantDB, createTableQuery);

    // Criar índices para performance otimizada
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_assigned_to ON ${this.tableName}(assigned_to)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON ${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_priority ON ${this.tableName}(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON ${this.tableName}(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON ${this.tableName}(is_active)`
    ];

    for (const indexQuery of indexes) {
      await queryTenantSchema(tenantDB, indexQuery);
    }
  }

  /**
   * Busca tarefas com filtros e paginação
   */
  async getTasks(tenantDB: TenantDatabase, filters: TaskFilters = {}): Promise<{
    tasks: Task[];
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

    if (filters.assignedTo) {
      whereConditions.push(`assigned_to = $${paramIndex}`);
      queryParams.push(filters.assignedTo);
      paramIndex++;
    }

    if (filters.projectId) {
      whereConditions.push(`project_id = $${paramIndex}`);
      queryParams.push(filters.projectId);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const tasksQuery = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;

    const [tasks, countResult] = await Promise.all([
      queryTenantSchema<Task>(tenantDB, tasksQuery, [...queryParams, limit, offset]),
      queryTenantSchema<{total: string}>(tenantDB, countQuery, queryParams)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    };
  }

  /**
   * Busca tarefa por ID
   */
  async getTaskById(tenantDB: TenantDatabase, taskId: string): Promise<Task | null> {
    await this.ensureTables(tenantDB);

    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND is_active = TRUE`;
    const result = await queryTenantSchema<Task>(tenantDB, query, [taskId]);
    return result[0] || null;
  }

  /**
   * Cria nova tarefa
   */
  async createTask(tenantDB: TenantDatabase, taskData: CreateTaskData, createdBy: string): Promise<Task> {
    await this.ensureTables(tenantDB);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const data = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || null,
      project_id: taskData.projectId || null,
      project_title: taskData.projectTitle || null,
      client_id: taskData.clientId || null,
      client_name: taskData.clientName || null,
      assigned_to: taskData.assignedTo,
      status: taskData.status || 'not_started',
      priority: taskData.priority || 'medium',
      start_date: taskData.startDate || null,
      end_date: taskData.endDate || null,
      estimated_hours: taskData.estimatedHours || null,
      actual_hours: taskData.actualHours || null,
      progress: taskData.progress || 0,
      tags: JSON.stringify(taskData.tags || []),
      notes: taskData.notes || null,
      subtasks: JSON.stringify(taskData.subtasks || []),
      created_by: createdBy
    };

    return await insertInTenantSchema<Task>(tenantDB, this.tableName, data);
  }

  /**
   * Atualiza tarefa existente
   */
  async updateTask(tenantDB: TenantDatabase, taskId: string, updateData: UpdateTaskData): Promise<Task | null> {
    await this.ensureTables(tenantDB);

    const data: Record<string, any> = {};

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.projectId !== undefined) data.project_id = updateData.projectId;
    if (updateData.projectTitle !== undefined) data.project_title = updateData.projectTitle;
    if (updateData.clientId !== undefined) data.client_id = updateData.clientId;
    if (updateData.clientName !== undefined) data.client_name = updateData.clientName;
    if (updateData.assignedTo !== undefined) data.assigned_to = updateData.assignedTo;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.priority !== undefined) data.priority = updateData.priority;
    if (updateData.startDate !== undefined) data.start_date = updateData.startDate;
    if (updateData.endDate !== undefined) data.end_date = updateData.endDate;
    if (updateData.estimatedHours !== undefined) data.estimated_hours = updateData.estimatedHours;
    if (updateData.actualHours !== undefined) data.actual_hours = updateData.actualHours;
    if (updateData.progress !== undefined) data.progress = updateData.progress;
    if (updateData.tags !== undefined) data.tags = JSON.stringify(updateData.tags);
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.subtasks !== undefined) data.subtasks = JSON.stringify(updateData.subtasks);

    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    return await updateInTenantSchema<Task>(tenantDB, this.tableName, taskId, data);
  }

  /**
   * Remove tarefa (soft delete)
   */
  async deleteTask(tenantDB: TenantDatabase, taskId: string): Promise<boolean> {
    await this.ensureTables(tenantDB);
    const task = await softDeleteInTenantSchema<Task>(tenantDB, this.tableName, taskId);
    return !!task;
  }

  /**
   * Obtém estatísticas das tarefas
   */
  async getTaskStats(tenantDB: TenantDatabase): Promise<{
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    urgent: number;
  }> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent
      FROM ${this.tableName}
      WHERE is_active = TRUE
    `;

    const result = await queryTenantSchema<any>(tenantDB, query);
    const stats = result[0];

    return {
      total: parseInt(stats.total || '0'),
      completed: parseInt(stats.completed || '0'),
      in_progress: parseInt(stats.in_progress || '0'),
      not_started: parseInt(stats.not_started || '0'),
      urgent: parseInt(stats.urgent || '0')
    };
  }
}

export const tasksService = new TasksService();