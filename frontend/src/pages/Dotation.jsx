import { useState } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, XCircle, Plus, Edit2, Trash2, Lock, Unlock, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { dotationService } from '../services/dotation';
import { vehiculesService, benificiairesService } from '../services/vehicules';
import { approvisionnementService } from '../services/approvisionnement';
import { getUser } from '../services/auth';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Dotation() {
  const [activeTab, setActiveTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingDotation, setEditingDotation] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDotation, setExpandedDotation] = useState(null);
  const perPage = 20;
  
  const [formData, setFormData] = useState({
    vehicule_id: '',
    benificiaire_id: '',
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    qte: ''
  });

  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch active dotations with pagination and search
  const { data: activeDotationsData, isLoading: loadingActive } = useQuery({
    queryKey: ['dotations', 'active', page, searchTerm],
    queryFn: () => dotationService.getActive({ page, per_page: perPage, search: searchTerm }),
    enabled: activeTab === 'active'
  });

  // Fetch archived dotations with pagination and search
  const { data: archivedDotationsData, isLoading: loadingArchived } = useQuery({
    queryKey: ['dotations', 'archived', page, searchTerm],
    queryFn: () => dotationService.getArchived({ page, per_page: perPage, search: searchTerm }),
    enabled: activeTab === 'archived'
  });

  // Extract actual data arrays
  const activeDotations = Array.isArray(activeDotationsData) ? activeDotationsData : (activeDotationsData?.items || []);
  const archivedDotations = Array.isArray(archivedDotationsData) ? archivedDotationsData : (archivedDotationsData?.items || []);
  
  // Pagination data
  const paginationData = activeTab === 'active' ? activeDotationsData : archivedDotationsData;
  const totalPages = paginationData?.pages || 1;
  const totalItems = paginationData?.total || 0;

  // Fetch vehicles for form
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiculesService.getAll({ page: 1, per_page: 1000, active_only: true }),
    enabled: isAdmin
  });

  // Fetch beneficiaires for form
  const { data: beneficiairesData } = useQuery({
    queryKey: ['beneficiaires'],
    queryFn: () => benificiairesService.getAll({ page: 1, per_page: 1000 }),
    enabled: isAdmin
  });

  // Extract items from paginated response
  const vehicles = vehiclesData?.items || [];
  const beneficiaires = beneficiairesData?.items || [];

  // Fetch approvisionnements for expanded dotation
  const { data: dotationAppros, isLoading: loadingAppros } = useQuery({
    queryKey: ['dotation-appros', expandedDotation],
    queryFn: () => approvisionnementService.getByDotation(expandedDotation),
    enabled: expandedDotation !== null
  });

  // Create/Update dotation mutation
  const saveMutation = useMutation({
    mutationFn: (data) => dotationService.create(data),
    onSuccess: () => {
      toast.success('Dotation enregistrée!');
      queryClient.invalidateQueries(['dotations']);
      queryClient.invalidateQueries(['dashboard-stats']);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  });

  // Delete dotation mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => dotationService.delete(id),
    onSuccess: () => {
      toast.success('Dotation supprimée!');
      queryClient.invalidateQueries(['dotations']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  });

  // Close dotation mutation
  const closeMutation = useMutation({
    mutationFn: (id) => dotationService.close(id),
    onSuccess: () => {
      toast.success('Dotation clôturée!');
      queryClient.invalidateQueries(['dotations']);
      queryClient.invalidateQueries(['dashboard-stats']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la clôture');
    }
  });

  const resetForm = () => {
    setFormData({
      vehicule_id: '',
      benificiaire_id: '',
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      qte: ''
    });
    setEditingDotation(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.vehicule_id || !formData.benificiaire_id || !formData.qte) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    saveMutation.mutate({
      vehicule_id: parseInt(formData.vehicule_id),
      benificiaire_id: parseInt(formData.benificiaire_id),
      mois: parseInt(formData.mois),
      annee: parseInt(formData.annee),
      qte: parseFloat(formData.qte)
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dotation ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir clôturer cette dotation ? Cette action est irréversible.')) {
      closeMutation.mutate(id);
    }
  };

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
      <div className="flex items-center justify-between">
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
              {/* Vehicle Selection */}
              <div>
                <label className="label">
                  Véhicule <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicule_id}
                  onChange={(e) => setFormData({...formData, vehicule_id: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un véhicule</option>
                  {vehicles?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.police} - {v.marque || 'N/A'} ({v.carburant})
                    </option>
                  ))}
                </select>
              </div>

              {/* Beneficiaire Selection */}
              <div>
                <label className="label">
                  Bénéficiaire <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.benificiaire_id}
                  onChange={(e) => setFormData({...formData, benificiaire_id: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un bénéficiaire</option>
                  {beneficiaires?.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nom} - {b.fonction}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="label">
                  Mois <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mois}
                  onChange={(e) => setFormData({...formData, mois: e.target.value})}
                  className="input-field"
                  required
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="label">
                  Année <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.annee}
                  onChange={(e) => setFormData({...formData, annee: e.target.value})}
                  className="input-field"
                  required
                >
                  {[...Array(3)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>

              {/* Quantity */}
              <div className="md:col-span-2">
                <label className="label">
                  Quantité (Litres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.qte}
                  onChange={(e) => setFormData({...formData, qte: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 120"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-primary flex-1"
              >
                {saveMutation.isPending ? 'Enregistrement...' : 'Créer la dotation'}
              </button>
            </div>
          </form>
        </div>
      )}

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

      {/* Search Bar */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <SearchInput
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setPage(1); // Reset to page 1 when searching
            }}
            placeholder="Rechercher par véhicule, bénéficiaire, service..."
          />
        </div>
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
                  {isAdmin && <th className="px-6 py-3 text-left table-header">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentData.map((dotation) => (
                  <React.Fragment key={dotation.id}>
                    <tr 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedDotation(expandedDotation === dotation.id ? null : dotation.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {expandedDotation === dotation.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
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
                    
                    {isAdmin && (
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {!dotation.cloture && (
                            <>
                              <button
                                onClick={() => handleDelete(dotation.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleClose(dotation.id)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Clôturer"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {dotation.cloture && (
                            <span className="text-xs text-gray-500">Clôturé</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  
                  {/* Expanded Row - Approvisionnements List */}
                  {expandedDotation === dotation.id && (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="px-6 py-4 bg-gray-50">
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
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                              <p>Aucun approvisionnement pour cette dotation</p>
                            </div>
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

      {/* Pagination */}
      {currentData && currentData.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          perPage={perPage}
        />
      )}

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