import api from './api';

export const statsService = {
  /**
   * Get dashboard statistics
   */
  async getDashboard() {
    const response = await api.get('/stats/dashboard');
    return response.data;
  },

  /**
   * Get daily consumption (last 30 days)
   */
  async getConsommationParJour() {
    const response = await api.get('/stats/consommation-par-jour');
    return response.data;
  },

  /**
   * Get consumption by fuel type
   */
  async getConsommationParCarburant() {
    const response = await api.get('/stats/consommation-par-carburant');
    return response.data;
  },

  /**
   * Get consumption by service
   */
  async getConsommationParService() {
    const response = await api.get('/stats/consommation-par-service');
    return response.data;
  },

  /**
   * Get consumption by type (DOTATION vs MISSION)
   */
  async getConsommationParType() {
    const response = await api.get('/stats/consommation-par-type');
    return response.data;
  },

  /**
   * Get anomalies
   */
  async getAnomalies() {
    const response = await api.get('/stats/anomalies');
    return response.data;
  }
};