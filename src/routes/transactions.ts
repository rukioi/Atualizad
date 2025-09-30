import { Router } from 'express';
import { transactionsController } from '../controllers/transactionsController';
import { authenticateToken, tenantMiddleware, requireAccountType } from '../middleware/auth';

const router = Router();

// All transaction routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Financial data only for COMPOSTA and GERENCIAL accounts
router.use(requireAccountType(['COMPOSTA', 'GERENCIAL']));

router.get('/', transactionsController.getTransactions);
router.get('/:id', transactionsController.getTransaction);
router.post('/', transactionsController.createTransaction);
router.put('/:id', transactionsController.updateTransaction);
router.delete('/:id', transactionsController.deleteTransaction);

export default router;