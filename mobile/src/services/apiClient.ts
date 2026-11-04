import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to headers
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_TOKEN);
          await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
          // Trigger logout
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

  patch<T = any>(url: string, data?: any) {
    return this.client.patch<T>(url, data);
  }
}

export default new ApiClient();
