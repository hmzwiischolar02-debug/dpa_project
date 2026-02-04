import api from './api';

export const dotationService = {
  /**
   * Create new dotation (admin only)
   */
  async create(data) {
    const response = await api.post('/dotation/', data);
    return response.data;
  },

  /**
   * Get active dotations with pagination
   */
  async getActive({ page = 1, per_page = 1000, search = null } = {}) {
    const params = { page, per_page };
    if (search) params.search = search;
    const response = await api.get('/dotation/active', { params });
    // Return full response object for pagination data
    return response.data;
  },

  /**
   * Get archived dotations with pagination
   */
  async getArchived({ page = 1, per_page = 1000, search = null } = {}) {
    const params = { page, per_page };
    if (search) params.search = search;
    const response = await api.get('/dotation/archived', { params });
    // Return full response object for pagination data
    return response.data;
  },

  /**
   * Get available vehicles (without active dotation)
   */
  async getAvailableVehicles(mois, annee) {
    const response = await api.get('/dotation/available-vehicles', {
      params: { mois, annee }
    });
    return response.data;
  },

  /**
   * Get available beneficiaires (without active dotation)
   */
  async getAvailableBenificiaires(mois, annee) {
    const response = await api.get('/dotation/available-benificiaires', {
      params: { mois, annee }
    });
    return response.data;
  },

  /**
   * Get all dotations (active + archived)
   */
  async getAll() {
    const [active, archived] = await Promise.all([
      this.getActive(),
      this.getArchived()
    ]);
    return [...active, ...archived];
  },

  /**
   * Delete dotation (admin only)
   */
  async delete(id) {
    const response = await api.delete(`/dotation/${id}`);
    return response.data;
  },

  /**
   * Update dotation (admin only)
   */
  async update(id, data) {
    const response = await api.put(`/dotation/${id}`, data);
    return response.data;
  },

  /**
   * Close dotation (admin only)
   */
  async close(id) {
    const response = await api.put(`/dotation/${id}/close`);
    return response.data;
  }
};