
import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface DashboardMetrics {
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

interface RecentActivity {
  id: string;
  type: 'client' | 'project' | 'task' | 'transaction' | 'invoice' | 'publication';
  title: string;
  description: string;
  date: string;
  status?: string;
  amount?: number;
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getDashboardMetrics();
      setMetrics(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
      setError(errorMessage);
      console.error('Dashboard metrics error:', err);
      
      // Set empty metrics instead of throwing
      setMetrics({
        financial: {
          revenue: 0,
          expenses: 0,
          balance: 0,
          thisMonth: { revenue: 0, expenses: 0 },
          invoices: { total: 0, paid: 0, pending: 0, overdue: 0 }
        },
        clients: { total: 0, active: 0, inactive: 0, thisMonth: 0 },
        projects: { total: 0, contacted: 0, proposal: 0, won: 0, lost: 0, thisMonth: 0 },
        tasks: { total: 0, completed: 0, inProgress: 0, notStarted: 0, urgent: 0 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentActivity = async (limit: number = 10) => {
    try {
      const response = await apiService.getRecentActivity(limit);
      setRecentActivity(response);
      return response;
    } catch (err) {
      console.error('Recent activity error:', err);
      setRecentActivity([]);
    }
  };

  const loadChartData = async (period: string = '30d') => {
    try {
      const response = await apiService.getChartData(period);
      setChartData(response);
      return response;
    } catch (err) {
      console.error('Chart data error:', err);
      setChartData({ revenue: [], expenses: [] });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.allSettled([
          loadDashboardMetrics(),
          loadRecentActivity(),
          loadChartData()
        ]);
      } catch (error) {
        console.error('Error loading initial dashboard data:', error);
      }
    };

    loadInitialData();
  }, []);

  return {
    metrics,
    recentActivity,
    chartData,
    isLoading,
    error,
    loadDashboardMetrics,
    loadRecentActivity,
    loadChartData,
  };
}
