import apiClient from './api';

export const vehiculesService = {
  async getAll(activeOnly = true) {
    const response = await apiClient.get('/vehicules/', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/vehicules/${id}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/vehicules/', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.put(`/vehicules/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/vehicules/${id}`);
    return response.data;
  },
};

export const servicesService = {
  async getAll() {
    const response = await apiClient.get('/services');
    return response.data;
  },

  async getDirections() {
    const response = await apiClient.get('/directions');
    return response.data;
  },
};

export const benificiairesService = {
  async getAll() {
    const response = await apiClient.get('/benificiaires');
    return response.data;
  },

  async getByService(serviceId) {
    const response = await apiClient.get(`/benificiaires/by-service/${serviceId}`);
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/benificiaires/', data);
    return response.data;
  },

  async update(id, data) {
    const response = await apiClient.put(`/benificiaires/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/benificiaires/${id}`);
    return response.data;
  },
};