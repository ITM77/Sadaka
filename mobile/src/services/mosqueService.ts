import { Mosque, PaginatedResponse } from '@/types';
import apiClient from './apiClient';

class MosqueService {
  async getMosques(city?: string, limit: number = 20, offset: number = 0) {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const response = await apiClient.get<PaginatedResponse<Mosque>>(
      `/mosques?${params.toString()}`
    );
    return response.data;
  }

  async getMosqueById(id: string) {
    return apiClient.get<{
      mosque: Mosque;
      active_campaigns: any[];
      completed_campaigns: any[];
    }>(`/mosques/${id}`);
  }

  async getMosquesOnMap(latitude: number, longitude: number, radius: number = 5) {
    const response = await apiClient.get(`/map/mosques`, {
      params: { latitude, longitude, radius },
    });
    return response.data;
  }

  async createMosque(data: Partial<Mosque>) {
    return apiClient.post('/mosques', data);
  }

  async updateMosque(id: string, data: Partial<Mosque>) {
    return apiClient.put(`/mosques/${id}`, data);
  }
}

export default new MosqueService();
