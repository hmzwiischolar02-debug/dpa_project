import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import { format } from 'date-fns';

export default function ApprovisionnementList() {
  const [searchFilters, setSearchFilters] = useState({
    police: '',
    service: '',
  });

  const { data: approvisionnements, isLoading } = useQuery({
    queryKey: ['approvisionnements'],
    queryFn: () => approvisionnementService.getList(0, 100),
  });

  const filteredData = approvisionnements?.filter(item => {
    const matchPolice = !searchFilters.police || 
      item.police.toLowerCase().includes(searchFilters.police.toLowerCase());
    const matchService = !searchFilters.service || 
      item.service.toLowerCase().includes(searchFilters.service.toLowerCase());
    return matchPolice && matchService;
  }) || [];

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900">Liste des Approvisionnements</h2>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} />
          Exporter
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par police..."
            value={searchFilters.police}
            onChange={(e) => setSearchFilters({ ...searchFilters, police: e.target.value })}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par service..."
            value={searchFilters.service}
            onChange={(e) => setSearchFilters({ ...searchFilters, service: e.target.value })}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header px-4 py-3 text-left">Date</th>
              <th className="table-header px-4 py-3 text-left">Police</th>
              <th className="table-header px-4 py-3 text-left">Marque</th>
              <th className="table-header px-4 py-3 text-left">Carburant</th>
              <th className="table-header px-4 py-3 text-left">Bénéficiaire</th>
              <th className="table-header px-4 py-3 text-left">Service</th>
              <th className="table-header px-4 py-3 text-right">Qté (L)</th>
              <th className="table-header px-4 py-3 text-right">KM</th>
              <th className="table-header px-4 py-3 text-right">Quota</th>
              <th className="table-header px-4 py-3 text-right">Consommé</th>
              <th className="table-header px-4 py-3 text-right">Reste</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                  Aucun approvisionnement trouvé
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr 
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(new Date(item.date), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.police}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.marque}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      item.carburant === 'gazoil' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.carburant}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.benificiaire}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.service}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-primary-600">{item.qte.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {item.km_actuel.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{item.quota}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {item.qte_consomme.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${
                      item.reste < 20 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {item.reste.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{filteredData.length} résultat(s)</span>
        </div>
      )}
    </div>
  );
}