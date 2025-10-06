/**
 * PROJECTS CONTROLLER - Gestão de Projetos/Casos
 * ================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB
 * ✅ VALIDAÇÃO: Zod schema completo
 * ✅ SEM MOCK: Operações reais no banco
 * 
 * Baseado no padrão do clientsController.ts
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { projectsService } from '../services/projectsService';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createProjectSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Nome do cliente é obrigatório'),
  organization: z.string().optional(),
  address: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  status: z.enum(['contacted', 'proposal', 'won', 'lost']).default('contacted'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  progress: z.number().min(0).max(100).default(0),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
  assignedTo: z.array(z.string()).default([]),
  notes: z.string().optional(),
  contacts: z.array(z.any()).default([]),
});

const updateProjectSchema = createProjectSchema.partial();

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class ProjectsController {
  /**
   * GET /api/projects
   * Lista todos os projetos do tenant com filtros e paginação
   */
  async getProjects(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[ProjectsController] Fetching projects for tenant:', req.tenant?.id);

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        priority: req.query.priority as string,
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

  /**
   * GET /api/projects/stats
   * Retorna estatísticas dos projetos
   */
  async getProjectsStats(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[ProjectsController] Fetching project stats for tenant:', req.tenant?.id);

      const stats = await projectsService.getProjectsStats(req.tenantDB);
      
      console.log('[ProjectsController] Stats fetched:', stats);

      res.json(stats);
    } catch (error) {
      console.error('[ProjectsController] Get stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch project statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/projects/:id
   * Busca um projeto específico por ID
   */
  async getProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
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

  /**
   * POST /api/projects
   * Cria novo projeto
   */
  async createProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = createProjectSchema.parse(req.body);
      
      console.log('[ProjectsController] Creating project for user:', req.user.id);

      const project = await projectsService.createProject(
        req.tenantDB,
        validatedData,
        req.user.id
      );
      
      console.log('[ProjectsController] Project created:', project.id);

      res.status(201).json({
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }

      console.error('[ProjectsController] Create project error:', error);
      res.status(400).json({
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/projects/:id
   * Atualiza projeto existente
   */
  async updateProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors
        });
      }

      console.error('[ProjectsController] Update project error:', error);
      res.status(400).json({
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/projects/:id
   * Deleta projeto (soft delete)
   */
  async deleteProject(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('[ProjectsController] Deleting project:', id);

      const success = await projectsService.deleteProject(req.tenantDB, id);
      
      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      console.log('[ProjectsController] Project deleted:', id);

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('[ProjectsController] Delete project error:', error);
      res.status(400).json({
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const projectsController = new ProjectsController();
