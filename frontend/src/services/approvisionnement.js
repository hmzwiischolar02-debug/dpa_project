import api from './api';

export const approvisionnementService = {
  /**
   * Search for vehicle by police number (DOTATION - requires active dotation)
   */
  async searchVehicle(police) {
    const response = await api.post('/approvisionnement/search', { police });
    return response.data;
  },

  /**
   * Search for vehicle by police number (MISSION - no dotation required)
   */
  async searchVehicleMission(police) {
    const response = await api.post('/approvisionnement/search-mission', { police });
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
  async getList(page = 1, per_page = 1000, type_filter = null) {
    const params = { page, per_page };
    if (type_filter && type_filter !== 'all') {
      params.type_filter = type_filter;
    }
    const response = await api.get('/approvisionnement/list', { params });
    return response.data;
  },

  /**
   * Get DOTATION approvisionnements only
   */
  async getDotationList() {
    return this.getList(1, 1000, 'DOTATION');
  },

  /**
   * Get MISSION approvisionnements only
   */
  async getMissionList() {
    return this.getList(1, 1000, 'MISSION');
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