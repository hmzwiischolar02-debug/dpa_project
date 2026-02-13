import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Users, Fuel, FileText, AlertCircle, ChevronRight, ChevronDown, Search, FileSpreadsheet } from 'lucide-react';
import { dotationService } from '../services/dotation';
import { vehiculesService } from '../services/vehicules';
import { benificiairesService } from '../services/vehicules';
import { approvisionnementService } from '../services/approvisionnement';
import { exportDotationsToExcel } from '../utils/excelExport';
import { getUser } from '../services/auth';
import Pagination from '../components/Pagination';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import React from 'react';

export default function Dotation() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDotation, setExpandedDotation] = useState(null);
  const perPage = 10;
  
  const [formData, setFormData] = useState({
    vehicule_id: '',
    benificiaire_id: '',
    mois: '',
    annee: new Date().getFullYear(),
    qte: ''
  });

  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch dotations - Get ALL for client-side search/pagination
  const { data: paginationData, isLoading } = useQuery({
    queryKey: ['dotations', activeTab],
    queryFn: () => dotationService.getAll({
      page: 1,
      per_page: 1000, // Get all dotations
      active_only: activeTab === 'active'
    })
  });

  const allData = paginationData?.items || [];

  // Client-side search filter - searches ALL data
  const filteredData = allData.filter(dotation => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      dotation.police?.toLowerCase().includes(search) ||
      dotation.marque?.toLowerCase().includes(search) ||
      dotation.benificiaire_nom?.toLowerCase().includes(search) ||
      dotation.service_nom?.toLowerCase().includes(search)||
      dotation.direction?.toLowerCase().includes(search)

    );
  });

  // Client-side pagination - paginate filtered results
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Fetch AVAILABLE vehicles for form (only those without active dotation)
  const { data: vehiclesData } = useQuery({
    queryKey: ['available-vehicles', formData.mois, formData.annee],
    queryFn: () => dotationService.getAvailableVehicles(formData.mois, formData.annee),
    enabled: isAdmin && showForm && !!formData.mois && !!formData.annee
  });

  // Fetch AVAILABLE beneficiaires for form (only those without active dotation)
  const { data: beneficiairesData } = useQuery({
    queryKey: ['available-beneficiaires', formData.mois, formData.annee],
    queryFn: () => dotationService.getAvailableBenificiaires(formData.mois, formData.annee),
    enabled: isAdmin && showForm && !!formData.mois && !!formData.annee
  });

  // Extract items from available lists (API returns array directly, not paginated)
  const vehicles = vehiclesData || [];
  const beneficiaires = beneficiairesData || [];

  // Fetch approvisionnements for expanded dotation (Feature 1)
  const { data: dotationAppros, isLoading: loadingAppros } = useQuery({
    queryKey: ['dotation-appros', expandedDotation],
    queryFn: () => approvisionnementService.getByDotation(expandedDotation),
    enabled: expandedDotation !== null
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => dotationService.create(data),
    onSuccess: () => {
      toast.success('Dotation créée avec succès!');
      queryClient.invalidateQueries(['dotations']);
      queryClient.invalidateQueries(['dashboard-stats']);
      setShowForm(false);
      setFormData({
        vehicule_id: '',
        benificiaire_id: '',
        mois: '',
        annee: new Date().getFullYear(),
        qte: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  });

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: (id) => dotationService.close(id),
    onSuccess: () => {
      toast.success('Dotation clôturée');
      queryClient.invalidateQueries(['dotations']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleClose = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir clôturer cette dotation?')) {
      closeMutation.mutate(id);
    }
  };

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      const filename = exportDotationsToExcel(filteredData);
      toast.success(`Fichier Excel exporté: ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const months = [
    { value: '1', label: 'Janvier' },
    { value: '2', label: 'Février' },
    { value: '3', label: 'Mars' },
    { value: '4', label: 'Avril' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juin' },
    { value: '7', label: 'Juillet' },
    { value: '8', label: 'Août' },
    { value: '9', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' }
  ];

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Fuel className="h-8 w-8 text-primary-600" />
            Dotations Mensuelles
          </h1>
          <p className="text-gray-600">
            {isAdmin
              ? 'Gérer les quotas mensuels de carburant'
              : 'Consulter les dotations mensuelles'
            }
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouvelle dotation
          </button>
        )}
      </div>

      {/* Read-Only Banner for AGENT */}
      {!isAdmin && <ReadOnlyBanner />}

      {/* Create/Edit Form */}
      {isAdmin && showForm && (
        <div className="card p-6 animate-slide-in">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Nouvelle dotation mensuelle
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Month - FIRST */}
              <div>
                <label className="label">
                  Mois <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mois}
                  onChange={(e) => {
                    setFormData({
                      ...formData, 
                      mois: e.target.value,
                      vehicule_id: '', // Reset selections when month changes
                      benificiaire_id: ''
                    });
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un mois</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Year - SECOND */}
              <div>
                <label className="label">
                  Année <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.annee}
                  onChange={(e) => {
                    setFormData({
                      ...formData, 
                      annee: e.target.value,
                      vehicule_id: '', // Reset selections when year changes
                      benificiaire_id: ''
                    });
                  }}
                  className="input-field"
                  min="2020"
                  max="2030"
                  required
                />
              </div>

              {/* Vehicle Selection - THIRD (disabled until mois/annee selected) */}
              <div>
                <label className="label">
                  Véhicule <span className="text-red-500">*</span>
                  {!formData.mois || !formData.annee ? (
                    <span className="text-xs text-gray-500 ml-2">(Sélectionner mois/année d'abord)</span>
                  ) : vehicles && vehicles.length === 0 ? (
                    <span className="text-xs text-orange-500 ml-2">(Aucun véhicule disponible)</span>
                  ) : null}
                </label>
                <select
                  value={formData.vehicule_id}
                  onChange={(e) => setFormData({...formData, vehicule_id: e.target.value})}
                  className="input-field"
                  required
                  disabled={!formData.mois || !formData.annee}
                >
                  <option value="">Sélectionner un véhicule</option>
                  {vehicles?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.police} - {v.marque || 'N/A'} ({v.carburant})
                    </option>
                  ))}
                </select>
              </div>

              {/* Beneficiaire Selection - FOURTH (disabled until mois/annee selected) */}
              <div>
                <label className="label">
                  Bénéficiaire <span className="text-red-500">*</span>
                  {!formData.mois || !formData.annee ? (
                    <span className="text-xs text-gray-500 ml-2">(Sélectionner mois/année d'abord)</span>
                  ) : beneficiaires && beneficiaires.length === 0 ? (
                    <span className="text-xs text-orange-500 ml-2">(Aucun bénéficiaire disponible)</span>
                  ) : null}
                </label>
                <select
                  value={formData.benificiaire_id}
                  onChange={(e) => setFormData({...formData, benificiaire_id: e.target.value})}
                  className="input-field"
                  required
                  disabled={!formData.mois || !formData.annee}
                >
                  <option value="">Sélectionner un bénéficiaire</option>
                  {beneficiaires?.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nom} - {b.fonction}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="label">
                  Quantité (L) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.qte}
                  onChange={(e) => setFormData({...formData, qte: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 140"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Création...' : 'Créer la dotation'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar + Export Button */}
<div className="card p-4 flex items-center gap-4">
  
  {/* Search */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
    <input
      type="text"
      value={searchTerm}
      onChange={handleSearchChange}
      placeholder="Rechercher par véhicule, bénéficiaire, service..."
      className="input-field pl-10 w-full"
    />
    {searchTerm && (
      <button
        onClick={() => {
          setSearchTerm('');
          setPage(1);
        }}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    )}
  </div>

  {/* Export Button */}
  <button
    onClick={handleExportExcel}
    className="btn-secondary flex items-center gap-2 whitespace-nowrap"
  >
    <FileSpreadsheet className="h-5 w-5" />
    Export Excel
  </button>

</div>


      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('active');
            setPage(1);
            setSearchTerm('');
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Dotations Actives
        </button>
        <button
          onClick={() => {
            setActiveTab('archived');
            setPage(1);
            setSearchTerm('');
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'archived'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Archives
        </button>
        
      </div>
                {/* Stats Summary with Export Button */}
      {filteredData && filteredData.length > 0 && (
        <div className="flex items-start gap-4">
          {/* Stats Cards */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100">
              <p className="text-sm text-blue-600 mb-1">Total Dotations</p>
              <p className="text-2xl font-bold text-blue-900">{filteredData.length}</p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100">
              <p className="text-sm text-green-600 mb-1">QTE Mensuel Total</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredData.reduce((sum, d) => sum + d.qte, 0)} L
              </p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-orange-50 to-orange-100">
              <p className="text-sm text-orange-600 mb-1">Consommé</p>
              <p className="text-2xl font-bold text-orange-900">
                {filteredData.reduce((sum, d) => sum + d.qte_consomme, 0).toFixed(0)} L
              </p>
            </div>
            <div className="card p-4 bg-gradient-to-br from-purple-50 to-purple-100">
              <p className="text-sm text-purple-600 mb-1">Reste</p>
              <p className="text-2xl font-bold text-purple-900">
                {filteredData.reduce((sum, d) => sum + d.reste, 0).toFixed(0)} L
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Dotations Table */}
      <div className="card overflow-hidden">
        {currentData && currentData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Véhicule</th>
                  <th className="px-6 py-3 text-left table-header">Bénéficiaire</th>
                  <th className="px-6 py-3 text-left table-header">Service</th>
                  <th className="px-6 py-3 text-left table-header">Période</th>
                  <th className="px-6 py-3 text-left table-header">Qte Mensuel</th>
                  <th className="px-6 py-3 text-left table-header">Consommé</th>
                  <th className="px-6 py-3 text-left table-header">Reste</th>
                  <th className="px-6 py-3 text-left table-header">Statut</th>
                  {isAdmin && <th className="px-6 py-3 text-left table-header">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentData.map((dotation) => (
                  <React.Fragment key={dotation.id}>
                    {/* Main Row */}
                    <tr 
                      onClick={() => setExpandedDotation(expandedDotation === dotation.id ? null : dotation.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expandedDotation === dotation.id ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{dotation.police}</p>
                            <p className="text-sm text-gray-600">{dotation.marque}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{dotation.benificiaire_nom || dotation.benificiaire || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{dotation.benificiaire_fonction || dotation.fonction || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{dotation.direction || dotation.direction || 'N/A'}</p>
                        <p className="text-xs text-gray-600">{dotation.service_nom || dotation.service_nom || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {months.find(m => m.value === dotation.mois.toString())?.label} {dotation.annee}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{dotation.qte} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{dotation.qte_consomme.toFixed(2)} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-semibold ${
                          dotation.reste < 20 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {dotation.reste.toFixed(2)} L
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {dotation.cloture ? (
                          <span className="badge-archived">Clôturée</span>
                        ) : (
                          <span className="badge-active">Active</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {!dotation.cloture && (
                            <button
                              onClick={() => handleClose(dotation.id)}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                            >
                              Clôturer
                            </button>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expanded Row - Approvisionnements List (Feature 1) */}
                    {expandedDotation === dotation.id && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="px-6 py-4 bg-gray-50">
                          <div className="pl-8">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary-600" />
                              Historique des approvisionnements ({dotationAppros?.length || 0})
                            </h4>
                            
                            {loadingAppros ? (
                              <div className="text-center py-8">
                                <div className="spinner mx-auto mb-2"></div>
                                <p className="text-sm text-gray-600">Chargement...</p>
                              </div>
                            ) : dotationAppros && dotationAppros.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-white border-b border-gray-200">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Quantité</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">KM</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Véhicule</th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Observations</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {dotationAppros.map((appro) => (
                                      <tr key={appro.id} className="hover:bg-white">
                                        <td className="px-4 py-3">
                                          <p className="font-medium text-gray-900">
                                            {format(new Date(appro.date), 'dd/MM/yyyy')}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {format(new Date(appro.date), 'HH:mm')}
                                          </p>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="font-semibold text-gray-900">{appro.qte} L</span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <p className="text-gray-900">{appro.km_precedent} → {appro.km}</p>
                                          <p className="text-xs text-gray-600">+{appro.km - appro.km_precedent} km</p>
                                        </td>
                                        <td className="px-4 py-3">
                                          {appro.vhc_provisoire ? (
                                            <div>
                                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                Provisoire: {appro.vhc_provisoire}
                                              </span>
                                              <p className="text-xs text-gray-600 mt-1">KM: {appro.km_provisoire}</p>
                                            </div>
                                          ) : (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                              Véhicule principal
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3">
                                          <p className="text-sm text-gray-600 max-w-xs truncate">
                                            {appro.observations || '-'}
                                          </p>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 text-center py-4">
                                Aucun approvisionnement pour cette dotation
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Fuel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm
                ? 'Aucun résultat trouvé pour votre recherche'
                : activeTab === 'active'
                  ? 'Aucune dotation active pour le moment'
                  : 'Aucune dotation archivée'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Info & Controls */}
      {filteredData && filteredData.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Affichage de {((page - 1) * perPage) + 1} à {Math.min(page * perPage, totalItems)} sur {totalItems} dotation(s)
          </p>
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              perPage={perPage}
            />
          )}
        </div>
      )}
    </div>
  );
}