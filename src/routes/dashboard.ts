import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticateToken, tenantMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';

const router = Router();

// All dashboard routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// GET /api/dashboard/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    const metrics = await dashboardService.getDashboardMetrics(
      user.tenantId,
      user.userId,
      user.accountType
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      message: 'Error getting dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    const limit = parseInt(req.query.limit as string) || 10;

    const activity = await dashboardService.getRecentActivity(
      user.tenantId,
      user.userId,
      limit
    );

    res.json(activity);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      message: 'Error getting recent activity',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/dashboard/chart-data
router.get('/chart-data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    const period = req.query.period as string || '30d';

    const chartData = await dashboardService.getChartData(
      user.tenantId,
      user.accountType,
      period
    );

    res.json(chartData);
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({
      message: 'Error getting chart data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Original routes that were already present
router.get('/financeiro', dashboardController.getFinancialData);
router.get('/clientes', dashboardController.getClientMetrics);
router.get('/projetos', dashboardController.getProjectMetrics);
router.get('/stats', dashboardController.getStats);

export default router;