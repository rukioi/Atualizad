/**
 * TASKS CONTROLLER - Gestão de Tarefas
 * ===================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB para garantir isolamento por schema
 * ✅ SEM DADOS MOCK: Operações reais no banco de dados do tenant
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
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
  async getTasks(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        priority: req.query.priority as string,
        search: req.query.search as string,
        assignedTo: req.query.assignedTo as string,
        projectId: req.query.projectId as string,
      };

      const result = await tasksService.getTasks(req.tenantDB, filters);

      res.json(result);
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTask(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const task = await tasksService.getTaskById(req.tenantDB, id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ task });
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createTask(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createTaskSchema.parse(req.body);
      const task = await tasksService.createTask(req.tenantDB, validatedData, req.user.id);

      res.status(201).json({
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(400).json({
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateTask(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateTaskSchema.parse(req.body);
      const task = await tasksService.updateTask(req.tenantDB, id, validatedData);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        message: 'Task updated successfully',
        task,
      });
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(400).json({
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteTask(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const success = await tasksService.deleteTask(req.tenantDB, id);

      if (!success) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({
        message: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(500).json({
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTaskStats(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const stats = await tasksService.getTaskStats(req.tenantDB);

      res.json({
        total: Number(stats.total) || 0,
        completed: Number(stats.completed) || 0,
        in_progress: Number(stats.in_progress) || 0,
        not_started: Number(stats.not_started) || 0,
        urgent: Number(stats.urgent) || 0,
      });
    } catch (error) {
      console.error('[TasksController] Error:', error);
      res.status(500).json({
        error: 'Failed to fetch task statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const tasksController = new TasksController();