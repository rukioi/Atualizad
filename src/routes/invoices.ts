import { Router } from 'express';
import { invoicesController } from '../controllers/invoicesController';
import { authenticateToken, tenantMiddleware, requireAccountType } from '../middleware/auth';

const router = Router();

// All invoice routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Billing data only for COMPOSTA and GERENCIAL accounts
router.use(requireAccountType(['COMPOSTA', 'GERENCIAL']));

router.get('/', invoicesController.getInvoices);
router.get('/:id', invoicesController.getInvoice);
router.post('/', invoicesController.createInvoice);
router.put('/:id', invoicesController.updateInvoice);
router.delete('/:id', invoicesController.deleteInvoice);
router.get('/stats/overview', invoicesController.getInvoiceStats);

export default router;