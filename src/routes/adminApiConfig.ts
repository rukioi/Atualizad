import { Router } from 'express';
import { adminApiConfigController } from '../controllers/adminApiConfigController';
import { authenticateAdminToken } from '../middleware/auth';

const router = Router();

// All admin API config routes require admin authentication
router.use(authenticateAdminToken);

router.get('/', adminApiConfigController.getApiConfigs);
router.get('/:tenantId', adminApiConfigController.getApiConfig);
router.post('/', adminApiConfigController.createApiConfig);
router.put('/:tenantId', adminApiConfigController.updateApiConfig);
router.delete('/:tenantId', adminApiConfigController.deleteApiConfig);
router.patch('/:tenantId/status', adminApiConfigController.toggleApiConfigStatus);

export default router;