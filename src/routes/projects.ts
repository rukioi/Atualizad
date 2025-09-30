import { Router } from 'express';
import { projectsController } from '../controllers/projectsController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';

const router = Router();

// All project routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/', projectsController.getProjects);
router.get('/:id', projectsController.getProject);
router.post('/', projectsController.createProject);
router.put('/:id', projectsController.updateProject);
router.delete('/:id', projectsController.deleteProject);

export default router;