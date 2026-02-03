import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, CheckCircle, XCircle, Archive, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { dotationService } from '../services/dotation';

export default function Dotation() {
  const [activeTab, setActiveTab] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState({
    police: '',
    service: '',
  });
  const itemsPerPage = 10;

  const { data: activeDotations, isLoading: loadingActive } = useQuery({
    queryKey: ['dotations', 'active'],
    queryFn: dotationService.getActive,
    enabled: activeTab === 'active',
  });

  const { data: archivedDotations, isLoading: loadingArchived } = useQuery({
    queryKey: ['dotations', 'archived'],
    queryFn: dotationService.getArchived,
    enabled: activeTab === 'archived',
  });

  const tabs = [
    { id: 'active', label: 'Dotations Actives', icon: CheckCircle },
    { id: 'archived', label: 'Archives', icon: Archive },
  ];

  const rawData = activeTab === 'active' ? activeDotations : archivedDotations;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchived;

  // Filter data
  const filteredData = rawData?.filter(item => {
    const matchPolice = !searchFilters.police || 
      item.police.toLowerCase().includes(searchFilters.police.toLowerCase());
    const matchService = !searchFilters.service || 
      item.service_nom.toLowerCase().includes(searchFilters.service.toLowerCase());
    return matchPolice && matchService;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters or tab changes
  const handleFilterChange = (field, value) => {
    setSearchFilters({ ...searchFilters, [field]: value });
    setCurrentPage(1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSearchFilters({ police: '', service: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Dotations</h1>
          <p className="text-gray-500">Quotas mensuels par véhicule</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="card p-6">
        {/* Search Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par police..."
              value={searchFilters.police}
              onChange={(e) => handleFilterChange('police', e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par service..."
              value={searchFilters.service}
              onChange={(e) => handleFilterChange('service', e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header px-4 py-3 text-left">N° Ordre</th>
                    <th className="table-header px-4 py-3 text-left">Véhicule</th>
                    <th className="table-header px-4 py-3 text-left">Bénéficiaire</th>
                    <th className="table-header px-4 py-3 text-left">Service</th>
                    <th className="table-header px-4 py-3 text-center">Mois/Année</th>
                    <th className="table-header px-4 py-3 text-right">Qté</th>
                    <th className="table-header px-4 py-3 text-right">Consommé</th>
                    <th className="table-header px-4 py-3 text-right">Reste</th>
                    <th className="table-header px-4 py-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                        Aucune dotation trouvée
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item) => (
                      <tr 
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{item.NumOrdre}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.police}</p>
                            <p className="text-xs text-gray-500">{item.marque}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">{item.benificiaire_nom}</p>
                            <p className="text-xs text-gray-500">{item.benificiaire_fonction}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.service_nom}</p>
                            <p className="text-xs text-gray-500">{item.direction}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {item.mois}/{item.annee}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {item.qte} L
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.qte_consomme.toFixed(2)} L
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${
                            item.reste < 20 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.reste.toFixed(2)} L
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.cloture ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                              <XCircle size={14} />
                              Clôturé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle size={14} />
                              Actif
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredData.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} dotation(s)
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return <span key={page} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}