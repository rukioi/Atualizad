/**
 * DASHBOARD SERVICE - MÉTRICAS E ESTATÍSTICAS
 * ==========================================
 * 
 * Serviço responsável por agregar métricas de todos os módulos para o dashboard.
 * Respeita isolamento por tenant e restrições por tipo de conta.
 */

import { tenantDB } from './tenantDatabase';
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
  async getDashboardMetrics(tenantId: string, userId: string, accountType: 'SIMPLES' | 'COMPOSTA' | 'GERENCIAL'): Promise<DashboardMetrics> {
    try {
      console.log(`=== DASHBOARD METRICS REQUEST ===`);
      console.log(`Tenant ID: ${tenantId}`);
      console.log(`User ID: ${userId}`);
      console.log(`Account Type: ${accountType}`);

      if (!tenantId) {
        throw new Error('TenantId is required for dashboard metrics');
      }
      if (!userId) {
        throw new Error('UserId is required for dashboard metrics');
      }
      if (!accountType) {
        throw new Error('AccountType is required for dashboard metrics');
      }

      // Assumindo que getTenantDatabase é um método que retorna uma instância de conexão/query para o tenant específico
      // e que o tenantDB importado acima é um utilitário para obter essa instância.
      const tenantDBConnection = await tenantDB.getTenantDatabase(tenantId);

      if (!tenantDBConnection) {
        throw new Error(`Failed to initialize tenant database for: ${tenantId}`);
      }
      console.log('Tenant database initialized successfully');

      // Métricas básicas (todos os tipos de conta)
      const [clientsStats, projectsStats, tasksStats] = await Promise.all([
        clientsService.getClientsStats(tenantId),
        projectsService.getProjectsStats(tenantId),
        tasksService.getTaskStats(tenantId)
      ]);

      let financialStats = {
        revenue: 0,
        expenses: 0,
        balance: 0,
        thisMonth: { revenue: 0, expenses: 0 },
        invoices: { total: 0, paid: 0, pending: 0, overdue: 0 }
      };

      let publicationsStats;

      // Métricas financeiras apenas para COMPOSTA e GERENCIAL
      if (accountType === 'COMPOSTA' || accountType === 'GERENCIAL') {
        const [transactionsStats, invoicesStats] = await Promise.all([
          transactionsService.getTransactionsStats(tenantId),
          invoicesService.getInvoicesStats(tenantId)
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

      // Publications stats (isolado por usuário)
      publicationsStats = await publicationsService.getPublicationsStats(tenantId, userId);

      return {
        financial: financialStats,
        clients: clientsStats,
        projects: projectsStats,
        tasks: {
          total: parseInt(tasksStats.total) || 0,
          completed: parseInt(tasksStats.completed) || 0,
          inProgress: parseInt(tasksStats.in_progress) || 0,
          notStarted: parseInt(tasksStats.not_started) || 0,
          urgent: parseInt(tasksStats.urgent) || 0
        },
        publications: publicationsStats
      };
    } catch (error) {
      console.error(`Error getting dashboard metrics for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém atividades recentes do usuário
   */
  async getRecentActivity(tenantId: string, userId: string, limit: number = 10): Promise<RecentActivity[]> {
    try {
      console.log(`Getting recent activity for tenant: ${tenantId}, user: ${userId}`);

      if (!tenantId) {
        throw new Error('TenantId is required for recent activity');
      }
      if (!userId) {
        throw new Error('UserId is required for recent activity');
      }

      const activities: RecentActivity[] = [];

      // Buscar atividades de cada módulo
      const [recentClients, recentProjects, recentTasks] = await Promise.all([
        clientsService.getClients(tenantId, { limit: 5, page: 1 }),
        projectsService.getProjects(tenantId, { limit: 5, page: 1 }),
        tasksService.getTasks(tenantId, 5, 0)
      ]);

      // Adicionar clientes recentes
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

      // Adicionar projetos recentes
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

      // Adicionar tarefas recentes
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

      // Ordenar por data e limitar
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error(`Error getting recent activity for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém dados para gráficos do dashboard
   */
  async getChartData(tenantId: string, accountType: 'SIMPLES' | 'COMPOSTA' | 'GERENCIAL', period: string = '30d') {
    try {
      console.log(`Getting chart data for tenant: ${tenantId}, account type: ${accountType}, period: ${period}`);

      if (!tenantId) {
        throw new Error('TenantId is required for chart data');
      }
      if (!accountType) {
        throw new Error('AccountType is required for chart data');
      }

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30); // Default to 30 days ago
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      let financialData = null;

      // Dados financeiros apenas para COMPOSTA e GERENCIAL
      if (accountType === 'COMPOSTA' || accountType === 'GERENCIAL') {
        const transactionsByCategory = await transactionsService.getTransactionsByCategory(
          tenantId, 
          undefined, // Assuming this parameter is optional or can be derived
          dateFromStr
        );

        financialData = {
          categories: transactionsByCategory,
          cashFlow: await this.getCashFlowData(tenantId, dateFromStr)
        };
      }

      return {
        financial: financialData,
        projects: await this.getProjectsChartData(tenantId, dateFromStr),
        tasks: await this.getTasksChartData(tenantId, dateFromStr)
      };
    } catch (error) {
      console.error(`Error getting chart data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Dados do fluxo de caixa para gráficos
   */
  private async getCashFlowData(tenantId: string, dateFrom: string) {
    console.log(`Getting cash flow data for tenant: ${tenantId} from: ${dateFrom}`);
    const query = `
      SELECT 
        DATE(date) as day,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM ${tenantDB.getSchemaName(tenantId)}.transactions
      WHERE is_active = TRUE AND date >= $1
      GROUP BY DATE(date)
      ORDER BY day ASC
    `;

    try {
      const result = await tenantDB.executeInTenantSchema(tenantId, query, [dateFrom]);
      return result.map((row: any) => ({
        day: row.day,
        income: parseFloat(row.income || '0'),
        expense: parseFloat(row.expense || '0'),
        net: parseFloat(row.income || '0') - parseFloat(row.expense || '0')
      }));
    } catch (error) {
      console.error(`Error executing cash flow query for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Dados de projetos para gráficos
   */
  private async getProjectsChartData(tenantId: string, dateFrom: string) {
    console.log(`Getting projects chart data for tenant: ${tenantId} from: ${dateFrom}`);
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(budget), 0) as total_budget
      FROM ${tenantDB.getSchemaName(tenantId)}.projects
      WHERE is_active = TRUE AND created_at >= $1
      GROUP BY status
    `;

    try {
      const result = await tenantDB.executeInTenantSchema(tenantId, query, [dateFrom]);
      return result.map((row: any) => ({
        status: row.status,
        count: parseInt(row.count || '0'),
        totalBudget: parseFloat(row.total_budget || '0')
      }));
    } catch (error) {
      console.error(`Error executing projects chart query for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Dados de tarefas para gráficos
   */
  private async getTasksChartData(tenantId: string, dateFrom: string) {
    console.log(`Getting tasks chart data for tenant: ${tenantId} from: ${dateFrom}`);
    const query = `
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        AVG(progress) as avg_progress
      FROM ${tenantDB.getSchemaName(tenantId)}.tasks
      WHERE is_active = TRUE AND created_at >= $1
      GROUP BY status, priority
    `;

    try {
      const result = await tenantDB.executeInTenantSchema(tenantId, query, [dateFrom]);
      return result.map((row: any) => ({
        status: row.status,
        priority: row.priority,
        count: parseInt(row.count || '0'),
        avgProgress: parseFloat(row.avg_progress || '0')
      }));
    } catch (error) {
      console.error(`Error executing tasks chart query for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  // Dummy implementation for getTenantDatabase and getSchemaName if they are not provided elsewhere.
  // Replace these with your actual implementations.
  private async getTenantDatabase(tenantId: string) {
    console.log(`Attempting to get tenant database connection for tenant: ${tenantId}`);
    // In a real application, this would involve looking up connection details for the tenant
    // and returning a database client instance or a function to execute queries.
    // For demonstration, we'll assume `tenantDB.executeInTenantSchema` handles the connection.
    // If `tenantDB.executeInTenantSchema` requires a pre-established connection object,
    // you'd return that object here.
    
    // Simulate a delay or async operation
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // Mocking the return value assuming tenantDB.executeInTenantSchema will use the tenantId internally
    // or that this function is meant to return something that can be used to get the schema name.
    // If tenantDB itself is the object that has executeInTenantSchema, then this might just return tenantDB.
    
    // If tenantDB is an object that already has executeInTenantSchema, and schema name retrieval is separate:
    // return {
    //     execute: async (query: string, params: any[]) => await tenantDB.executeInTenantSchema(tenantId, query, params),
    //     getSchema: () => tenantDB.getSchemaName(tenantId)
    // };
    
    // Given the usage in private methods: `${tenantDB.getSchemaName(tenantId)}.${tableName}`
    // It seems `tenantDB` is an object that has both `executeInTenantSchema` and `getSchemaName`.
    // So, we might not need to return anything specific from `getTenantDatabase` if `tenantDB` is already imported and configured.
    // Let's assume `tenantDB` is globally accessible and configured.
    
    // If `getTenantDatabase` is truly needed to *initialize* something for the tenant:
    // return { execute: async (q, p) => tenantDB.executeInTenantSchema(tenantId, q, p), getSchema: () => tenantDB.getSchemaName(tenantId) };

    // For the current structure, it seems `tenantDB` is directly used, so this method might just confirm existence or setup.
    // If `tenantDB.executeInTenantSchema` requires a connection object, this method would return it.
    // Let's refine based on common patterns: assume `tenantDB` is the module/object providing the execution.
    
    // If `tenantDB` is a module that handles connections internally per call to `executeInTenantSchema`:
    if (tenantId) {
        // Simulate successful initialization check
        return tenantDB; // Returning the imported module itself if it's used directly.
    }
    return null; // Indicate failure if tenantId is missing (though checked earlier)
  }

  // Dummy implementation for getSchemaName if it's not part of the provided tenantDB.
  // This is based on its usage in the private methods.
  private getSchemaName(tenantId: string): string {
    console.log(`Getting schema name for tenant: ${tenantId}`);
    // In a real application, this would map a tenantId to a database schema name.
    // Example: return `tenant_${tenantId.toLowerCase()}`;
    return `tenant_${tenantId.toLowerCase()}`; // Placeholder
  }
}

export const dashboardService = new DashboardService();