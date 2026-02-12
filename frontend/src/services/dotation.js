import api from './api';

export const dotationService = {
  /**
   * Get all dotations (active or archived)
   */
  async getAll({ page = 1, per_page = 20, active_only = true }) {
    const endpoint = active_only ? '/dotation/active' : '/dotation/archived';
    const response = await api.get(endpoint, {
      params: { page, per_page }
    });
    return response.data;
  },

  /**
   * Get active dotations
   */
  async getActive(page = 1, per_page = 20) {
    const response = await api.get('/dotation/active', {
      params: { page, per_page }
    });
    return response.data;
  },

  /**
   * Get archived dotations
   */
  async getArchived(page = 1, per_page = 20) {
    const response = await api.get('/dotation/archived', {
      params: { page, per_page }
    });
    return response.data;
  },

  /**
   * Create new dotation (admin only)
   */
  async create(data) {
    const response = await api.post('/dotation/', data);
    return response.data;
  },

  /**
   * Close a dotation (admin only)
   */
  async close(id) {
    const response = await api.put(`/dotation/${id}/close`);
    return response.data;
  },

  /**
   * Get available vehicles for dotation (without active dotation for given month/year)
   */
  async getAvailableVehicles(mois, annee) {
    const response = await api.get('/dotation/available-vehicles', {
      params: { mois, annee }
    });
    return response.data;
  },

  /**
   * Get available beneficiaires for dotation (without active dotation for given month/year)
   */
  async getAvailableBenificiaires(mois, annee) {
    const response = await api.get('/dotation/available-benificiaires', {
      params: { mois, annee }
    });
    return response.data;
  }
};