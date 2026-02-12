import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, UserCheck, Building2, X, Search } from 'lucide-react';
import { benificiairesService } from '../services/vehicules';
import { getUser } from '../services/auth';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function Benificiaires() {
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [editingBenificiaire, setEditingBenificiaire] = useState(null);
  const perPage = 10;
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

  // Fetch beneficiaires
  const { data: beneficiairesData, isLoading: loadingBeneficiaires } = useQuery({
    queryKey: ['beneficiaires'],
    queryFn: () => benificiairesService.getAll({ page: 1, per_page: 1000 })
  });

  const beneficiaires = beneficiairesData?.items || beneficiairesData || [];

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
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur création service');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Service créé avec succès!');
      queryClient.invalidateQueries(['services']);
      // Auto-select the newly created service
      setFormData({...formData, service_id: data.id});
      setShowServiceForm(false);
      setNewService({ nom: '', direction: '' });
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de la création du service');
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
    setShowServiceForm(false);
    setNewService({ nom: '', direction: '' });
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
    setShowServiceForm(false);
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

    const submitData = {
      nom: formData.nom,
      fonction: formData.fonction,
      service_id: parseInt(formData.service_id)
    };

    if (formData.matricule) {
      submitData.matricule = formData.matricule;
    }

    saveMutation.mutate(submitData);
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    
    if (!newService.nom || !newService.direction) {
      toast.error('Veuillez remplir tous les champs du service');
      return;
    }

    createServiceMutation.mutate(newService);
  };

  // Filter beneficiaires
  const filteredBeneficiaires = beneficiaires.filter(b => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      b.nom?.toLowerCase().includes(search) ||
      b.matricule?.toLowerCase().includes(search) ||
      b.fonction?.toLowerCase().includes(search) ||
      b.service_nom?.toLowerCase().includes(search) ||
      b.direction?.toLowerCase().includes(search)
    );
  });

  // Client-side pagination
  const totalItems = filteredBeneficiaires.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedBeneficiaires = filteredBeneficiaires.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary-600" />
            Bénéficiaires
          </h1>
          <p className="text-gray-600">
            Gestion des bénéficiaires de dotations
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {showForm ? 'Annuler' : 'Ajouter un bénéficiaire'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-slide-in border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingBenificiaire ? '✏️ Modifier le bénéficiaire' : '➕ Ajouter un bénéficiaire'}
            </h3>
            {editingBenificiaire && (
              <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                ID: {editingBenificiaire.id}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Matricule (Optional) */}
              <div>
                <label className="label">
                  Matricule
                </label>
                <input
                  type="text"
                  value={formData.matricule}
                  onChange={(e) => setFormData({...formData, matricule: e.target.value})}
                  className="input-field"
                  placeholder="Ex: M-12345"
                />
              </div>

              {/* Nom */}
              <div>
                <label className="label">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="input-field"
                  placeholder="Ex: TAZI Mohammed"
                  required
                />
              </div>

              {/* Fonction */}
              <div>
                <label className="label">
                  Fonction <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fonction}
                  onChange={(e) => setFormData({...formData, fonction: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Responsable"
                  required
                />
              </div>

              {/* Service */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(!showServiceForm)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                  >
                    {showServiceForm ? (
                      <>
                        <X className="h-4 w-4" />
                        Annuler
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Nouveau service
                      </>
                    )}
                  </button>
                </div>

                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                  className="input-field"
                  required
                  disabled={showServiceForm}
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

            {/* Inline Service Form */}
            {showServiceForm && (
              <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg animate-slide-in">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Créer un nouveau service</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-sm">
                      Nom du service <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newService.nom}
                      onChange={(e) => setNewService({...newService, nom: e.target.value})}
                      className="input-field"
                      placeholder="Ex: SAR"
                      required={showServiceForm}
                    />
                  </div>
                  <div>
                    <label className="label text-sm">
                      Direction <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newService.direction}
                      onChange={(e) => setNewService({...newService, direction: e.target.value})}
                      className="input-field"
                      placeholder="Ex: DSPR"
                      required={showServiceForm}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleServiceSubmit}
                    disabled={createServiceMutation.isPending || !newService.nom || !newService.direction}
                    className="btn-primary text-sm"
                  >
                    {createServiceMutation.isPending ? 'Création...' : 'Créer le service'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceForm(false);
                      setNewService({ nom: '', direction: '' });
                    }}
                    className="btn-secondary text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-primary"
              >
                {saveMutation.isPending ? 'Enregistrement...' : editingBenificiaire ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, matricule, fonction, service ou direction..."
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
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loadingBeneficiaires ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : filteredBeneficiaires && filteredBeneficiaires.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">MATRICULE</th>
                  <th className="px-6 py-3 text-left table-header">NOM</th>
                  <th className="px-6 py-3 text-left table-header">FONCTION</th>
                  <th className="px-6 py-3 text-left table-header">SERVICE</th>
                  <th className="px-6 py-3 text-left table-header">DIRECTION</th>
                  <th className="px-6 py-3 text-left table-header">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedBeneficiaires.map((benificiaire) => (
                  <tr key={benificiaire.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{benificiaire.matricule || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{benificiaire.nom}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{benificiaire.fonction}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{benificiaire.service_nom || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600">{benificiaire.direction || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(benificiaire)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDelete(benificiaire)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Aucun résultat trouvé' : 'Aucun bénéficiaire'}
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Essayez une autre recherche' : 'Commencez par ajouter un bénéficiaire'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Info & Controls */}
      {filteredBeneficiaires && filteredBeneficiaires.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} bénéficiaire(s)
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