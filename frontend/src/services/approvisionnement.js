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
* Get last recorded KM for a vehicle by police number
   */
  async getLastKm(police) {
    const response = await api.get(`/approvisionnement/last-km/${police}`);
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
  async getList(skip = 0, limit = 1000, type_filter = null) {
    const params = { skip, limit };
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
  async getDotationList(skip = 0, limit = 1000) {
    return this.getList(skip, limit, 'DOTATION');
  },

  /**
   * Get MISSION approvisionnements only
   */
  async getMissionList(skip = 0, limit = 1000) {
    return this.getList(skip, limit, 'MISSION');
  },

  /**
   * Delete approvisionnement (admin only)
   */
  async delete(id) {
    const response = await api.delete(`/approvisionnement/${id}`);
    return response.data;
  }
};