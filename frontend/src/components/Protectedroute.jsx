import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../services/auth';
import { Lock } from 'lucide-react';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  // Check authentication
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin) {
    const user = getUser();
    
    if (user?.role !== 'ADMIN') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-8 text-center animate-fade-in">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Accès Refusé
            </h2>
            
            <p className="text-gray-600 mb-6">
              Cette page est réservée aux administrateurs. Vous n'avez pas les permissions nécessaires pour y accéder.
            </p>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Votre rôle :</strong> {user?.role === 'AGENT' ? '👤 Agent' : user?.role}
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                <strong>Requis :</strong> 👑 Administrateur
              </p>
            </div>
            
            <button
              onClick={() => window.history.back()}
              className="btn-secondary w-full"
            >
              ← Retour
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
}