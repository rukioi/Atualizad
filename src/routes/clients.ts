import { Router } from 'express';
import { clientsController } from '../controllers/clientsController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant-isolation';

const router = Router();

// All client routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(validateTenantAccess);

router.get('/', clientsController.getClients);
router.get('/:id', clientsController.getClient);
router.post('/', clientsController.createClient);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

export default router;