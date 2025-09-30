
import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { publicationsService } from '../services/publicationsService';

const updatePublicationSchema = z.object({
  status: z.enum(['novo', 'lido', 'arquivado']).optional(),
});

export class PublicationsController {
  async getPublications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
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

      // ISOLAMENTO POR USUÁRIO (diferente dos outros módulos)
      const result = await publicationsService.getPublications(req.tenantId, req.user.id, filters);
      
      res.json(result);
    } catch (error) {
      console.error('Get publications error:', error);
      res.status(500).json({
        error: 'Failed to fetch publications',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getPublication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      // ISOLAMENTO POR USUÁRIO
      const publication = await publicationsService.getPublicationById(req.tenantId, req.user.id, id);
      
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

  async updatePublication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const validatedData = updatePublicationSchema.parse(req.body);
      
      // ISOLAMENTO POR USUÁRIO
      const publication = await publicationsService.updatePublication(req.tenantId, req.user.id, id, validatedData);
      
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

  async deletePublication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      // ISOLAMENTO POR USUÁRIO
      const success = await publicationsService.deletePublication(req.tenantId, req.user.id, id);
      
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

  async getPublicationsStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // ISOLAMENTO POR USUÁRIO
      const stats = await publicationsService.getPublicationsStats(req.tenantId, req.user.id);

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
