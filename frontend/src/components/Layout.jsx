import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Fuel, MapPin, FileText, Car, Users, AlertTriangle, 
  BarChart3, Clock, FileBarChart, Settings, Menu, X, LogOut, Crown, User
} from 'lucide-react';
import { getUser, logout } from '../services/auth';
import { hasPermission } from '../utils/permissions';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  // Menu items with role-based access
  const menuItems = [
    { 
      path: '/', 
      icon: Home, 
      label: 'Accueil', 
      roles: ['ADMIN', 'AGENT'] 
    },
    { 
      path: '/approvisionnement', 
      icon: Fuel, 
      label: 'Approvisionnement', 
      roles: ['ADMIN', 'AGENT'],
      badge: 'DOT',
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    { 
      path: '/mission', 
      icon: MapPin, 
      label: 'Mission', 
      roles: ['ADMIN', 'AGENT'],
      badge: 'NEW',
      badgeColor: 'bg-red-100 text-red-700'
    },
    { 
      path: '/dotation', 
      icon: FileText, 
      label: 'Dotation', 
      roles: ['ADMIN', 'AGENT'],
      readOnly: !isAdmin
    },
    { 
      path: '/vehicules', 
      icon: Car, 
      label: 'Véhicules', 
      roles: ['ADMIN']  // ADMIN only
    },
    { 
      path: '/benificiaires', 
      icon: Users, 
      label: 'Bénéficiaires', 
      roles: ['ADMIN']  // ADMIN only
    },
    { 
      path: '/anomalies', 
      icon: AlertTriangle, 
      label: 'Anomalies', 
      roles: ['ADMIN', 'AGENT']
    },
    { 
      path: '/statistiques', 
      icon: BarChart3, 
      label: 'Statistiques', 
      roles: ['ADMIN', 'AGENT']
    },
    { 
      path: '/historique', 
      icon: Clock, 
      label: 'Historique', 
      roles: ['ADMIN', 'AGENT']
    },
    { 
      path: '/rapports', 
      icon: FileBarChart, 
      label: 'Rapports', 
      roles: ['ADMIN']  // ADMIN only
    },
  ];

  // Filter menu items by role
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
      navigate('/login');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white fixed h-full">
        {/* Logo & Title */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">DPA SCL</h1>
              <p className="text-xs text-slate-400">Gestion du Parc Auto</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {isAdmin ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.username}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isAdmin ? 'bg-red-500/20 text-red-200' : 'bg-blue-500/20 text-blue-200'
              }`}>
                {isAdmin ? '👑 Admin' : '👤 Agent'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium flex-1">{item.label}</span>
                    
                    {/* Badge */}
                    {item.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Read-only indicator */}
                    {item.readOnly && (
                      <span className="text-xs text-slate-400">(Vue)</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white z-50 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Same content as desktop sidebar */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">DPA SCL</h1>
              <p className="text-xs text-slate-400">Gestion du Parc</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {isAdmin ? <Crown className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.username}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isAdmin ? 'bg-red-500/20 text-red-200' : 'bg-blue-500/20 text-blue-200'
              }`}>
                {isAdmin ? '👑 Admin' : '👤 Agent'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      active
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    {item.readOnly && (
                      <span className="text-xs text-slate-400">(Vue)</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-primary-600" />
              <span className="font-bold text-gray-900">DPA SCL</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {isAdmin ? (
                <Crown className="h-4 w-4 text-red-600" />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}