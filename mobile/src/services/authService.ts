import { AuthResponse, User } from '@/types';
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/config';

class AuthService {
  async register(phoneNumber: string, fullName: string, password: string, language: string = 'tj') {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      phone_number: phoneNumber,
      full_name: fullName,
      password,
      language,
    });
    
    if (response.data.token) {
      await this.saveToken(response.data.token);
      await this.saveUser(response.data.user);
    }
    
    return response.data;
  }

  async login(phoneNumber: string, password: string) {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      phone_number: phoneNumber,
      password,
    });
    
    if (response.data.token) {
      await this.saveToken(response.data.token);
      await this.saveUser(response.data.user);
    }
    
    return response.data;
  }

  async verifyPhone(userId: string, smsCode: string) {
    return apiClient.post('/auth/verify-phone', {
      user_id: userId,
      sms_code: smsCode,
    });
  }

  async saveToken(token: string) {
    await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_TOKEN, token);
  }

  async getToken() {
    return AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_TOKEN);
  }

  async saveUser(user: User) {
    await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  async logout() {
    await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_TOKEN);
    await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

export default new AuthService();
