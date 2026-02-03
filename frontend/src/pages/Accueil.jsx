import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Fuel, 
  FileText, 
  AlertTriangle, 
  BarChart3,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { statsService } from '../services/stats';

export default function Accueil() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsService.getDashboard,
  });

  const quickActions = [
    {
      title: 'Nouvel Approvisionnement',
      description: 'Ajouter un nouvel approvisionnement en carburant',
      icon: Fuel,
      color: 'from-blue-500 to-blue-600',
      path: '/approvisionnement',
    },
    {
      title: 'Gérer les Dotations',
      description: 'Consulter et gérer les quotas mensuels',
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      path: '/dotation',
    },
    {
      title: 'Voir les Anomalies',
      description: 'Vérifier les approvisionnements anormaux',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      path: '/anomalies',
    },
    {
      title: 'Statistiques',
      description: 'Consulter les rapports et analyses',
      icon: BarChart3,
      color: 'from-green-500 to-green-600',
      path: '/statistiques',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const usagePercentage = dashboard?.quota_total 
    ? ((dashboard.consommation_totale / dashboard.quota_total) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="card p-8 bg-gradient-to-r from-primary-600 to-primary-700 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Bienvenue sur DPA SCL</h1>
          <p className="text-primary-100 text-lg">
            Système de Gestion du Parc Automobile
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{dashboard?.total_vehicules}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Véhicules Actifs</p>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{dashboard?.dotations_actives}</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Dotations Actives</p>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Fuel className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {dashboard?.consommation_totale?.toFixed(0)} L
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Consommation Totale</p>
        </div>

        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{usagePercentage}%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Taux d'utilisation</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.path}
                className="card p-6 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 bg-gradient-to-br ${action.color} rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Usage Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Utilisation Mensuelle</h2>
          <span className="text-sm text-gray-600">
            {dashboard?.consommation_totale?.toFixed(0)} / {dashboard?.quota_total} L
          </span>
        </div>
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span>0%</span>
          <span className="font-medium">{usagePercentage}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}