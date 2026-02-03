import apiClient from './api';

export const approvisionnementService = {
  async searchVehicle(police) {
    const response = await apiClient.post('/approvisionnement/search', { police });
    return response.data;
  },

  async create(data) {
    const response = await apiClient.post('/approvisionnement/', data);
    return response.data;
  },

  async getList(skip = 0, limit = 100) {
    const response = await apiClient.get('/approvisionnement/list', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getByService(serviceName) {
    const response = await apiClient.get(`/approvisionnement/by-service/${serviceName}`);
    return response.data;
  },

  async getByVehicle(police) {
    const response = await apiClient.get(`/approvisionnement/by-vehicle/${police}`);
    return response.data;
  },

  async update(id, qte) {
    const response = await apiClient.put(`/approvisionnement/${id}`, null, {
      params: { qte },
    });
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/approvisionnement/${id}`);
    return response.data;
  },
};