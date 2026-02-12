import api from './api';

export const approvisionnementService = {
  /**
   * Search for vehicle by police number
   */
  async searchVehicle(police) {
    const response = await api.post('/approvisionnement/search', { police });
    return response.data;
  },

  /**
   * Create DOTATION approvisionnement
   */
  async createDotation(data) {
    const response = await api.post('/approvisionnement/dotation', {
      type_approvi: 'DOTATION',
      ...data
    });
    return response.data;
  },

  /**
   * Create MISSION approvisionnement
   */
  async createMission(data) {
    const response = await api.post('/approvisionnement/mission', {
      type_approvi: 'MISSION',
      ...data
    });
    return response.data;
  },

  /**
   * Get list of all approvisionnements
   */
  async getList(page = 1, per_page = 5000, type_filter = null) {
    const params = { page, per_page };
    if (type_filter) {
      params.type_filter = type_filter;
    }
    const response = await api.get('/approvisionnement/list', { params });
    // Return full response object for pagination data
    return response.data;
  },

  /**
   * Get DOTATION approvisionnements only
   */
  async getDotationList(page = 1, per_page = 5000) {
    return this.getList(page, per_page, 'DOTATION');
  },

  /**
   * Get MISSION approvisionnements only
   */
  async getMissionList(page = 1, per_page = 5000) {
    return this.getList(page, per_page, 'MISSION');
  },

  /**
   * Delete approvisionnement (admin only)
   */
  async delete(id) {
    const response = await api.delete(`/approvisionnement/${id}`);
    return response.data;
  },

  /**
   * Get approvisionnements by dotation ID
   */
  async getByDotation(dotationId) {
    const response = await api.get(`/approvisionnement/by-dotation/${dotationId}`);
    return response.data;
  }
};