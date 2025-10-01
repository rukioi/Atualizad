/**
 * PUBLICATIONS CONTROLLER - Gestão de Publicações Jurídicas
 * =========================================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB para garantir isolamento por schema
 * ✅ ISOLAMENTO POR USUÁRIO: Publicações são isoladas por usuário (diferente de outros módulos)
 * ✅ SEM DADOS MOCK: Operações reais no banco de dados do tenant
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { publicationsService } from '../services/publicationsService';

const updatePublicationSchema = z.object({
  status: z.enum(['novo', 'lido', 'arquivado']).optional(),
});

export class PublicationsController {
  async getPublications(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        source: req.query.source as string,
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      };

      const result = await publicationsService.getPublications(req.tenantDB, req.user.id, filters);
      
      res.json(result);
    } catch (error) {
      console.error('Get publications error:', error);
      res.status(500).json({
        error: 'Failed to fetch publications',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPublication(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const publication = await publicationsService.getPublicationById(req.tenantDB, req.user.id, id);
      
      if (!publication) {
        return res.status(404).json({ error: 'Publication not found' });
      }

      res.json({ publication });
    } catch (error) {
      console.error('Get publication error:', error);
      res.status(500).json({
        error: 'Failed to fetch publication',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updatePublication(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updatePublicationSchema.parse(req.body);
      const publication = await publicationsService.updatePublication(req.tenantDB, req.user.id, id, validatedData);
      
      if (!publication) {
        return res.status(404).json({ error: 'Publication not found' });
      }

      res.json({
        message: 'Publication updated successfully',
        publication,
      });
    } catch (error) {
      console.error('Update publication error:', error);
      res.status(400).json({
        error: 'Failed to update publication',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deletePublication(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const success = await publicationsService.deletePublication(req.tenantDB, req.user.id, id);
      
      if (!success) {
        return res.status(404).json({ error: 'Publication not found' });
      }

      res.json({
        message: 'Publication deleted successfully',
      });
    } catch (error) {
      console.error('Delete publication error:', error);
      res.status(500).json({
        error: 'Failed to delete publication',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPublicationsStats(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const stats = await publicationsService.getPublicationsStats(req.tenantDB, req.user.id);

      res.json(stats);
    } catch (error) {
      console.error('Get publications stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch publications statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const publicationsController = new PublicationsController();
