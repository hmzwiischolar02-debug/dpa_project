import api from './api';

// Vehicles Service
export const vehiculesService = {
  /**
   * Get all vehicles with pagination and search
   */
  async getAll({ page = 1, per_page = 10, active_only = true, search = null } = {}) {
    const params = { page, per_page, active_only };
    if (search) params.search = search;
    const response = await api.get('/vehicules/', { params });
    // Return full response object for pagination data
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
  },

  /**
   * Get vehicle by police number
   */
  async getByPolice(police) {
    const response = await api.get(`/vehicules/by-police/${police}`);
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
   * Get all beneficiaires with pagination and search
   */
  async getAll({ page = 1, per_page = 10, search = null } = {}) {
    const params = { page, per_page };
    if (search) params.search = search;
    const response = await api.get('/benificiaires', { params });
    // Return full response object for pagination data
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
  },

  /**
   * Create beneficiaire (admin only)
   */
  async create(data) {
    const response = await api.post('/benificiaires', data);
    return response.data;
  },

  /**
   * Update beneficiaire (admin only)
   */
  async update(id, data) {
    const response = await api.put(`/benificiaires/${id}`, data);
    return response.data;
  },

  /**
   * Delete beneficiaire (admin only)
   */
  async delete(id) {
    const response = await api.delete(`/benificiaires/${id}`);
    return response.data;
  }
};