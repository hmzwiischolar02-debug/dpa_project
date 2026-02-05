import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, UserCheck, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { benificiairesService, servicesService } from '../services/vehicules';
import { getUser } from '../services/auth';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import toast from 'react-hot-toast';

export default function Benificiaires() {
  const [showForm, setShowForm] = useState(false);
  const [editingBenificiaire, setEditingBenificiaire] = useState(null);
  
  // CLIENT-SIDE PAGINATION (like Approvisionnement)
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    fonction: '',
    service_id: ''
  });

  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch ALL beneficiaires (no pagination)
  const { data: beneficiaires, isLoading } = useQuery({
    queryKey: ['beneficiaires'],
    queryFn: () => benificiairesService.getAll({ page: 1, per_page: 1000 })
  });

  // Fetch services for dropdown
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: servicesService.getAll,
    enabled: isAdmin && showForm
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data) => 
      editingBenificiaire 
        ? benificiairesService.update(editingBenificiaire.id, data)
        : benificiairesService.create(data),
    onSuccess: () => {
      toast.success(editingBenificiaire ? 'Bénéficiaire modifié!' : 'Bénéficiaire ajouté!');
      queryClient.invalidateQueries(['beneficiaires']);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => benificiairesService.delete(id),
    onSuccess: () => {
      toast.success('Bénéficiaire supprimé!');
      queryClient.invalidateQueries(['beneficiaires']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingBenificiaire(null);
    setFormData({
      matricule: '',
      nom: '',
      fonction: '',
      service_id: ''
    });
  };

  const handleEdit = (benificiaire) => {
    setEditingBenificiaire(benificiaire);
    setFormData({
      matricule: benificiaire.matricule || '',
      nom: benificiaire.nom,
      fonction: benificiaire.fonction,
      service_id: benificiaire.service_id
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      service_id: parseInt(formData.service_id)
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce bénéficiaire?')) {
      deleteMutation.mutate(id);
    }
  };

  // CLIENT-SIDE FILTERING & PAGINATION (like Approvisionnement)
  const filteredBeneficiaires = (beneficiaires?.items || []).filter(item => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      item.nom?.toLowerCase().includes(search) ||
      item.matricule?.toLowerCase().includes(search) ||
      item.fonction?.toLowerCase().includes(search) ||
      item.service_nom?.toLowerCase().includes(search) ||
      item.direction?.toLowerCase().includes(search)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBeneficiaires.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBeneficiaires = filteredBeneficiaires.slice(startIndex, endIndex);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!isAdmin && <ReadOnlyBanner />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bénéficiaires</h1>
            <p className="text-gray-600">Gestion des bénéficiaires de dotations</p>
          </div>
        </div>

        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouveau bénéficiaire
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingBenificiaire ? 'Modifier' : 'Ajouter'} un bénéficiaire
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Matricule</label>
                <input
                  type="text"
                  value={formData.matricule}
                  onChange={(e) => setFormData({...formData, matricule: e.target.value})}
                  className="input-field"
                  placeholder="Ex: M-12345"
                />
              </div>

              <div>
                <label className="label">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="input-field"
                  placeholder="Ex: TAZI Mohammed"
                  required
                />
              </div>

              <div>
                <label className="label">Fonction <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.fonction}
                  onChange={(e) => setFormData({...formData, fonction: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Responsable"
                  required
                />
              </div>

              <div>
                <label className="label">Service <span className="text-red-500">*</span></label>
                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Sélectionner un service</option>
                  {services?.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nom} - {s.direction}
                    </option>
                  ))}
                </select>
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
                {saveMutation.isPending ? 'Enregistrement...' : (editingBenificiaire ? 'Modifier' : 'Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule, fonction, service ou direction..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Beneficiaires List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : paginatedBeneficiaires.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                    {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBeneficiaires.map((benificiaire) => (
                    <tr key={benificiaire.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{benificiaire.matricule || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{benificiaire.nom}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{benificiaire.fonction}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{benificiaire.service_nom}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{benificiaire.direction}</p>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(benificiaire)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(benificiaire.id)}
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

            {/* CLIENT-SIDE PAGINATION */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredBeneficiaires.length)} sur {filteredBeneficiaires.length} bénéficiaire(s)
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
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun bénéficiaire trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}