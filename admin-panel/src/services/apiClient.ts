// Admin Panel API Client

import axios, { AxiosInstance } from 'axios';

class AdminApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string) {
    return this.client.get<T>(url);
  }

  post<T = any>(url: string, data?: any) {
    return this.client.post<T>(url, data);
  }

  put<T = any>(url: string, data?: any) {
    return this.client.put<T>(url, data);
  }

  delete<T = any>(url: string) {
    return this.client.delete<T>(url);
  }
}

const apiClient = new AdminApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
);

export default apiClient;
