// Role-based permission utilities

export const ROLES = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT'
};

export const PERMISSIONS = {
  // View permissions
  VIEW_DASHBOARD: ['ADMIN', 'AGENT'],
  VIEW_DOTATION: ['ADMIN', 'AGENT'],
  VIEW_VEHICLES: ['ADMIN', 'AGENT'],
  VIEW_STATS: ['ADMIN', 'AGENT'],
  VIEW_ANOMALIES: ['ADMIN', 'AGENT'],
  VIEW_HISTORY: ['ADMIN', 'AGENT'],
  
  // Create permissions
  CREATE_APPROVISIONNEMENT: ['ADMIN', 'AGENT'],
  CREATE_MISSION: ['ADMIN', 'AGENT'],
  CREATE_DOTATION: ['ADMIN'],
  CREATE_VEHICLE: ['ADMIN'],
  CREATE_BENEFICIAIRE: ['ADMIN'],
  
  // Edit permissions
  EDIT_DOTATION: ['ADMIN'],
  EDIT_VEHICLE: ['ADMIN'],
  EDIT_BENEFICIAIRE: ['ADMIN'],
  
  // Delete permissions
  DELETE_APPROVISIONNEMENT: ['ADMIN'],
  DELETE_DOTATION: ['ADMIN'],
  DELETE_VEHICLE: ['ADMIN'],
  DELETE_BENEFICIAIRE: ['ADMIN'],
  
  // Access to pages
  ACCESS_VEHICLES_PAGE: ['ADMIN'],
  ACCESS_BENEFICIAIRES_PAGE: ['ADMIN'],
  ACCESS_REPORTS_PAGE: ['ADMIN'],
  ACCESS_SETTINGS_PAGE: ['ADMIN'],
};

/**
 * Check if user has permission
 * @param {string} permission - Permission to check
 * @param {object} user - User object with role
 * @returns {boolean}
 */
export const hasPermission = (permission, user) => {
  if (!user || !user.role) return false;
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles && allowedRoles.includes(user.role);
};

/**
 * Check if user is admin
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return user?.role === ROLES.ADMIN;
};

/**
 * Check if user is agent
 * @param {object} user - User object
 * @returns {boolean}
 */
export const isAgent = (user) => {
  return user?.role === ROLES.AGENT;
};

/**
 * Get role display name
 * @param {string} role - Role string
 * @returns {string}
 */
export const getRoleDisplay = (role) => {
  return role === ROLES.ADMIN ? '👑 Administrateur' : '👤 Agent';
};

/**
 * Get role badge class
 * @param {string} role - Role string
 * @returns {string}
 */
export const getRoleBadgeClass = (role) => {
  return role === ROLES.ADMIN ? 'badge-admin' : 'badge-agent';
};