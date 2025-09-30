import { Router } from 'express';
import { adminAuthController } from '../controllers/adminAuthController';
import { authenticateAdminToken } from '../middleware/auth';

const router = Router();

// Public admin auth routes
router.post('/login', adminAuthController.login);
router.post('/refresh', adminAuthController.refresh);
router.post('/logout', adminAuthController.logout);

// Protected admin routes
router.get('/me', authenticateAdminToken, adminAuthController.getProfile);
router.put('/profile', authenticateAdminToken, adminAuthController.updateProfile);

export default router;