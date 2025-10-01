/**
 * DASHBOARD SERVICE - Métricas e Estatísticas
 * ==========================================
 * 
 * ✅ ISOLAMENTO TENANT: Usa TenantDatabase e helpers de isolamento
 * ✅ SEM DADOS MOCK: Agrega métricas reais de todos os módulos
 * ✅ CONTROLE DE ACESSO: Respeita restrições por tipo de conta
 */

import { TenantDatabase } from '../config/database';
import { queryTenantSchema } from '../utils/tenantHelpers';
import { clientsService } from './clientsService';
import { projectsService } from './projectsService';
import { tasksService } from './tasksService';
import { transactionsService } from './transactionsService';
import { invoicesService } from './invoicesService';
import { publicationsService } from './publicationsService';

export interface DashboardMetrics {
  financial: {
    revenue: number;
    expenses: number;
    balance: number;
    thisMonth: {
      revenue: number;
      expenses: number;
    };
    invoices: {
      total: number;
      paid: number;
      pending: number;
      overdue: number;
    };
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
    thisMonth: number;
  };
  projects: {
    total: number;
    contacted: number;
    proposal: number;
    won: number;
    lost: number;
    thisMonth: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    urgent: number;
  };
  publications?: {
    total: number;
    novo: number;
    lido: number;
    arquivado: number;
    thisMonth: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'client' | 'project' | 'task' | 'transaction' | 'invoice' | 'publication';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

export class DashboardService {
  /**
   * Obtém métricas agregadas do dashboard
   */
  async getDashboardMetrics(tenantDB: TenantDatabase, userId: string | undefined, accountType: 'SIMPLES' | 'COMPOSTA' | 'GERENCIAL'): Promise<DashboardMetrics> {
    const [clientsStats, projectsStats, tasksStats] = await Promise.all([
      clientsService.getClientsStats(tenantDB),
      projectsService.getProjectsStats(tenantDB),
      tasksService.getTaskStats(tenantDB)
    ]);

    let financialStats = {
      revenue: 0,
      expenses: 0,
      balance: 0,
      thisMonth: { revenue: 0, expenses: 0 },
      invoices: { total: 0, paid: 0, pending: 0, overdue: 0 }
    };

    let publicationsStats;

    if (accountType === 'COMPOSTA' || accountType === 'GERENCIAL') {
      const [transactionsStats, invoicesStats] = await Promise.all([
        transactionsService.getTransactionsStats(tenantDB),
        invoicesService.getInvoicesStats(tenantDB)
      ]);

      financialStats = {
        revenue: transactionsStats.totalIncome,
        expenses: transactionsStats.totalExpense,
        balance: transactionsStats.netAmount,
        thisMonth: {
          revenue: transactionsStats.thisMonthIncome,
          expenses: transactionsStats.thisMonthExpense
        },
        invoices: {
          total: invoicesStats.total,
          paid: invoicesStats.paid,
          pending: invoicesStats.pending,
          overdue: invoicesStats.overdue
        }
      };
    }

    if (userId) {
      publicationsStats = await publicationsService.getPublicationsStats(tenantDB, userId);
    }

    return {
      financial: financialStats,
      clients: clientsStats,
      projects: projectsStats,
      tasks: {
        total: parseInt(String(tasksStats.total)) || 0,
        completed: parseInt(String(tasksStats.completed)) || 0,
        inProgress: parseInt(String(tasksStats.in_progress)) || 0,
        notStarted: parseInt(String(tasksStats.not_started)) || 0,
        urgent: parseInt(String(tasksStats.urgent)) || 0
      },
      publications: publicationsStats
    };
  }

  /**
   * Obtém atividades recentes do usuário
   */
  async getRecentActivity(tenantDB: TenantDatabase, userId: string | undefined, limit: number = 10): Promise<RecentActivity[]> {
    if (!userId) {
      return [];
    }

    const activities: RecentActivity[] = [];

    const [recentClients, recentProjects, recentTasks] = await Promise.all([
      clientsService.getClients(tenantDB, { limit: 5, page: 1 }),
      projectsService.getProjects(tenantDB, { limit: 5, page: 1 }),
      tasksService.getTasks(tenantDB, 5, 0)
    ]);

    recentClients.clients.forEach(client => {
      activities.push({
        id: client.id,
        type: 'client',
        title: `Cliente: ${client.name}`,
        description: `Novo cliente adicionado`,
        date: client.created_at,
        status: client.status
      });
    });

    recentProjects.projects.forEach(project => {
      activities.push({
        id: project.id,
        type: 'project',
        title: `Projeto: ${project.title}`,
        description: `Cliente: ${project.client_name}`,
        date: project.created_at,
        status: project.status,
        amount: project.budget
      });
    });

    recentTasks.tasks.forEach(task => {
      activities.push({
        id: task.id,
        type: 'task',
        title: `Tarefa: ${task.title}`,
        description: `Progresso: ${task.progress}%`,
        date: task.created_at,
        status: task.status
      });
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Obtém dados para gráficos do dashboard
   */
  async getChartData(tenantDB: TenantDatabase, accountType: 'SIMPLES' | 'COMPOSTA' | 'GERENCIAL', period: string = '30d') {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const dateFromStr = dateFrom.toISOString().split('T')[0];

    let financialData = null;

    if (accountType === 'COMPOSTA' || accountType === 'GERENCIAL') {
      const transactionsByCategory = await transactionsService.getTransactionsByCategory(tenantDB, dateFromStr);

      financialData = {
        categories: transactionsByCategory,
        cashFlow: await this.getCashFlowData(tenantDB, dateFromStr)
      };
    }

    return {
      financial: financialData,
      projects: await this.getProjectsChartData(tenantDB, dateFromStr),
      tasks: await this.getTasksChartData(tenantDB, dateFromStr)
    };
  }

  /**
   * Dados do fluxo de caixa para gráficos
   */
  private async getCashFlowData(tenantDB: TenantDatabase, dateFrom: string) {
    const query = `
      SELECT 
        DATE(date) as day,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM \${schema}.transactions
      WHERE is_active = TRUE AND date >= $1::date
      GROUP BY DATE(date)
      ORDER BY day ASC
    `;

    const result = await queryTenantSchema(tenantDB, query, [dateFrom]);
    return result.map((row: any) => ({
      day: row.day,
      income: parseFloat(row.income || '0'),
      expense: parseFloat(row.expense || '0'),
      net: parseFloat(row.income || '0') - parseFloat(row.expense || '0')
    }));
  }

  /**
   * Dados de projetos para gráficos
   */
  private async getProjectsChartData(tenantDB: TenantDatabase, dateFrom: string) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(budget), 0) as total_budget
      FROM \${schema}.projects
      WHERE is_active = TRUE AND created_at >= $1::date
      GROUP BY status
    `;

    const result = await queryTenantSchema(tenantDB, query, [dateFrom]);
    return result.map((row: any) => ({
      status: row.status,
      count: parseInt(row.count || '0'),
      totalBudget: parseFloat(row.total_budget || '0')
    }));
  }

  /**
   * Dados de tarefas para gráficos
   */
  private async getTasksChartData(tenantDB: TenantDatabase, dateFrom: string) {
    const query = `
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        AVG(progress) as avg_progress
      FROM \${schema}.tasks
      WHERE is_active = TRUE AND created_at >= $1::date
      GROUP BY status, priority
    `;

    const result = await queryTenantSchema(tenantDB, query, [dateFrom]);
    return result.map((row: any) => ({
      status: row.status,
      priority: row.priority,
      count: parseInt(row.count || '0'),
      avgProgress: parseFloat(row.avg_progress || '0')
    }));
  }
}

export const dashboardService = new DashboardService();
