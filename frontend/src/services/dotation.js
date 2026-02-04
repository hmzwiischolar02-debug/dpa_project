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
   * Get active dotations
   */
  async getActive() {
    const response = await api.get('/dotation/active');
    return response.data;
  },

  /**
   * Get archived dotations
   */
  async getArchived() {
    const response = await api.get('/dotation/archived');
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