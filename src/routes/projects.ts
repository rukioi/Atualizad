import { Router } from 'express';
import { projectsController } from '../controllers/projectsController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant-isolation';

const router = Router();

// All project routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);
router.use(validateTenantAccess);

// Stats route deve vir antes do :id route
router.get('/stats', (req, res) => projectsController.getProjectsStats(req, res));

router.get('/', (req, res) => projectsController.getProjects(req, res));
router.get('/:id', (req, res) => projectsController.getProject(req, res));
router.post('/', (req, res) => projectsController.createProject(req, res));
router.put('/:id', (req, res) => projectsController.updateProject(req, res));
router.delete('/:id', (req, res) => projectsController.deleteProject(req, res));

export default router;
