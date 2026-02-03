import { useQuery } from '@tanstack/react-query';
import { 
  Car, 
  Fuel, 
  FileText, 
  TrendingUp,
  Droplet,
  Zap,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { statsService } from '../services/stats';

export default function Statistiques() {
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsService.getDashboard,
  });
  const { data: consommationJourRaw } = useQuery({
  queryKey: ['consommation-jour'],
  queryFn: statsService.getConsommationParJour,
});

const consommationJour = consommationJourRaw ? [...consommationJourRaw].reverse() : [];

  const { data: consommationCarburant } = useQuery({
    queryKey: ['consommation-carburant'],
    queryFn: statsService.getConsommationParCarburant,
  });

  const { data: consommationService } = useQuery({
    queryKey: ['consommation-service'],
    queryFn: statsService.getConsommationParService,
  });

  const COLORS = {
    gazoil: '#f97316',
    essence: '#10b981',
  };

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

  if (loadingDashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Véhicules',
      value: dashboard?.total_vehicules || 0,
      icon: Car,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Dotations Actives',
      value: dashboard?.dotations_actives || 0,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Consommation Totale',
      value: `${dashboard?.consommation_totale?.toFixed(0) || 0} L`,
      icon: Fuel,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: 'Quota Total',
      value: `${dashboard?.quota_total || 0} L`,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
  ];

  const fuelTypeData = consommationCarburant?.map(item => ({
    name: item.carburant === 'gazoil' ? 'Gazoil' : 'Essence',
    value: parseFloat(item.total),
    color: COLORS[item.carburant],
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques du Mois</h1>
          <p className="text-gray-500">Vue d'ensemble de la consommation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="stat-card animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Type Distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Droplet className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Répartition par Carburant</h2>
          </div>
          {fuelTypeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fuelTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {fuelTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)} L`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
          )}
        </div>

        {/* Service Consumption */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Consommation par Service</h2>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {consommationService?.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{item.service}</p>
                  <p className="text-sm text-gray-500">{item.direction}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">{parseFloat(item.total).toFixed(1)} L</p>
                </div>
              </div>
            )) || <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>}
          </div>
        </div>
      </div>

      {/* Daily Consumption Chart */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-bold text-gray-900">Consommation Journalière</h2>
        </div>
        {consommationJour && consommationJour.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consommationJour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Litres', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value) => [`${parseFloat(value).toFixed(2)} L`, 'Consommation']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
        )}
      </div>
    </div>
  );
}