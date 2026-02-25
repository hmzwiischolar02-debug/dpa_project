import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, UserCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { benificiairesService } from '../services/vehicules';
import { getUser } from '../services/auth';
import toast from 'react-hot-toast';

export default function Benificiaires() {
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingBenificiaire, setEditingBenificiaire] = useState(null);
  
  // CLIENT-SIDE PAGINATION (like Vehicules)
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;
  
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    fonction: '',
    service_id: ''
  });
  const [newService, setNewService] = useState({
    nom: '',
    direction: ''
  });

  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch ALL beneficiaires (no pagination on backend)
  const { data: beneficiairesData, isLoading: loadingBeneficiaires } = useQuery({
    queryKey: ['beneficiaires'],
    queryFn: () => benificiairesService.getAll({ page: 1, per_page: 1000 })  // Get all
  });

  // Fetch services for dropdown
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/services`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
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

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erreur création service');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Service créé!');
      queryClient.invalidateQueries(['services']);
      setFormData({...formData, service_id: data.id});
      setShowServiceForm(false);
      setNewService({ nom: '', direction: '' });
    },
    onError: () => {
      toast.error('Erreur lors de la création du service');
    }
  });

  const resetForm = () => {
    setFormData({
      matricule: '',
      nom: '',
      fonction: '',
      service_id: ''
    });
    setEditingBenificiaire(null);
    setShowForm(false);
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

  const handleDelete = (benificiaire) => {
    if (window.confirm(`Supprimer le bénéficiaire ${benificiaire.nom} ?`)) {
      deleteMutation.mutate(benificiaire.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.fonction || !formData.service_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    saveMutation.mutate({
      matricule: formData.matricule || '',
      nom: formData.nom,
      fonction: formData.fonction,
      service_id: parseInt(formData.service_id)
    });
  };

  // CLIENT-SIDE FILTERING & PAGINATION
  const allBeneficiaires = Array.isArray(beneficiairesData) 
    ? beneficiairesData 
    : (beneficiairesData?.items || []);

  const filteredBeneficiaires = allBeneficiaires.filter(item => {
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
    setCurrentPage(1);  // Reset to page 1 when searching
  };

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Accès Administrateur Requis
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent gérer les bénéficiaires.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bénéficiaires</h1>
            <p className="text-gray-600">Gestion des bénéficiaires de dotations</p>
          </div>
        </div>

        {!showForm && (
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
      {showForm && (
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
                  placeholder="Généré automatiquement si vide"
                />
              </div>

              <div>
                <label className="label">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Ahmed Ben Ali"
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
                  placeholder="Ex: Chef de service"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Service <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(!showServiceForm)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="h-4 w-4 inline" /> Nouveau
                  </button>
                </div>

                {showServiceForm ? (
                  <div className="p-3 bg-blue-50 rounded-lg space-y-2 border border-blue-200">
                    <input
                      type="text"
                      value={newService.nom}
                      onChange={(e) => setNewService({...newService, nom: e.target.value})}
                      className="input-field"
                      placeholder="Nom du service"
                    />
                    <input
                      type="text"
                      value={newService.direction}
                      onChange={(e) => setNewService({...newService, direction: e.target.value})}
                      className="input-field"
                      placeholder="Direction"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newService.nom && newService.direction) {
                          createServiceMutation.mutate(newService);
                        } else {
                          toast.error('Veuillez remplir tous les champs');
                        }
                      }}
                      className="btn-primary w-full text-sm"
                    >
                      Créer
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Sélectionner un service</option>
                    {services?.map(s => (
                      <option key={s.id} value={s.id}>{s.nom} - {s.direction}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={resetForm} className="btn-secondary">
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
            placeholder="Rechercher par nom, matricule, fonction, service..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loadingBeneficiaires ? (
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedBeneficiaires.map((benificiaire) => (
                    <tr key={benificiaire.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{benificiaire.matricule}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{benificiaire.nom}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{benificiaire.fonction}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{benificiaire.service_nom || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{benificiaire.direction || 'N/A'}</p>
                      </td>
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
                            onClick={() => handleDelete(benificiaire)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
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
                      {(() => {
                        const maxButtons = 7;
                        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                        
                        if (endPage - startPage + 1 < maxButtons) {
                          startPage = Math.max(1, endPage - maxButtons + 1);
                        }
                        
                        const pages = [];
                        
                        if (startPage > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setCurrentPage(1)}
                              className="px-3 py-1 rounded-lg hover:bg-gray-100 text-gray-700"
                            >
                              1
                            </button>
                          );
                          if (startPage > 2) {
                            pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                          }
                        }
                        
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={`px-3 py-1 rounded-lg ${
                                currentPage === i
                                  ? 'bg-primary-600 text-white'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }
                        
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                          }
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-1 rounded-lg hover:bg-gray-100 text-gray-700"
                            >
                              {totalPages}
                            </button>
                          );
                        }
                        
                        return pages;
                      })()}
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