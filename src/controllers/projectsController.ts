
/**
 * PROJECTS CONTROLLER - Gestão de Negócios (Pipeline)
 * ===================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB
 * ✅ VALIDAÇÃO: Zod schema
 * ✅ SEM MOCK: Operações reais no banco
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { projectsService } from '../services/projectsService';

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  clientId: z.string().optional(),
  organization: z.string().optional(),
  email: z.string().email('Invalid email format'),
  mobile: z.string().min(1, 'Mobile is required'),
  address: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  stage: z.enum(['contacted', 'proposal', 'won', 'lost']).default('contacted'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

export class ProjectsController {
  async getProjects(req: TenantRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.tenantDB || !req.tenant) {
        console.error('[ProjectsController] Missing tenant context:', {
          hasTenantDB: !!req.tenantDB,
          hasTenant: !!req.tenant
        });
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      console.log('[ProjectsController] Fetching projects for tenant:', req.tenant.id);

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        stage: req.query.stage as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      const result = await projectsService.getProjects(req.tenantDB, filters);
      
      console.log('[ProjectsController] Projects fetched:', {
        count: result.projects.length,
        total: result.pagination.total
      });

      res.json(result);
    } catch (error) {
      console.error('[ProjectsController] Get projects error:', error);
      res.status(500).json({
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.tenantDB || !req.tenant) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      const { id } = req.params;
      
      console.log('[ProjectsController] Fetching project:', id);

      const project = await projectsService.getProjectById(req.tenantDB, id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('[ProjectsController] Project fetched:', project.id);

      res.json({ project });
    } catch (error) {
      console.error('[ProjectsController] Get project error:', error);
      res.status(500).json({
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.tenantDB || !req.tenant) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      const validatedData = createProjectSchema.parse(req.body);
      
      console.log('[ProjectsController] Creating project for user:', req.user.id);

      const project = await projectsService.createProject(
        req.tenantDB,
        validatedData,
        req.user.id
      );
      
      console.log('[ProjectsController] Project created:', project.id);

      // Tentar criar notificação (não-bloqueante)
      try {
        const { notificationsService } = await import('../services/notificationsService');
        await notificationsService.createNotification(req.tenantDB, {
          userId: req.user.id,
          title: 'Novo Negócio Criado',
          message: `O negócio "${validatedData.title}" foi criado com sucesso`,
          type: 'success',
          relatedEntityType: 'project',
          relatedEntityId: project.id,
          actionUrl: `/projects/${project.id}`,
          priority: 'low',
          actorId: req.user.id
        });
      } catch (notifError) {
        console.warn('[ProjectsController] Failed to create notification:', notifError);
        // Não quebrar a operação principal
      }

      res.status(201).json({
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      console.error('[ProjectsController] Create project error:', error);
      res.status(400).json({
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.tenantDB || !req.tenant) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);
      
      console.log('[ProjectsController] Updating project:', id);

      const project = await projectsService.updateProject(req.tenantDB, id, validatedData);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('[ProjectsController] Project updated:', project.id);

      res.json({
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      console.error('[ProjectsController] Update project error:', error);
      res.status(400).json({
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.tenantDB || !req.tenant) {
        return res.status(400).json({ error: 'Tenant context missing' });
      }

      const { id } = req.params;
      
      console.log('[ProjectsController] Deleting project:', id);

      const success = await projectsService.deleteProject(req.tenantDB, id);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('[ProjectsController] Project deleted:', id);

      res.json({
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('[ProjectsController] Delete project error:', error);
      res.status(500).json({
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const projectsController = new ProjectsController();
