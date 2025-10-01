/**
 * DASHBOARD CONTROLLER - Métricas e Estatísticas
 * ==============================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa req.tenantDB para garantir isolamento por schema
 * ✅ SEM DADOS MOCK: Agrega métricas reais de todos os módulos
 * ✅ CONTROLE DE ACESSO: Respeita restrições por tipo de conta
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { dashboardService } from '../services/dashboardService';
import { clientsService } from '../services/clientsService';
import { projectsService } from '../services/projectsService';
import { transactionsService } from '../services/transactionsService';

export class DashboardController {
  async getStats(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const metrics = await dashboardService.getDashboardMetrics(req.tenantDB, req.user.id, req.user.accountType);
      res.json(metrics);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getDashboard(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const [metrics, recentActivity, chartData] = await Promise.all([
        dashboardService.getDashboardMetrics(req.tenantDB, req.user.id, req.user.accountType),
        dashboardService.getRecentActivity(req.tenantDB, req.user.id, 10),
        dashboardService.getChartData(req.tenantDB, req.user.accountType)
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

  async getMetrics(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const metrics = await dashboardService.getDashboardMetrics(
        req.tenantDB,
        req.user.id,
        req.user.accountType || 'SIMPLES'
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

  async getFinancialData(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

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

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const transactions = await transactionsService.getTransactions(req.tenantDB, {
        startDate: currentMonth.toISOString(),
        endDate: new Date().toISOString()
      });

      const revenue = transactions.transactions
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = transactions.transactions
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const financialData = {
        revenue,
        expenses,
        balance: revenue - expenses,
        growthPercentage: 0,
        recentTransactions: transactions.transactions.slice(0, 5)
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

  async getClientMetrics(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const clients = await clientsService.getClients(req.tenantDB, {});

      const currentMonth = new Date();
      currentMonth.setDate(1);

      const newThisMonth = clients.clients.filter(c =>
        new Date(c.created_at) >= currentMonth
      ).length;

      const metrics = {
        totalClients: clients.pagination.total,
        newThisMonth,
        growthPercentage: clients.pagination.total > 0 ? (newThisMonth / clients.pagination.total) * 100 : 0,
        byStatus: [
          { status: 'active', count: clients.clients.filter(c => c.status === 'active').length },
          { status: 'inactive', count: clients.clients.filter(c => c.status === 'inactive').length },
          { status: 'pending', count: clients.clients.filter(c => c.status === 'pending').length },
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

  async getProjectMetrics(req: TenantRequest, res: Response) {
    try {
      if (!req.user || !req.tenantDB) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const projects = await projectsService.getProjects(req.tenantDB, {});

      const activeProjects = projects.projects.filter(p =>
        p.status !== 'won' && p.status !== 'lost'
      ).length;

      const overdueProjects = projects.projects.filter(p =>
        p.deadline && new Date(p.deadline) < new Date()
      ).length;

      const totalRevenue = projects.projects
        .filter(p => p.status === 'won')
        .reduce((sum, p) => sum + (p.budget || 0), 0);

      const metrics = {
        totalProjects: projects.pagination.total,
        activeProjects,
        overdueProjects,
        averageProgress: projects.projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.pagination.total || 0,
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