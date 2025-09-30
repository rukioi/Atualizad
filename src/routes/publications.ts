
import { Router } from 'express';
import { publicationsController } from '../controllers/publicationsController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';

const router = Router();

// All publication routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/', publicationsController.getPublications);
router.get('/stats', publicationsController.getPublicationsStats);
router.get('/:id', publicationsController.getPublication);
router.put('/:id', publicationsController.updatePublication);
router.delete('/:id', publicationsController.deletePublication);

export default router;
