import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Edit2, Trash2, UserCheck, Search } from 'lucide-react';
import { benificiairesService } from '../services/vehicules';
import { getUser } from '../services/auth';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import toast from 'react-hot-toast';

export default function Benificiaires() {
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingBenificiaire, setEditingBenificiaire] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const perPage = 20;
  
  const [formData, setFormData] = useState({
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

  // Fetch beneficiaires with pagination and search
  const { data: beneficiairesData, isLoading: loadingBeneficiaires } = useQuery({
    queryKey: ['beneficiaires', page, searchTerm],
    queryFn: () => benificiairesService.getAll({ page, per_page: perPage, search: searchTerm })
  });

  // Extract data
  const beneficiaires = Array.isArray(beneficiairesData) ? beneficiairesData : (beneficiairesData?.items || []);
  const totalPages = beneficiairesData?.pages || 1;
  const totalItems = beneficiairesData?.total || 0;

  // Fetch services for dropdown
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      // This should be from a services endpoint
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
      nom: formData.nom,
      fonction: formData.fonction,
      service_id: parseInt(formData.service_id)
    });
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
            Gestion des Bénéficiaires
          </h1>
          <p className="text-gray-600">
            Gérer les bénéficiaires (ADMIN uniquement)
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
          {showForm ? 'Annuler' : 'Nouveau bénéficiaire'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-slide-in border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingBenificiaire ? '✏️ Modifier le bénéficiaire' : '➕ Nouveau bénéficiaire'}
            </h3>
            {editingBenificiaire && (
              <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                ID: {editingBenificiaire.id}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom */}
              <div>
                <label className="label">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Ahmed Ben Ali"
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
                  placeholder="Ex: Chef de service"
                  required
                />
              </div>

              {/* Service */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="label">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowServiceForm(!showServiceForm)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {showServiceForm ? 'Annuler' : 'Nouveau service'}
                  </button>
                </div>

                {showServiceForm ? (
                  <div className="p-4 bg-blue-50 rounded-lg space-y-3 border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">Créer un nouveau service</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={newService.nom}
                          onChange={(e) => setNewService({...newService, nom: e.target.value})}
                          className="input-field"
                          placeholder="Nom du service"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newService.direction}
                          onChange={(e) => setNewService({...newService, direction: e.target.value})}
                          className="input-field"
                          placeholder="Direction"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newService.nom && newService.direction) {
                          createServiceMutation.mutate(newService);
                        } else {
                          toast.error('Veuillez remplir tous les champs');
                        }
                      }}
                      disabled={createServiceMutation.isPending}
                      className="btn-primary w-full text-sm"
                    >
                      {createServiceMutation.isPending ? 'Création...' : 'Créer le service'}
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
                      <option key={s.id} value={s.id}>
                        {s.nom} - {s.direction}
                      </option>
                    ))}
                  </select>
                )}
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
                {saveMutation.isPending ? 'Enregistrement...' : editingBenificiaire ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-4">
        <SearchInput
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setPage(1);
          }}
          placeholder="Rechercher par nom, fonction, service, direction..."
        />
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loadingBeneficiaires ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : beneficiaires && beneficiaires.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Nom</th>
                  <th className="px-6 py-3 text-left table-header">Fonction</th>
                  <th className="px-6 py-3 text-left table-header">Service</th>
                  <th className="px-6 py-3 text-left table-header">Direction</th>
                  <th className="px-6 py-3 text-left table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {beneficiaires.map((benificiaire) => (
                  <tr key={benificiaire.id} className="hover:bg-gray-50 transition-colors">
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
              Aucun bénéficiaire trouvé
            </h3>
            <p className="text-gray-600">
              Commencez par ajouter un bénéficiaire
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {beneficiaires && beneficiaires.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          perPage={perPage}
        />
      )}
    </div>
  );
}