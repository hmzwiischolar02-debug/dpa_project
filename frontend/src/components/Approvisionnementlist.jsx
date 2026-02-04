import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Trash2, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import { getUser } from '../services/auth';
import TypeBadge from './Typebadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ApprovisionnementList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const itemsPerPage = 10;
  
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch approvisionnements
  const { data: approvisionnements, isLoading } = useQuery({
    queryKey: ['approvisionnements', typeFilter],
    queryFn: () => {
      if (typeFilter === 'all') return approvisionnementService.getList();
      return approvisionnementService.getList(0, 1000, typeFilter);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => approvisionnementService.delete(id),
    onSuccess: () => {
      toast.success('Approvisionnement supprimé');
      queryClient.invalidateQueries(['approvisionnements']);
      queryClient.invalidateQueries(['dashboard-stats']);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  // Filter and search
  const filteredData = approvisionnements?.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.police?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.benificiaire_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.service_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.police_vehicule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.matricule_conducteur?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet approvisionnement ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = ['Date', 'Type', 'Police/Véhicule', 'Bénéficiaire/Conducteur', 'Service', 'Quantité', 'KM'];
    const csvData = filteredData.map(item => [
      format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
      item.type_approvi,
      item.police || item.police_vehicule || '',
      item.benificiaire_nom || item.matricule_conducteur || '',
      item.service_nom || item.service_externe || '',
      item.qte,
      `${item.km_precedent} → ${item.km}`
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `approvisionnements_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
    toast.success('Export CSV réussi');
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher par police, bénéficiaire, service..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTypeFilter('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => {
                setTypeFilter('DOTATION');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'DOTATION'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              DOTATION
            </button>
            <button
              onClick={() => {
                setTypeFilter('MISSION');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'MISSION'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              MISSION
            </button>
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {currentData.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left table-header">Type</th>
                    <th className="px-6 py-3 text-left table-header">Date</th>
                    <th className="px-6 py-3 text-left table-header">Véhicule</th>
                    <th className="px-6 py-3 text-left table-header">Responsable</th>
                    <th className="px-6 py-3 text-left table-header">Service</th>
                    <th className="px-6 py-3 text-left table-header">Quantité</th>
                    <th className="px-6 py-3 text-left table-header">KM</th>
                    {isAdmin && <th className="px-6 py-3 text-left table-header">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <TypeBadge type={item.type_approvi} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(item.date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(item.date), 'HH:mm')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {item.police || item.police_vehicule || 'N/A'}
                        </p>
                        {item.vhc_provisoire && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            Provisoire: {item.vhc_provisoire}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {item.benificiaire_nom || item.matricule_conducteur || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {item.service_nom || item.service_externe || 'N/A'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{item.qte} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{item.km_precedent} → {item.km}</p>
                          <p className="text-xs text-gray-600">
                            +{item.km - item.km_precedent} km
                          </p>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Imprimer"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} résultat(s)
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600">Aucun approvisionnement trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}