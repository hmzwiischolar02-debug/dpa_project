import api from './api';

// Vehicles Service
export const vehiculesService = {
  /**
   * Get all vehicles
   */
  async getAll(activeOnly = true) {
    const response = await api.get('/vehicules/', { params: { active_only: activeOnly } });
    return response.data;
  },

  /**
   * Get vehicle by ID
   */
  async getById(id) {
    const response = await api.get(`/vehicules/${id}`);
    return response.data;
  },

  /**
   * Create vehicle (admin only)
   */
  async create(data) {
    const response = await api.post('/vehicules/', data);
    return response.data;
  },

  /**
   * Update vehicle (admin only)
   */
  async update(id, data) {
    const response = await api.put(`/vehicules/${id}`, data);
    return response.data;
  },

  /**
   * Deactivate vehicle (admin only)
   */
  async delete(id) {
    const response = await api.delete(`/vehicules/${id}`);
    return response.data;
  }
};

// Services Service
export const servicesService = {
  /**
   * Get all services
   */
  async getAll() {
    const response = await api.get('/services');
    return response.data;
  },

  /**
   * Get service by ID
   */
  async getById(id) {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  /**
   * Get all directions
   */
  async getDirections() {
    const response = await api.get('/directions');
    return response.data;
  }
};

// Beneficiaires Service
export const benificiairesService = {
  /**
   * Get all beneficiaires
   */
  async getAll() {
    const response = await api.get('/benificiaires');
    return response.data;
  },

  /**
   * Get beneficiaire by ID
   */
  async getById(id) {
    const response = await api.get(`/benificiaires/${id}`);
    return response.data;
  },

  /**
   * Get beneficiaires by service
   */
  async getByService(serviceId) {
    const response = await api.get(`/benificiaires/by-service/${serviceId}`);
    return response.data;
  }
};