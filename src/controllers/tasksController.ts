import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { tasksService } from '../services/tasksService';

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  assignedTo: z.string().min(1, 'Assigned to is required'),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  progress: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    createdAt: z.string(),
    completedAt: z.string().optional(),
  })).default([]),
});

const updateTaskSchema = createTaskSchema.partial();

export class TasksController {
  async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const { tasks, total } = await tasksService.getTasks(req.tenantId, limit, offset);
      const totalPages = Math.ceil(total / limit);

      res.json({
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      const task = await tasksService.getTaskById(req.tenantId, id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ task });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({
        error: 'Failed to fetch task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createTaskSchema.parse(req.body);

      const taskData = {
        ...validatedData,
        created_by: req.user.id,
      };

      const task = await tasksService.createTask(req.tenantId, taskData);

      res.status(201).json({
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(400).json({
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateTaskSchema.parse(req.body);

      const task = await tasksService.updateTask(req.tenantId, id, validatedData);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        message: 'Task updated successfully',
        task,
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(400).json({
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      const success = await tasksService.deleteTask(req.tenantId, id);

      if (!success) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        message: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTaskStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const stats = await tasksService.getTaskStats(req.tenantId);

      res.json({
        total: parseInt(stats.total) || 0,
        completed: parseInt(stats.completed) || 0,
        in_progress: parseInt(stats.in_progress) || 0,
        not_started: parseInt(stats.not_started) || 0,
        urgent: parseInt(stats.urgent) || 0,
      });
    } catch (error) {
      console.error('Get task stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch task statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const tasksController = new TasksController();