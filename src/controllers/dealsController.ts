/**
 * DEALS CONTROLLER - Pipeline de Vendas (CRM)
 * ============================================
 * 
 * Controller responsável por gerenciar as requisições relacionadas ao pipeline de vendas.
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB injetado pelo middleware validateTenantAccess
 * ✅ SEM DADOS MOCK: Todas as operações são feitas diretamente no banco de dados do tenant
 * 
 * @see src/middleware/tenant-isolation.ts - Middleware que injeta req.tenantDB
 * @see src/utils/tenantHelpers.ts - Helpers de isolamento para queries SQL
 */

import { Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../types';
import { dealsService } from '../services/dealsService';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDealSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  contactName: z.string().min(1, 'Nome do contato é obrigatório'),
  organization: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
  stage: z.enum(['contacted', 'proposal', 'won', 'lost']).default('contacted'),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  clientId: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial();

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class DealsController {
  /**
   * GET /api/deals
   * Lista todos os deals do tenant com filtros e paginação
   */
  async getDeals(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[DealsController] Fetching deals for tenant:', req.tenant?.id);

      // Extrair filtros da query
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        stage: req.query.stage as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      const result = await dealsService.getDeals(req.tenantDB, filters);
      
      console.log('[DealsController] Deals fetched:', { 
        count: result.deals.length, 
        total: result.pagination.total 
      });
      
      res.json(result);
    } catch (error) {
      console.error('[DealsController] Get deals error:', error);
      return res.status(500).json({
        error: 'Failed to fetch deals',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/deals/:id
   * Busca um deal específico por ID
   */
  async getDeal(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      
      console.log('[DealsController] Fetching deal:', id);

      const deal = await dealsService.getDealById(req.tenantDB, id);
      
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      console.log('[DealsController] Deal fetched:', deal.id);

      res.json(deal);
    } catch (error) {
      console.error('[DealsController] Get deal error:', error);
      return res.status(500).json({
        error: 'Failed to fetch deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/deals/stage/:stage
   * Busca deals por estágio (para view Kanban)
   */
  async getDealsByStage(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { stage } = req.params;
      
      console.log('[DealsController] Fetching deals by stage:', stage);

      const deals = await dealsService.getDealsByStage(req.tenantDB, stage);
      
      console.log('[DealsController] Deals fetched for stage:', { stage, count: deals.length });

      res.json(deals);
    } catch (error) {
      console.error('[DealsController] Get deals by stage error:', error);
      return res.status(500).json({
        error: 'Failed to fetch deals by stage',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/deals
   * Cria novo deal no pipeline
   */
  async createDeal(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[DealsController] Creating deal:', req.body);

      // Validar dados
      const validatedData = createDealSchema.parse(req.body);

      // Criar deal
      const deal = await dealsService.createDeal(
        req.tenantDB,
        req.user.id,
        validatedData
      );

      console.log('[DealsController] Deal created:', deal.id);

      res.status(201).json(deal);
    } catch (error) {
      console.error('[DealsController] Create deal error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return res.status(500).json({
        error: 'Failed to create deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/deals/:id
   * Atualiza deal existente
   */
  async updateDeal(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      console.log('[DealsController] Updating deal:', id, req.body);

      // Verificar se deal existe
      const existingDeal = await dealsService.getDealById(req.tenantDB, id);
      if (!existingDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Validar dados
      const validatedData = updateDealSchema.parse(req.body);

      // Atualizar deal
      const deal = await dealsService.updateDeal(req.tenantDB, id, validatedData);

      console.log('[DealsController] Deal updated:', deal.id);

      res.json(deal);
    } catch (error) {
      console.error('[DealsController] Update deal error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return res.status(500).json({
        error: 'Failed to update deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PATCH /api/deals/:id/stage
   * Move deal para outro estágio
   */
  async moveDealToStage(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { stage } = req.body;

      if (!stage) {
        return res.status(400).json({ error: 'Stage is required' });
      }

      console.log('[DealsController] Moving deal to stage:', { id, stage });

      // Verificar se deal existe
      const existingDeal = await dealsService.getDealById(req.tenantDB, id);
      if (!existingDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Mover deal
      const deal = await dealsService.moveDealToStage(req.tenantDB, id, stage);

      console.log('[DealsController] Deal moved to stage:', { id: deal.id, stage: deal.stage });

      res.json(deal);
    } catch (error) {
      console.error('[DealsController] Move deal error:', error);
      return res.status(500).json({
        error: 'Failed to move deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/deals/:id
   * Deleta deal (soft delete)
   */
  async deleteDeal(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      console.log('[DealsController] Deleting deal:', id);

      // Verificar se deal existe
      const existingDeal = await dealsService.getDealById(req.tenantDB, id);
      if (!existingDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      // Deletar deal
      await dealsService.deleteDeal(req.tenantDB, id);

      console.log('[DealsController] Deal deleted:', id);

      res.status(204).send();
    } catch (error) {
      console.error('[DealsController] Delete deal error:', error);
      return res.status(500).json({
        error: 'Failed to delete deal',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const dealsController = new DealsController();
