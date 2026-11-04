import apiClient from './apiClient';

interface DashboardStats {
  total_mosques: number;
  active_campaigns: number;
  total_donations: number;
  total_users: number;
  pending_campaigns: number;
  total_savob_distributed: number;
}

class AdminService {
  async getDashboardStats() {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard');
    return response.data;
  }

  async getCampaigns(status?: string) {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/admin/campaigns${params}`);
    return response.data;
  }

  async approveCampaign(campaignId: string, approved: boolean, reason?: string) {
    return apiClient.put(`/campaigns/${campaignId}/approve`, {
      approved,
      reason,
    });
  }

  async rejectCampaign(campaignId: string, reason: string) {
    return apiClient.put(`/campaigns/${campaignId}/approve`, {
      approved: false,
      reason,
    });
  }

  async getMosques() {
    return apiClient.get('/admin/mosques');
  }

  async blockMosque(mosqueId: string, reason: string) {
    return apiClient.put(`/admin/mosques/${mosqueId}/block`, { reason });
  }

  async getReports(status?: string) {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`/admin/reports${params}`);
  }

  async approveReport(reportId: string) {
    return apiClient.put(`/reports/${reportId}/approve`, { approved: true });
  }

  async rejectReport(reportId: string, reason: string) {
    return apiClient.put(`/reports/${reportId}/approve`, { approved: false, reason });
  }
}

export default new AdminService();
