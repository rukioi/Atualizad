import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 e não for uma requisição de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // NÃO redirecionar automaticamente - deixar o componente lidar com isso
          console.error('No refresh token available');
          return Promise.reject(error);
        }

        // Tentar renovar o token
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('access_token', data.tokens.accessToken);
          localStorage.setItem('refresh_token', data.tokens.refreshToken);

          // Atualizar o header da requisição original
          originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;

          // Reenviar a requisição original
          return api(originalRequest);
        } else {
          // Se refresh falhar, apenas limpar tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          console.error('Token refresh failed');
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Se refresh falhar, apenas limpar tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        console.error('Token refresh error:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Export convenience methods
export const apiService = {
  get: api.get,
  post: api.post,
  put: api.put,
  patch: api.patch,
  delete: api.delete,
};