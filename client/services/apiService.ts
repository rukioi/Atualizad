/**
 * API SERVICE - INTEGRAÇÃO COM BACKEND
 * ===================================
 *
 * Serviço centralizado para todas as chamadas de API.
 * Substitui os dados mock por integrações reais com o backend.
 */

class ApiService {
  private baseUrl = '/api';
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${this.token}`,
          };
          const retryResponse = await fetch(url, config);
          if (!retryResponse.ok) {
            throw new Error(`API Error: ${retryResponse.status}`);
          }
          return retryResponse.json();
        } else {
          // Redirect to login
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
      }

      if (response.status === 403) {
        // Permission denied - redirect to access denied page
        const error = await response.json().catch(() => ({}));
        window.location.href = '/acesso-negado';
        throw new Error(error.message || 'Access denied');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.tokens.accessToken;
        localStorage.setItem('access_token', data.tokens.accessToken);
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(response.tokens.accessToken);
    localStorage.setItem('refresh_token', response.tokens.refreshToken);
    
    return response;
  }

  async register(email: string, password: string, name: string, key: string) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, key }),
    });
    
    this.setToken(response.tokens.accessToken);
    localStorage.setItem('refresh_token', response.tokens.refreshToken);
    
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  // Dashboard
  async getDashboardMetrics() {
    return this.request('/dashboard/metrics');
  }

  async getFinancialData() {
    return this.request('/dashboard/financeiro');
  }

  async getClientMetrics() {
    return this.request('/dashboard/clientes');
  }

  async getProjectMetrics() {
    return this.request('/dashboard/projetos');
  }

  // Clients
  async getClients(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/clients?${query}`);
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/projects?${query}`);
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tasks?${query}`);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getTaskStats() {
    return this.request('/tasks/stats/overview');
  }

  // Transactions (Cash Flow)
  async getTransactions(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions?${query}`);
  }

  async getTransaction(id: string) {
    return this.request(`/transactions/${id}`);
  }

  async createTransaction(data: any) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id: string, data: any) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices (Billing)
  async getInvoices(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/invoices?${query}`);
  }

  async getInvoice(id: string) {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async getInvoiceStats() {
    return this.request('/invoices/stats/overview');
  }

  // Dashboard - Recent Activity
  async getRecentActivity(limit: number = 10) {
    return this.request(`/dashboard/recent-activity?limit=${limit}`);
  }

  // Dashboard - Chart Data
  async getChartData(period: string = '30d') {
    return this.request(`/dashboard/chart-data?period=${period}`);
  }

  // Notifications
  async getNotifications(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications?${query}`);
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }

  async createNotification(data: any) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PATCH',
      body: JSON.stringify({ markAll: true }),
    });
  }

  async deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();