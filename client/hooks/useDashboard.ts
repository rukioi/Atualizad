
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDefaultMetrics = (): DashboardMetrics => ({
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

  const loadDashboardMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getDashboardMetrics();
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }
      
      // Ensure all required properties exist
      const validatedMetrics = {
        financial: response.financial || getDefaultMetrics().financial,
        clients: response.clients || getDefaultMetrics().clients,
        projects: response.projects || getDefaultMetrics().projects,
        tasks: response.tasks || getDefaultMetrics().tasks,
        publications: response.publications
      };
      
      setMetrics(validatedMetrics);
      return validatedMetrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard metrics';
      setError(errorMessage);
      console.error('Dashboard metrics error:', err);
      
      // Set default metrics to prevent rendering errors
      const defaultMetrics = getDefaultMetrics();
      setMetrics(defaultMetrics);
      return defaultMetrics;
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentActivity = async (limit: number = 10) => {
    try {
      const response = await apiService.getRecentActivity(limit);
      
      // Validate response is an array
      if (!Array.isArray(response)) {
        console.warn('Recent activity response is not an array, using empty array');
        setRecentActivity([]);
        return [];
      }
      
      // Validate each activity item
      const validatedActivity = response.filter(item => 
        item && 
        typeof item === 'object' && 
        item.id && 
        item.type && 
        item.title && 
        item.date
      );
      
      setRecentActivity(validatedActivity);
      return validatedActivity;
    } catch (err) {
      console.error('Recent activity error:', err);
      setRecentActivity([]);
      return [];
    }
  };

  const loadChartData = async (period: string = '30d') => {
    try {
      const response = await apiService.getChartData(period);
      
      // Provide default structure if response is invalid
      const defaultChartData = {
        revenue: [],
        expenses: [],
        financial: null,
        projects: [],
        tasks: []
      };
      
      if (!response || typeof response !== 'object') {
        setChartData(defaultChartData);
        return defaultChartData;
      }
      
      setChartData(response);
      return response;
    } catch (err) {
      console.error('Chart data error:', err);
      const defaultChartData = {
        revenue: [],
        expenses: [],
        financial: null,
        projects: [],
        tasks: []
      };
      setChartData(defaultChartData);
      return defaultChartData;
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
