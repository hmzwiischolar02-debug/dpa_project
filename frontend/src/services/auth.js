import apiClient from './api';

export const authService = {
  async login(username, password) {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      const user = await this.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    }
    
    throw new Error('Login failed');
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};