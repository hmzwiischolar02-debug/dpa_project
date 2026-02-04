import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { dotationService } from '../services/dotation';
import { getUser } from '../services/auth';
import ReadOnlyBanner from '../components/Readonlybanner';

export default function Dotation() {
  const [activeTab, setActiveTab] = useState('active');
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  // Fetch active dotations
  const { data: activeDotations, isLoading: loadingActive } = useQuery({
    queryKey: ['dotations', 'active'],
    queryFn: () => dotationService.getActive(),
    enabled: activeTab === 'active'
  });

  // Fetch archived dotations
  const { data: archivedDotations, isLoading: loadingArchived } = useQuery({
    queryKey: ['dotations', 'archived'],
    queryFn: () => dotationService.getArchived(),
    enabled: activeTab === 'archived'
  });

  const currentData = activeTab === 'active' ? activeDotations : archivedDotations;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchived;

  const getStatusColor = (reste) => {
    if (reste < 20) return 'text-red-600';
    if (reste < 50) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <FileText className="h-8 w-8 text-indigo-600" />
          Gestion des Dotations
        </h1>
        <p className="text-gray-600">
          {isAdmin 
            ? 'Gérer les quotas mensuels de carburant'
            : 'Consulter les dotations mensuelles'
          }
        </p>
      </div>

      {/* Read-Only Banner for AGENT */}
      {!isAdmin && <ReadOnlyBanner />}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Dotations Actives
            {activeDotations && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                {activeDotations.length}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('archived')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'archived'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Archives
            {archivedDotations && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                {archivedDotations.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : currentData && currentData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Véhicule</th>
                  <th className="px-6 py-3 text-left table-header">Bénéficiaire</th>
                  <th className="px-6 py-3 text-left table-header">Service</th>
                  <th className="px-6 py-3 text-left table-header">Période</th>
                  <th className="px-6 py-3 text-left table-header">Quota</th>
                  <th className="px-6 py-3 text-left table-header">Consommé</th>
                  <th className="px-6 py-3 text-left table-header">Reste</th>
                  <th className="px-6 py-3 text-left table-header">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentData.map((dotation) => (
                  <tr key={dotation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{dotation.police}</p>
                        <p className="text-sm text-gray-600">{dotation.marque || 'N/A'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          dotation.carburant === 'gazoil' 
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {dotation.carburant}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{dotation.benificiaire_nom}</p>
                        <p className="text-sm text-gray-600">{dotation.benificiaire_fonction}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{dotation.service_nom}</p>
                        <p className="text-sm text-gray-600">{dotation.direction}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {dotation.mois.toString().padStart(2, '0')}/{dotation.annee}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{dotation.qte} L</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{dotation.qte_consomme.toFixed(2)} L</p>
                        <p className="text-xs text-gray-600">
                          {((dotation.qte_consomme / dotation.qte) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`font-bold text-lg ${getStatusColor(dotation.reste)}`}>
                        {dotation.reste.toFixed(2)} L
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        dotation.cloture
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {dotation.cloture ? 'Clôturé' : 'Actif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune dotation trouvée
            </h3>
            <p className="text-gray-600">
              {activeTab === 'active'
                ? 'Aucune dotation active pour le moment'
                : 'Aucune dotation archivée'
              }
            </p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {currentData && currentData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <p className="text-sm text-blue-600 mb-1">Total Dotations</p>
            <p className="text-2xl font-bold text-blue-900">{currentData.length}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-sm text-green-600 mb-1">Quota Total</p>
            <p className="text-2xl font-bold text-green-900">
              {currentData.reduce((sum, d) => sum + d.qte, 0)} L
            </p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-orange-50 to-orange-100">
            <p className="text-sm text-orange-600 mb-1">Consommé</p>
            <p className="text-2xl font-bold text-orange-900">
              {currentData.reduce((sum, d) => sum + d.qte_consomme, 0).toFixed(0)} L
            </p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-purple-50 to-purple-100">
            <p className="text-sm text-purple-600 mb-1">Reste</p>
            <p className="text-2xl font-bold text-purple-900">
              {currentData.reduce((sum, d) => sum + d.reste, 0).toFixed(0)} L
            </p>
          </div>
        </div>
      )}
    </div>
  );
}