import apiClient from './api';

export const dotationService = {
  async create(data) {
    const response = await apiClient.post('/dotation/', data);
    return response.data;
  },

  async getActive() {
    const response = await apiClient.get('/dotation/active');
    return response.data;
  },

  async getArchived() {
    const response = await apiClient.get('/dotation/archived');
    return response.data;
  },

  async getAll() {
    const response = await apiClient.get('/dotation/all');
    return response.data;
  },

  async getVehiclesWithout(mois, annee) {
    const response = await apiClient.get(`/dotation/vehicles-without/${mois}/${annee}`);
    return response.data;
  },

  async close(id) {
    const response = await apiClient.put(`/dotation/${id}/close`);
    return response.data;
  },

  async reopen(id) {
    const response = await apiClient.put(`/dotation/${id}/reopen`);
    return response.data;
  },

  async delete(id) {
    const response = await apiClient.delete(`/dotation/${id}`);
    return response.data;
  },
};