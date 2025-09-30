import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { dashboardService } from '../services/dashboardService';
import { clientsService } from '../services/clientsService';
import { projectsService } from '../services/projectsService';
import { transactionsService } from '../services/transactionsService';

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const metrics = await dashboardService.getDashboardMetrics(req.tenantId, req.user.id, req.user.accountType);
      res.json(metrics);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [metrics, recentActivity, chartData] = await Promise.all([
        dashboardService.getDashboardMetrics(req.tenantId, req.user.id, req.user.accountType),
        dashboardService.getRecentActivity(req.tenantId, req.user.id, 10),
        dashboardService.getChartData(req.tenantId, req.user.accountType)
      ]);

      const dashboardData = {
        metrics,
        charts: chartData,
        recentActivity,
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const metrics = await dashboardService.getDashboardMetrics(
        req.tenantId,
        req.user.id,
        req.user.accountType || 'basic'
      );

      res.json({
        metrics,
        accountType: req.user.accountType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getFinancialData(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Only COMPOSTA and GERENCIAL can access financial data
      if (req.user.accountType === 'SIMPLES') {
        return res.json({
          revenue: 0,
          expenses: 0,
          balance: 0,
          transactions: [],
          charts: [],
          message: 'Financial data not available for this account type',
        });
      }

      // Get real financial data from transactions
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const transactions = await transactionsService.getTransactions(req.tenantId, req.user.id, {
        startDate: currentMonth.toISOString(),
        endDate: new Date().toISOString()
      });

      const revenue = transactions.data
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions.data
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const financialData = {
        revenue,
        expenses,
        balance: revenue - expenses,
        growthPercentage: 0, // Calculate based on previous month
        recentTransactions: transactions.data.slice(0, 5)
      };

      res.json(financialData);
    } catch (error) {
      console.error('Financial data error:', error);
      res.status(500).json({
        error: 'Failed to fetch financial data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getClientMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const clients = await clientsService.getClients(req.tenantId, req.user.id, {});

      const currentMonth = new Date();
      currentMonth.setDate(1);

      const newThisMonth = clients.data.filter(c =>
        new Date(c.createdAt) >= currentMonth
      ).length;

      const metrics = {
        totalClients: clients.total,
        newThisMonth,
        growthPercentage: clients.total > 0 ? (newThisMonth / clients.total) * 100 : 0,
        byStatus: [
          { status: 'active', count: clients.data.filter(c => c.status === 'active').length },
          { status: 'inactive', count: clients.data.filter(c => c.status === 'inactive').length },
          { status: 'pending', count: clients.data.filter(c => c.status === 'pending').length },
        ],
      };

      res.json(metrics);
    } catch (error) {
      console.error('Client metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch client metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProjectMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || !req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const projects = await projectsService.getProjects(req.tenantId, req.user.id, {});

      const activeProjects = projects.data.filter(p =>
        p.stage !== 'won' && p.stage !== 'lost'
      ).length;

      const overdueProjects = projects.data.filter(p =>
        p.deadline && new Date(p.deadline) < new Date()
      ).length;

      const totalRevenue = projects.data
        .filter(p => p.stage === 'won')
        .reduce((sum, p) => sum + (p.value || 0), 0);

      const metrics = {
        totalProjects: projects.total,
        activeProjects,
        overdueProjects,
        averageProgress: projects.data.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.total || 0,
        totalRevenue,
      };

      res.json(metrics);
    } catch (error) {
      console.error('Project metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch project metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const dashboardController = new DashboardController();