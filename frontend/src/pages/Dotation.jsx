import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle, XCircle, Plus, Edit2, Trash2, Lock, Unlock, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { dotationService } from '../services/dotation';
import { getUser } from '../services/auth';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import toast from 'react-hot-toast';

export default function Dotation() {
  const [activeTab, setActiveTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingDotation, setEditingDotation] = useState(null);
  
  // CLIENT-SIDE PAGINATION (like Approvisionnement)
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  
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

  // Fetch active dotations - NO PAGINATION PARAMS (fetch all)
  const { data: activeDotations, isLoading: loadingActive } = useQuery({
    queryKey: ['dotations', 'active'],
    queryFn: () => dotationService.getActive({ page: 1, per_page: 1000 }),
    enabled: activeTab === 'active'
  });

  // Fetch archived dotations - NO PAGINATION PARAMS (fetch all)
  const { data: archivedDotations, isLoading: loadingArchived } = useQuery({
    queryKey: ['dotations', 'archived'],
    queryFn: () => dotationService.getArchived({ page: 1, per_page: 1000 }),
    enabled: activeTab === 'archived'
  });

  // Fetch ONLY AVAILABLE vehicles (without active dotation) for form
  const { data: availableVehicles } = useQuery({
    queryKey: ['available-vehicles', formData.mois, formData.annee],
    queryFn: () => dotationService.getAvailableVehicles(formData.mois, formData.annee),
    enabled: isAdmin && showForm
  });

  // Fetch ONLY AVAILABLE beneficiaires (without active dotation) for form
  const { data: availableBenificiaires } = useQuery({
    queryKey: ['available-beneficiaires', formData.mois, formData.annee],
    queryFn: () => dotationService.getAvailableBenificiaires(formData.mois, formData.annee),
    enabled: isAdmin && showForm
  });

  // Create/Update dotation mutation
  const saveMutation = useMutation({
    mutationFn: (data) => dotationService.create(data),
    onSuccess: () => {
      toast.success('Dotation enregistrée!');
      queryClient.invalidateQueries(['dotations']);
      queryClient.invalidateQueries(['available-vehicles']);
      queryClient.invalidateQueries(['available-beneficiaires']);
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
      queryClient.invalidateQueries(['available-vehicles']);
      queryClient.invalidateQueries(['available-beneficiaires']);
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
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la clôture');
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingDotation(null);
    setFormData({
      vehicule_id: '',
      benificiaire_id: '',
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      qte: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      vehicule_id: parseInt(formData.vehicule_id),
      benificiaire_id: parseInt(formData.benificiaire_id),
      mois: parseInt(formData.mois),
      annee: parseInt(formData.annee),
      qte: parseFloat(formData.qte)
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dotation?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir clôturer cette dotation? Cette action est irréversible.')) {
      closeMutation.mutate(id);
    }
  };

  // Get current data based on active tab
  const currentData = activeTab === 'active' ? activeDotations?.items || [] : archivedDotations?.items || [];
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchived;

  // CLIENT-SIDE FILTERING & PAGINATION (like Approvisionnement)
  const filteredData = currentData.filter(item => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      item.police?.toLowerCase().includes(search) ||
      item.benificiaire_nom?.toLowerCase().includes(search) ||
      item.service_nom?.toLowerCase().includes(search) ||
      item.marque?.toLowerCase().includes(search)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Calculate progress bar width
  const getProgressWidth = (reste, quota) => {
    return ((quota - reste) / quota * 100).toFixed(0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!isAdmin && <ReadOnlyBanner />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dotations Mensuelles</h1>
            <p className="text-gray-600">Gestion des dotations de carburant</p>
          </div>
        </div>

        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouvelle dotation
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingDotation ? 'Modifier' : 'Créer'} une dotation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Month */}
              <div>
                <label className="label">
                  Mois <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mois}
                  onChange={(e) => setFormData({...formData, mois: e.target.value, vehicule_id: '', benificiaire_id: ''})}
                  className="input-field"
                  required
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('fr-FR', { month: 'long' })}
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
                  onChange={(e) => setFormData({...formData, annee: e.target.value, vehicule_id: '', benificiaire_id: ''})}
                  className="input-field"
                  required
                >
                  {[...Array(3)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>

              {/* Vehicle - ONLY AVAILABLE */}
              <div>
                <label className="label">
                  Véhicule <span className="text-red-500">*</span>
                  {availableVehicles && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({availableVehicles.length} disponible(s))
                    </span>
                  )}
                </label>
                <select
                  value={formData.vehicule_id}
                  onChange={(e) => setFormData({...formData, vehicule_id: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un véhicule disponible</option>
                  {availableVehicles?.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.police} - {v.marque} ({v.carburant})
                    </option>
                  ))}
                </select>
                {availableVehicles && availableVehicles.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Tous les véhicules ont déjà une dotation active pour cette période
                  </p>
                )}
              </div>

              {/* Beneficiaire - ONLY AVAILABLE */}
              <div>
                <label className="label">
                  Bénéficiaire <span className="text-red-500">*</span>
                  {availableBenificiaires && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({availableBenificiaires.length} disponible(s))
                    </span>
                  )}
                </label>
                <select
                  value={formData.benificiaire_id}
                  onChange={(e) => setFormData({...formData, benificiaire_id: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un bénéficiaire disponible</option>
                  {availableBenificiaires?.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nom} - {b.fonction} ({b.service_nom})
                    </option>
                  ))}
                </select>
                {availableBenificiaires && availableBenificiaires.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Tous les bénéficiaires ont déjà une dotation active pour cette période
                  </p>
                )}
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
                disabled={saveMutation.isPending || !availableVehicles?.length || !availableBenificiaires?.length}
                className="btn-primary flex-1"
              >
                {saveMutation.isPending ? 'Enregistrement...' : 'Créer la dotation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par police, bénéficiaire, service ou marque..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('active');
            setCurrentPage(1);
          }}
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
                {activeDotations.items?.length || 0}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('archived');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'archived'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Dotations Archivées
            {archivedDotations && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                {archivedDotations.items?.length || 0}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Véhicule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bénéficiaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qte Mensuel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consommé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reste</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progression</th>
                    {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.police}</p>
                          <p className="text-sm text-gray-500">{item.marque}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.benificiaire_nom}</p>
                          <p className="text-sm text-gray-500">{item.benificiaire_fonction}</p>
                          <p className="text-xs text-gray-400">{item.service_nom}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">
                          {new Date(2000, item.mois - 1).toLocaleString('fr-FR', { month: 'long' })} {item.annee}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{item.qte} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{item.qte_consomme.toFixed(2)} L</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.reste > 20 
                            ? 'bg-green-100 text-green-800'
                            : item.reste > 0 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.reste.toFixed(2)} L
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  parseFloat(getProgressWidth(item.reste, item.qte)) > 80
                                    ? 'bg-red-500'
                                    : parseFloat(getProgressWidth(item.reste, item.qte)) > 50
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${getProgressWidth(item.reste, item.qte)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-10 text-right">
                              {getProgressWidth(item.reste, item.qte)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!item.cloture && (
                              <button
                                onClick={() => handleClose(item.id)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="Clôturer"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

            {/* CLIENT-SIDE PAGINATION (like Approvisionnement) */}
            {totalPages > 1 && (
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
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600">Aucune dotation trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}