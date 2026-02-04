import api from './api';

export const authService = {
  /**
   * Login user
   */
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      // Fetch user info after login
      const userInfo = await this.getCurrentUser();
      return userInfo;
    }
    return response.data;
  },

  /**
   * Get current user info
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  /**
   * Get stored user
   */
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if current user is admin
   */
  isAdmin() {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  },

  /**
   * Check if current user is agent
   */
  isAgent() {
    const user = this.getUser();
    return user?.role === 'AGENT';
  }
};

// Export helper functions
export const { isAuthenticated, getUser, isAdmin, isAgent, logout } = authService;