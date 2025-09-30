import { tenantDB } from './tenantDatabase';

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

export class TasksService {
  private tableName = 'tasks';

  /**
   * Cria as tabelas necessárias se não existirem
   */
  async initializeTables(tenantId: string): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \${schema}.${this.tableName} (
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
        start_date TIMESTAMP,
        end_date TIMESTAMP,
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
    
    await tenantDB.executeInTenantSchema(tenantId, createTableQuery);
    
    // Criar índices para performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_assigned_to ON \${schema}.${this.tableName}(assigned_to)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_status ON \${schema}.${this.tableName}(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_priority ON \${schema}.${this.tableName}(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_project_id ON \${schema}.${this.tableName}(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_client_id ON \${schema}.${this.tableName}(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON \${schema}.${this.tableName}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_active ON \${schema}.${this.tableName}(is_active)`
    ];
    
    for (const indexQuery of createIndexes) {
      await tenantDB.executeInTenantSchema(tenantId, indexQuery);
    }
  }

  // Listar tarefas do tenant
  async getTasks(tenantId: string, limit: number = 50, offset: number = 0): Promise<{ tasks: Task[]; total: number }> {
    try {
      // Garantir que a tabela existe
      await this.initializeTables(tenantId);
      // Query para buscar tarefas
      const tasksQuery = `
        SELECT * FROM \${schema}.tasks 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as count FROM \${schema}.tasks 
        WHERE is_active = true
      `;

      const [tasks, countResult] = await Promise.all([
        tenantDB.executeInTenantSchema<Task>(tenantId, tasksQuery, [limit, offset]),
        tenantDB.executeInTenantSchema<{ count: string }>(tenantId, countQuery)
      ]);

      const total = parseInt(countResult[0]?.count || '0');

      return {
        tasks: tasks || [],
        total
      };
    } catch (error) {
      console.error('Error getting tasks:', error);
      return { tasks: [], total: 0 };
    }
  }

  // Buscar tarefa por ID
  async getTaskById(tenantId: string, taskId: string): Promise<Task | null> {
    try {
      const query = `
        SELECT * FROM \${schema}.tasks 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await tenantDB.executeInTenantSchema<Task>(tenantId, query, [taskId]);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      return null;
    }
  }

  // Criar nova tarefa
  async createTask(tenantId: string, taskData: Partial<Task>): Promise<Task> {
    try {
      // Garantir que a tabela existe
      await this.initializeTables(tenantId);
      const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO \${schema}.tasks (
          id, title, description, project_id, project_title, client_id, client_name,
          assigned_to, status, priority, start_date, end_date, estimated_hours,
          actual_hours, progress, tags, notes, subtasks, created_by, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18::jsonb, $19, $20
        ) RETURNING *
      `;

      // Normalizar campos para snake_case (compatível com o banco)
      const assignedTo = taskData.assignedTo || taskData.assigned_to;
      const projectId = taskData.projectId || taskData.project_id;
      const projectTitle = taskData.projectTitle || taskData.project_title;
      const clientId = taskData.clientId || taskData.client_id;
      const clientName = taskData.clientName || taskData.client_name;
      const startDate = taskData.startDate || taskData.start_date;
      const endDate = taskData.endDate || taskData.end_date;
      const estimatedHours = taskData.estimatedHours || taskData.estimated_hours;
      const actualHours = taskData.actualHours || taskData.actual_hours;

      const params = [
        id,
        taskData.title,
        taskData.description || null,
        projectId || null,
        projectTitle || null,
        clientId || null,
        clientName || null,
        assignedTo,
        taskData.status || 'not_started',
        taskData.priority || 'medium',
        startDate || null,
        endDate || null,
        estimatedHours || null,
        actualHours || null,
        taskData.progress || 0,
        JSON.stringify(taskData.tags || []),
        taskData.notes || null,
        JSON.stringify(taskData.subtasks || []),
        taskData.created_by,
        true
      ];

      const result = await tenantDB.executeInTenantSchema<Task>(tenantId, query, params);
      return result[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Atualizar tarefa
  async updateTask(tenantId: string, taskId: string, updateData: Partial<Task>): Promise<Task | null> {
    try {
      // Normalizar campos de camelCase para snake_case
      const assignedTo = updateData.assignedTo || updateData.assigned_to;
      const projectId = updateData.projectId || updateData.project_id;
      const projectTitle = updateData.projectTitle || updateData.project_title;
      const clientId = updateData.clientId || updateData.client_id;
      const clientName = updateData.clientName || updateData.client_name;
      const startDate = updateData.startDate || updateData.start_date;
      const endDate = updateData.endDate || updateData.end_date;
      const estimatedHours = updateData.estimatedHours || updateData.estimated_hours;
      const actualHours = updateData.actualHours || updateData.actual_hours;
      
      const query = `
        UPDATE \${schema}.tasks 
        SET 
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          assigned_to = COALESCE($4, assigned_to),
          status = COALESCE($5, status),
          priority = COALESCE($6, priority),
          project_id = COALESCE($7, project_id),
          project_title = COALESCE($8, project_title),
          client_id = COALESCE($9, client_id),
          client_name = COALESCE($10, client_name),
          start_date = COALESCE($11::timestamp, start_date),
          end_date = COALESCE($12::timestamp, end_date),
          estimated_hours = COALESCE($13, estimated_hours),
          actual_hours = COALESCE($14, actual_hours),
          progress = COALESCE($15, progress),
          tags = COALESCE($16::jsonb, tags),
          notes = COALESCE($17, notes),
          subtasks = COALESCE($18::jsonb, subtasks),
          updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *
      `;

      const params = [
        taskId,
        updateData.title,
        updateData.description,
        assignedTo,
        updateData.status,
        updateData.priority,
        projectId,
        projectTitle,
        clientId,
        clientName,
        startDate,
        endDate,
        estimatedHours,
        actualHours,
        updateData.progress,
        updateData.tags ? JSON.stringify(updateData.tags) : null,
        updateData.notes,
        updateData.subtasks ? JSON.stringify(updateData.subtasks) : null
      ];

      const result = await tenantDB.executeInTenantSchema<Task>(tenantId, query, params);
      return result[0] || null;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Deletar tarefa (soft delete)
  async deleteTask(tenantId: string, taskId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE \${schema}.tasks 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING 1
      `;

      const result = await tenantDB.executeInTenantSchema(tenantId, query, [taskId]);
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }


  // Estatísticas de tarefas
  async getTaskStats(tenantId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent
        FROM \${schema}.tasks 
        WHERE is_active = true
      `;

      const result = await tenantDB.executeInTenantSchema(tenantId, query);
      return result[0] || {
        total: 0,
        completed: 0,
        in_progress: 0,
        not_started: 0,
        urgent: 0
      };
    } catch (error) {
      console.error('Error getting task stats:', error);
      return {
        total: 0,
        completed: 0,
        in_progress: 0,
        not_started: 0,
        urgent: 0
      };
    }
  }
}

export const tasksService = new TasksService();