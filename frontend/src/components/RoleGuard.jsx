import { getUser } from '../services/auth';

/**
 * RoleGuard - Conditionally render children based on user role
 * 
 * Usage:
 * <RoleGuard roles={['ADMIN']}>
 *   <AdminOnlyContent />
 * </RoleGuard>
 * 
 * <RoleGuard roles={['ADMIN', 'AGENT']}>
 *   <BothCanSee />
 * </RoleGuard>
 */
export default function RoleGuard({ children, roles, fallback = null }) {
  const user = getUser();
  
  if (!user || !roles.includes(user.role)) {
    return fallback;
  }
  
  return children;
}