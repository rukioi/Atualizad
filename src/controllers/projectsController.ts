import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { projectsService } from '../services/projectsService';

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientId: z.string().optional(),
  organization: z.string().optional(),
  address: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  status: z.enum(['contacted', 'proposal', 'won', 'lost']).default('contacted'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
  assignedTo: z.array(z.string()).default([]),
  notes: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    role: z.string(),
  })).default([]),
});

const updateProjectSchema = createProjectSchema.partial();

export class ProjectsController {
  async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Fetching projects for tenant:', req.tenantId);

      // Extrair filtros da query
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        priority: req.query.priority as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        assignedTo: req.query.assignedTo ? (req.query.assignedTo as string).split(',') : undefined
      };

      const result = await projectsService.getProjects(req.tenantId, filters);
      
      console.log('Projects fetched successfully:', { count: result.projects.length, total: result.pagination.total });
      
      res.json(result);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('Fetching project:', id, 'for tenant:', req.tenantId);

      const project = await projectsService.getProjectById(req.tenantId, id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('Project fetched successfully:', project.id);

      res.json({
        project,
        related: {
          tasks: [],
        },
      });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Creating project for tenant:', req.tenantId, 'by user:', req.user.id);

      const validatedData = createProjectSchema.parse(req.body);

      const project = await projectsService.createProject(req.tenantId, validatedData, req.user.id);
      
      console.log('Project created successfully:', project.id);

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(400).json({
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);
      
      console.log('Updating project:', id, 'for tenant:', req.tenantId);

      const project = await projectsService.updateProject(req.tenantId, id, validatedData);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('Project updated successfully:', project.id);

      res.json({
        message: 'Project updated successfully',
        project,
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(400).json({
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('Deleting project:', id, 'for tenant:', req.tenantId);

      const success = await projectsService.deleteProject(req.tenantId, id);
      
      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('Project deleted successfully:', id);

      res.json({
        message: 'Project deleted successfully',
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const projectsController = new ProjectsController();