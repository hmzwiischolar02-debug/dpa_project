import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { statsService } from '../services/stats';
import { format } from 'date-fns';

export default function Anomalies() {
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => statsService.getAnomalies()
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          Détection d'Anomalies
        </h1>
        <p className="text-gray-600">
          Approvisionnements suspects détectés automatiquement
        </p>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">
              Critères de détection automatique
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Différence de kilométrage excessive (plus de 500 km en une journée)</li>
              <li>Kilométrage incohérent (KM actuel inférieur au précédent)</li>
              <li>Quantité anormale par rapport à la consommation habituelle</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Recherche d'anomalies...</p>
          </div>
        ) : anomalies && anomalies.length > 0 ? (
          <>
            <div className="p-6 bg-red-50 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-red-900">
                    {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} détectée{anomalies.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-red-700">
                    Veuillez vérifier ces approvisionnements
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left table-header">Date</th>
                    <th className="px-6 py-3 text-left table-header">Véhicule</th>
                    <th className="px-6 py-3 text-left table-header">Bénéficiaire</th>
                    <th className="px-6 py-3 text-left table-header">Service</th>
                    <th className="px-6 py-3 text-left table-header">Quantité</th>
                    <th className="px-6 py-3 text-left table-header">KM</th>
                    <th className="px-6 py-3 text-left table-header">Diff. KM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {anomalies.map((anomaly) => (
                    <tr key={anomaly.id} className="hover:bg-red-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(anomaly.date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{anomaly.police}</p>
                          <p className="text-sm text-gray-600">{anomaly.marque || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{anomaly.benificiaire}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{anomaly.service}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{anomaly.qte} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-600">
                            {anomaly.km_precedent} → {anomaly.km}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {anomaly.km_difference || (anomaly.km - anomaly.km_precedent)} km
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune anomalie détectée
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Tous les approvisionnements sont conformes aux critères de validation.
              Les anomalies seront affichées ici automatiquement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}