import { Router } from 'express';
import { notificationsController } from '../controllers/notificationsController';
import { authenticateToken, tenantMiddleware } from '../middleware/auth';

const router = Router();

// All notification routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/', notificationsController.getNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.post('/', notificationsController.createNotification);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/mark-all-read', notificationsController.markAsRead);
router.delete('/:id', notificationsController.deleteNotification);

export default router;