import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import { generateBonPDF } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ApprovisionnementList() {
  const [searchFilters, setSearchFilters] = useState({
    police: '',
    service: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: approvisionnements, isLoading } = useQuery({
    queryKey: ['approvisionnements'],
    queryFn: () => approvisionnementService.getList(0, 1000),
  });

  // Filter data
  const filteredData = approvisionnements?.filter(item => {
    const matchPolice = !searchFilters.police || 
      item.police.toLowerCase().includes(searchFilters.police.toLowerCase());
    const matchService = !searchFilters.service || 
      item.service.toLowerCase().includes(searchFilters.service.toLowerCase());
    return matchPolice && matchService;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (field, value) => {
    setSearchFilters({ ...searchFilters, [field]: value });
    setCurrentPage(1);
  };

  // Export function
  const handleExport = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = [
      'Date',
      'Police',
      'Marque',
      'Carburant',
      'Bénéficiaire',
      'Service',
      'Qté (L)',
      'KM',
      'Qté',
      'Consommé',
      'Reste'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
        item.police,
        item.marque || '',
        item.carburant,
        item.benificiaire,
        item.service,
        item.qte.toFixed(2),
        item.km,
        item.quota,
        item.qte_consomme.toFixed(2),
        item.reste.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `approvisionnements_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export réussi!');
  };

  // Print function
  const handlePrint = async (item) => {
    try {
      const vehicleData = {
        police: item.police,
        nCivil: item.nCivil,
        marque: item.marque,
        carburant: item.carburant,
        km: item.km_precedent,
        benificiaire: item.benificiaire,
        service: item.service,
        direction: item.direction,
        quota: item.quota,
        qte_consomme: item.qte_consomme - item.qte,
        reste: item.reste + item.qte,
      };
      
      const formData = {
        qte: item.qte.toString(),
        km_actuel: item.km.toString(),
      };
      
      await generateBonPDF(vehicleData, formData);
      toast.success('Bon PDF régénéré!');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

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
        <button 
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
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
              <th className="table-header px-4 py-3 text-right">Qté</th>
              <th className="table-header px-4 py-3 text-right">Consommé</th>
              <th className="table-header px-4 py-3 text-right">Reste</th>
              <th className="table-header px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                  Aucun approvisionnement trouvé
                </td>
              </tr>
            ) : (
              currentData.map((item) => (
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
                    {item.km.toLocaleString()}
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
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handlePrint(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Imprimer le bon"
                    >
                      <Printer size={18} />
                    </button>
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
            Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} résultat(s)
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
                // Show first page, last page, current page, and pages around current
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
    </div>
  );
}