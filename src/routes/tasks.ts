import { Router } from 'express';
import { tasksController } from '../controllers/tasksController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';

const router = Router();

// All task routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/', tasksController.getTasks);
router.get('/:id', tasksController.getTask);
router.post('/', tasksController.createTask);
router.put('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);
router.get('/stats/overview', tasksController.getTaskStats);

export default router;