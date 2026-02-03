import apiClient from './api';

export const statsService = {
  async getDashboard() {
    const response = await apiClient.get('/stats/dashboard');
    return response.data;
  },

  async getConsommationParJour() {
    const response = await apiClient.get('/stats/consommation-par-jour');
    return response.data;
  },

  async getConsommationParCarburant() {
    const response = await apiClient.get('/stats/consommation-par-carburant');
    return response.data;
  },

  async getConsommationParService() {
    const response = await apiClient.get('/stats/consommation-par-service');
    return response.data;
  },

  async getAnomalies() {
    const response = await apiClient.get('/stats/anomalies');
    return response.data;
  },

  async getMonthly(mois, annee) {
    const response = await apiClient.get(`/stats/monthly/${mois}/${annee}`);
    return response.data;
  },
};