import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Car, FileText, Fuel, MapPin, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { statsService } from '../services/stats';
import { getUser } from '../services/auth';

export default function Dashboard() {
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboard()
  });

  // Fetch type breakdown
  const { data: typeStats } = useQuery({
    queryKey: ['type-stats'],
    queryFn: () => statsService.getConsommationParType()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const dotationPercent = stats?.quota_total > 0 
    ? ((stats.consommation_dotation / stats.quota_total) * 100).toFixed(1)
    : 0;

  const totalConsumption = stats?.consommation_totale || 0;
  const dotationConsumption = stats?.consommation_dotation || 0;
  const missionConsumption = stats?.consommation_mission || 0;

  const dotationPercentOfTotal = totalConsumption > 0
    ? ((dotationConsumption / totalConsumption) * 100).toFixed(1)
    : 0;

  const missionPercentOfTotal = totalConsumption > 0
    ? ((missionConsumption / totalConsumption) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tableau de Bord
        </h1>
        <p className="text-gray-600">
          {isAdmin ? 'Vue d\'ensemble complète du système' : 'Votre tableau de bord'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vehicles */}
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Véhicules</p>
              <p className="text-3xl font-bold text-blue-900">{stats?.total_vehicules || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Dotations Actives */}
        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Dotations Actives</p>
              <p className="text-3xl font-bold text-green-900">{stats?.dotations_actives || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Consommation Totale */}
        <div className="stat-card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Consommation Totale</p>
              <p className="text-3xl font-bold text-orange-900">
                {totalConsumption.toFixed(0)}
                <span className="text-lg ml-1">L</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Utilization */}
        <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Qte Mensuel Utilisé</p>
              <p className="text-3xl font-bold text-purple-900">
                {dotationPercent}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* DOTATION vs MISSION Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOTATION Stats */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Approvisionnement DOTATION</h3>
              <p className="text-sm text-gray-600">Qte mensuels</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Consommation</span>
                <span className="font-semibold text-blue-600">
                  {dotationConsumption.toFixed(0)} L
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Part du total</span>
                <span className="font-semibold text-blue-600">
                  {dotationPercentOfTotal}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Nombre d'approvisionements</span>
                <span className="font-semibold text-blue-600">
                  {stats?.nombre_appro_dotation || 0}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${dotationPercentOfTotal}%` }}
                />
              </div>
            </div>

            <Link
              to="/approvisionnement"
              className="block w-full text-center btn-dotation"
            >
              Nouvel approvisionnement DOTATION
            </Link>
          </div>
        </div>

        {/* MISSION Stats */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Approvisionnement MISSION</h3>
              <p className="text-sm text-gray-600">Missions externes</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-red-600" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Consommation</span>
                <span className="font-semibold text-red-600">
                  {missionConsumption.toFixed(0)} L
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Part du total</span>
                <span className="font-semibold text-red-600">
                  {missionPercentOfTotal}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Nombre de missions</span>
                <span className="font-semibold text-red-600">
                  {stats?.nombre_appro_mission || 0}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${missionPercentOfTotal}%` }}
                />
              </div>
            </div>

            <Link
              to="/mission"
              className="block w-full text-center btn-mission"
            >
              Nouvelle mission
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/dotation"
          className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Gérer les Dotations</h3>
              <p className="text-sm text-gray-600">Qte mensuels</p>
            </div>
          </div>
        </Link>

        <Link
          to="/statistiques"
          className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Statistiques</h3>
              <p className="text-sm text-gray-600">Analyses détaillées</p>
            </div>
          </div>
        </Link>

        <Link
          to="/anomalies"
          className="card p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Anomalies</h3>
              <p className="text-sm text-gray-600">Détection automatique</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Role-specific message */}
      {!isAdmin && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Mode Agent:</strong> Vous avez accès aux fonctions de consultation et de création d'approvisionnements.
            Contactez un administrateur pour les modifications avancées.
          </p>
        </div>
      )}
    </div>
  );
}