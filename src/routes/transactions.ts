import { Router } from 'express';
import { transactionsController } from '../controllers/transactionsController';
import { authenticateToken, tenantMiddleware, requireCashFlowAccess } from '../middleware/auth';

const router = Router();

// All transaction routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Financial data only for COMPOSTA and GERENCIAL accounts (Cash Flow module)
router.use(requireCashFlowAccess);

router.get('/', transactionsController.getTransactions);
router.get('/:id', transactionsController.getTransaction);
router.post('/', transactionsController.createTransaction);
router.put('/:id', transactionsController.updateTransaction);
router.delete('/:id', transactionsController.deleteTransaction);

export default router;