import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { statsService } from '../services/stats';
import { format } from 'date-fns';

export default function Anomalies() {
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: statsService.getAnomalies,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liste des Anomalies</h1>
          <p className="text-gray-500">Approvisionnements marqués comme anormaux</p>
        </div>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4">
              <div className="grid grid-cols-5 gap-4 font-semibold text-sm">
                <div>Véhicule</div>
                <div>Date</div>
                <div className="text-right">Qté (L)</div>
                <div className="text-right">KM avant</div>
                <div className="text-right">KM après</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {anomalies?.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-green-50 rounded-full">
                      <AlertTriangle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">Aucune anomalie détectée</p>
                    <p className="text-sm text-gray-500">Tous les approvisionnements sont conformes</p>
                  </div>
                </div>
              ) : (
                anomalies?.map((item) => (
                  <div 
                    key={item.id}
                    className="px-6 py-4 hover:bg-red-50 transition-colors"
                  >
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{item.police}</p>
                        <p className="text-sm text-gray-500">{item.marque}</p>
                        <p className="text-xs text-gray-400">{item.benificiaire} - {item.service}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">
                          {format(new Date(item.date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(item.date), 'HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{item.qte.toFixed(2)} L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">{item.km_precedent.toLocaleString()} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">{item.km_actuel.toLocaleString()} km</p>
                        <p className="text-xs text-gray-500">
                          +{(item.km_actuel - item.km_precedent).toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {anomalies && anomalies.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <span className="font-bold text-red-600">{anomalies.length}</span> anomalie(s) détectée(s)
                  </span>
                  <span className="text-gray-500">
                    Ces approvisionnements nécessitent une vérification
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">À propos des anomalies</h3>
            <p className="text-sm text-blue-700">
              Les anomalies sont automatiquement détectées par le système lorsqu'un approvisionnement 
              présente des valeurs inhabituelles (quantité excessive, kilométrage anormal, etc.). 
              Ces entrées nécessitent une vérification manuelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}