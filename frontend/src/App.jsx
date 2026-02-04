import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { isAuthenticated } from './services/auth';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Approvisionnement from './pages/Approvisionnement';
import Mission from './pages/Missions';
import Dotation from './pages/Dotation';
import Anomalies from './pages/Anomalies';
import Statistiques from './pages/Statistiques';
import Vehicules from './pages/Vehicules';
import Historique from './pages/Historique';
import Benificiaires from './pages/Benificiaires';
import Rapports from './pages/Rapports';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Route - Login */}
          <Route 
            path="/login" 
            element={
              isAuthenticated() ? <Navigate to="/" replace /> : <Login />
            } 
          />

          {/* Protected Routes - All wrapped in Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    {/* Dashboard - Both ADMIN and AGENT */}
                    <Route path="/" element={<Dashboard />} />

                    {/* Approvisionnement DOTATION - Both can create */}
                    <Route path="/approvisionnement" element={<Approvisionnement />} />

                    {/* Mission - Both can create */}
                    <Route path="/mission" element={<Mission />} />

                    {/* Dotation - Both can view, ADMIN can edit */}
                    <Route path="/dotation" element={<Dotation />} />

                    {/* Anomalies - Both can view */}
                    <Route path="/anomalies" element={<Anomalies />} />

                    {/* Statistiques - Both can view */}
                    <Route path="/statistiques" element={<Statistiques />} />

                    {/* Vehicules - ADMIN only */}
                    <Route 
                      path="/vehicules" 
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <Vehicules />
                        </ProtectedRoute>
                      } 
                    />

                    {/* Historique - Both can view */}
                    <Route path="/historique" element={<Historique />} />

                    {/* Benificiaires - ADMIN only */}
                    <Route 
                      path="/benificiaires" 
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <Benificiaires />
                        </ProtectedRoute>
                      } 
                    />

                    {/* Rapports - ADMIN only */}
                    <Route 
                      path="/rapports" 
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <Rapports />
                        </ProtectedRoute>
                      } 
                    />

                    {/* 404 - Redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;