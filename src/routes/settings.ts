import { Router } from 'express';
import { authenticateToken, tenantMiddleware, requireSettingsAccess, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All settings routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Settings only for GERENCIAL accounts
router.use(requireSettingsAccess);

// Placeholder settings routes
router.get('/profile', (req: AuthenticatedRequest, res) => {
  res.json({ 
    message: 'Settings profile endpoint',
    user: req.user 
  });
});

router.get('/preferences', (req: AuthenticatedRequest, res) => {
  res.json({ 
    message: 'Settings preferences endpoint'
  });
});

export default router;
