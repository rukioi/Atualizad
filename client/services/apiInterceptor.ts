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
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      // Handle authentication errors
      if (status === 401) {
        // Clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Handle permission errors
      if (status === 403) {
        const errorCode = data?.code;
        
        // If it's a permission denied error, show friendly message
        if (errorCode === 'PERMISSION_DENIED') {
          // Redirect to access denied page
          window.location.href = '/acesso-negado';
          return Promise.reject(error);
        }

        // Show error toast for other 403 errors
        console.error('Access forbidden:', data?.error || 'You do not have permission to perform this action');
      }

      // Handle server errors
      if (status >= 500) {
        console.error('Server error:', data?.error || 'An unexpected error occurred. Please try again later.');
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
