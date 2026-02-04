import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Fuel, MapPin } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { statsService } from '../services/stats';

export default function Statistiques() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboard()
  });

  const { data: dailyData } = useQuery({
    queryKey: ['daily-consumption'],
    queryFn: () => statsService.getConsommationParJour()
  });

  const { data: fuelData } = useQuery({
    queryKey: ['fuel-consumption'],
    queryFn: () => statsService.getConsommationParCarburant()
  });

  const { data: serviceData } = useQuery({
    queryKey: ['service-consumption'],
    queryFn: () => statsService.getConsommationParService()
  });

  const { data: typeData } = useQuery({
    queryKey: ['type-consumption'],
    queryFn: () => statsService.getConsommationParType()
  });

  // Prepare type data for pie chart
  const typeChartData = typeData?.map(item => ({
    name: item.type_approvi,
    value: parseFloat(item.total),
    count: item.nombre
  })) || [];

  const COLORS = {
    DOTATION: '#3b82f6',
    MISSION: '#ef4444',
    gazoil: '#f97316',
    essence: '#10b981'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary-600" />
          Statistiques & Analyses
        </h1>
        <p className="text-gray-600">
          Vue d'ensemble de la consommation avec analyse par type
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Véhicules Actifs</p>
              <p className="text-3xl font-bold text-blue-900">{dashboard?.total_vehicules || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Dotations Actives</p>
              <p className="text-3xl font-bold text-green-900">{dashboard?.dotations_actives || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">Consommation</p>
              <p className="text-3xl font-bold text-orange-900">
                {dashboard?.consommation_totale?.toFixed(0) || 0}
                <span className="text-lg ml-1">L</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 mb-1">Quota Total</p>
              <p className="text-3xl font-bold text-purple-900">
                {dashboard?.quota_total || 0}
                <span className="text-lg ml-1">L</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* DOTATION vs MISSION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Pie Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            DOTATION vs MISSION
          </h3>
          
          {typeChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)} L`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {typeChartData.map((item) => (
                  <div key={item.name} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {item.name === 'DOTATION' ? (
                        <Fuel className="h-4 w-4 text-blue-600" />
                      ) : (
                        <MapPin className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{item.value.toFixed(0)} L</p>
                    <p className="text-xs text-gray-600">{item.count} approvisionnements</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Fuel Type Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary-600" />
            Distribution par Type de Carburant
          </h3>

          {fuelData && fuelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={fuelData.map(item => ({
                      name: item.carburant,
                      value: parseFloat(item.total)
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {fuelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.carburant]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)} L`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {fuelData.map((item) => (
                  <div key={item.carburant} className="p-3 bg-gray-50 rounded-lg">
                    <span className={`text-sm font-medium ${
                      item.carburant === 'gazoil' ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {item.carburant.toUpperCase()}
                    </span>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {parseFloat(item.total).toFixed(0)} L
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Daily Consumption Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          Consommation Journalière (30 derniers jours)
        </h3>

        {dailyData && dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toFixed(2)} L`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Consommation (L)"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Aucune donnée disponible
          </div>
        )}
      </div>

      {/* Service Consumption */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-600" />
          Consommation par Service
        </h3>

        {serviceData && serviceData.length > 0 ? (
          <div className="space-y-3">
            {serviceData.slice(0, 8).map((service, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{service.service}</p>
                    <p className="text-sm text-gray-600">{service.direction}</p>
                  </div>
                  <p className="text-xl font-bold text-primary-600">
                    {parseFloat(service.total).toFixed(0)} L
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(parseFloat(service.total) / Math.max(...serviceData.map(s => parseFloat(s.total)))) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  );
}