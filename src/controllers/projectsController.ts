/**
 * PROJECTS CONTROLLER - Gestão de Projetos
 * ========================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB para garantir isolamento por schema
 * ✅ SEM DADOS MOCK: Operações reais no banco de dados do tenant
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { projectsService } from '../services/projectsService';

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
  async getProjects(req: TenantRequest, res: Response) {
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
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        assignedTo: req.query.assignedTo ? (req.query.assignedTo as string).split(',') : undefined
      };

      const result = await projectsService.getProjects(req.tenantDB, filters);
      res.json(result);
    } catch (error) {
      console.error('[ProjectsController] Error:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  async getProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const project = await projectsService.getProjectById(req.tenantDB, id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ project, related: { tasks: [] } }); // TODO: Buscar tasks relacionadas
    } catch (error) {
      console.error('[ProjectsController] Error:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  async createProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createProjectSchema.parse(req.body);
      const project = await projectsService.createProject(req.tenantDB, validatedData, req.user.id);

      res.status(201).json({ message: 'Project created successfully', project });
    } catch (error) {
      console.error('[ProjectsController] Error:', error);
      res.status(400).json({ error: 'Failed to create project' });
    }
  }

  async updateProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);
      const project = await projectsService.updateProject(req.tenantDB, id, validatedData);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project updated successfully', project });
    } catch (error) {
      console.error('[ProjectsController] Error:', error);
      res.status(400).json({ error: 'Failed to update project' });
    }
  }

  async deleteProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const success = await projectsService.deleteProject(req.tenantDB, id);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('[ProjectsController] Error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
}

export const projectsController = new ProjectsController();
