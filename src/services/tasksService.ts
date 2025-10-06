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
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR NOT NULL,
        description TEXT,
        project_id UUID,
        project_title VARCHAR,
        client_id UUID,
        client_name VARCHAR,
        assigned_to VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
        priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        start_date DATE,
        end_date DATE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        tags JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        subtasks JSONB DEFAULT '[]'::jsonb,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      )
    `;

    await queryTenantSchema(tenantDB, createTableQuery);

    // Criar índices para performance otimizada
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_assigned_to ON \${schema}.${this.tableName}(assigned_to)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_priority ON \${schema}.${this.tableName}(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON \${schema}.${this.tableName}(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_by ON \${schema}.${this.tableName}(created_by)`
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
      SELECT 
        id::text,
        title,
        COALESCE(description, '') as description,
        COALESCE(project_id::text, NULL) as project_id,
        COALESCE(project_title, '') as project_title,
        COALESCE(client_id::text, NULL) as client_id,
        COALESCE(client_name, '') as client_name,
        assigned_to,
        status,
        priority,
        COALESCE(progress, 0) as progress,
        COALESCE(start_date::text, NULL) as start_date,
        COALESCE(end_date::text, NULL) as end_date,
        COALESCE(estimated_hours::numeric, NULL) as estimated_hours,
        COALESCE(actual_hours::numeric, NULL) as actual_hours,
        COALESCE(tags::jsonb, '[]'::jsonb) as tags,
        COALESCE(notes, '') as notes,
        COALESCE(subtasks::jsonb, '[]'::jsonb) as subtasks,
        created_by,
        created_at::text,
        updated_at::text,
        is_active
      FROM \${schema}.${this.tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM \${schema}.${this.tableName} ${whereClause}`;

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

    const query = `
      SELECT 
        id::text,
        title,
        COALESCE(description, '') as description,
        COALESCE(project_id::text, NULL) as project_id,
        COALESCE(project_title, '') as project_title,
        COALESCE(client_id::text, NULL) as client_id,
        COALESCE(client_name, '') as client_name,
        assigned_to,
        status,
        priority,
        COALESCE(progress, 0) as progress,
        COALESCE(start_date::text, NULL) as start_date,
        COALESCE(end_date::text, NULL) as end_date,
        COALESCE(estimated_hours::numeric, NULL) as estimated_hours,
        COALESCE(actual_hours::numeric, NULL) as actual_hours,
        COALESCE(tags::jsonb, '[]'::jsonb) as tags,
        COALESCE(notes, '') as notes,
        COALESCE(subtasks::jsonb, '[]'::jsonb) as subtasks,
        created_by,
        created_at::text,
        updated_at::text,
        is_active
      FROM \${schema}.${this.tableName}
      WHERE id::text = $1 AND is_active = TRUE
    `;
    const result = await queryTenantSchema<Task>(tenantDB, query, [taskId]);
    return result[0] || null;
  }

  /**
   * Cria nova tarefa
   */
  async createTask(tenantDB: TenantDatabase, taskData: CreateTaskData, createdBy: string): Promise<Task> {
    await this.ensureTables(tenantDB);

    // Validar campos obrigatórios
    if (!taskData.title) throw new Error('Título é obrigatório');
    if (!taskData.assignedTo) throw new Error('Responsável é obrigatório');

    const data: Record<string, any> = {
      title: taskData.title,
      assigned_to: taskData.assignedTo,
      status: taskData.status || 'not_started',
      priority: taskData.priority || 'medium',
      progress: taskData.progress || 0,
      created_by: createdBy
    };

    // Adicionar campos opcionais apenas se fornecidos
    if (taskData.description) data.description = taskData.description;
    if (taskData.projectId && taskData.projectId !== 'none') data.project_id = taskData.projectId;
    if (taskData.projectTitle) data.project_title = taskData.projectTitle;
    if (taskData.clientId) data.client_id = taskData.clientId;
    if (taskData.clientName) data.client_name = taskData.clientName;
    if (taskData.startDate) data.start_date = taskData.startDate;
    if (taskData.endDate) data.end_date = taskData.endDate;
    if (taskData.estimatedHours !== undefined) data.estimated_hours = taskData.estimatedHours;
    if (taskData.actualHours !== undefined) data.actual_hours = taskData.actualHours;
    if (taskData.notes) data.notes = taskData.notes;
    if (taskData.tags && taskData.tags.length > 0) data.tags = JSON.stringify(taskData.tags);
    if (taskData.subtasks && taskData.subtasks.length > 0) data.subtasks = JSON.stringify(taskData.subtasks);

    console.log('[TasksService] Creating task with data:', data);
    const result = await insertInTenantSchema<Task>(tenantDB, this.tableName, data);
    console.log('[TasksService] Task created successfully:', result);
    return result;
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
    inProgress: number;
    notStarted: number;
    onHold: number;
    urgent: number;
  }> {
    await this.ensureTables(tenantDB);

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent
      FROM \${schema}.${this.tableName}
      WHERE is_active = TRUE
    `;

    const result = await queryTenantSchema<any>(tenantDB, query);
    const stats = result[0];

    return {
      total: parseInt(stats.total || '0'),
      completed: parseInt(stats.completed || '0'),
      inProgress: parseInt(stats.in_progress || '0'),
      notStarted: parseInt(stats.not_started || '0'),
      onHold: parseInt(stats.on_hold || '0'),
      urgent: parseInt(stats.urgent || '0')
    };
  }
}

export const tasksService = new TasksService();