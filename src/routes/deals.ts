/**
 * DEALS ROUTES - Pipeline de Vendas (CRM)
 * ========================================
 * 
 * Rotas para gerenciamento do pipeline de vendas.
 * 
 * ✅ AUTENTICAÇÃO: Middleware validateAccess
 * ✅ ISOLAMENTO TENANT: Middleware validateTenantAccess
 */

import { Router } from 'express';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant-isolation';
import { dealsController } from '../controllers/dealsController';

const router = Router();

// Aplicar middlewares de autenticação e tenant isolation
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(validateTenantAccess);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/deals
 * Lista todos os deals com filtros e paginação
 * Query params: page, limit, stage, search, tags
 */
router.get('/', (req, res) => dealsController.getDeals(req, res));

/**
 * GET /api/deals/stage/:stage
 * Lista deals por estágio específico (para Kanban)
 */
router.get('/stage/:stage', (req, res) => dealsController.getDealsByStage(req, res));

/**
 * GET /api/deals/:id
 * Busca deal específico por ID
 */
router.get('/:id', (req, res) => dealsController.getDeal(req, res));

/**
 * POST /api/deals
 * Cria novo deal no pipeline
 */
router.post('/', (req, res) => dealsController.createDeal(req, res));

/**
 * PUT /api/deals/:id
 * Atualiza deal existente
 */
router.put('/:id', (req, res) => dealsController.updateDeal(req, res));

/**
 * PATCH /api/deals/:id/stage
 * Move deal para outro estágio
 */
router.patch('/:id/stage', (req, res) => dealsController.moveDealToStage(req, res));

/**
 * DELETE /api/deals/:id
 * Deleta deal (soft delete)
 */
router.delete('/:id', (req, res) => dealsController.deleteDeal(req, res));

export default router;
