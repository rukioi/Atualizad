import { Router } from 'express';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';

const router = Router();

// All task routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Stats route must come before /:id to avoid matching "stats" as an id
router.get('/stats/overview', tasksController.getTaskStats);
router.get('/', tasksController.getTasks);
router.get('/:id', tasksController.getTask);
router.post('/', tasksController.createTask);
router.put('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);

export default router;