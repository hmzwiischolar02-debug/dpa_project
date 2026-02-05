import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Plus, Edit2, Trash2, Filter, Search } from 'lucide-react';
import { vehiculesService } from '../services/vehicules';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import toast from 'react-hot-toast';

export default function Vehicules() {
  const [filterFuel, setFilterFuel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const perPage = 20;
  
  const [formData, setFormData] = useState({
    police: '',
    nCivil: '',
    marque: '',
    carburant: 'gazoil',
    km: 0
  });

  const queryClient = useQueryClient();

  // Fetch vehicles with pagination and search
  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles', page, searchTerm],
    queryFn: () => vehiculesService.getAll({ page, per_page: perPage, active_only: true, search: searchTerm })
  });

  // Extract data
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items || []);
  const totalPages = vehiclesData?.pages || 1;
  const totalItems = vehiclesData?.total || 0;

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data) => 
      editingVehicle 
        ? vehiculesService.update(editingVehicle.id, data)
        : vehiculesService.create(data),
    onSuccess: () => {
      toast.success(editingVehicle ? 'Véhicule modifié!' : 'Véhicule ajouté!');
      queryClient.invalidateQueries(['vehicles']);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => vehiculesService.delete(id),
    onSuccess: () => {
      toast.success('Véhicule désactivé!');
      queryClient.invalidateQueries(['vehicles']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  });

  const resetForm = () => {
    setFormData({
      police: '',
      nCivil: '',
      marque: '',
      carburant: 'gazoil',
      km: 0
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      police: vehicle.police,
      nCivil: vehicle.nCivil,
      marque: vehicle.marque || '',
      carburant: vehicle.carburant,
      km: vehicle.km
    });
    setShowForm(true);
  };

  const handleDelete = (vehicle) => {
    if (window.confirm(`Désactiver le véhicule ${vehicle.police} ?`)) {
      deleteMutation.mutate(vehicle.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.police || !formData.nCivil || !formData.carburant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    saveMutation.mutate(formData);
  };

  // Filter vehicles
  const filteredVehicles = vehicles?.filter(v => 
    filterFuel === 'all' || v.carburant === filterFuel
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Car className="h-8 w-8 text-primary-600" />
            Gestion des Véhicules
          </h1>
          <p className="text-gray-600">
            Gérer le parc automobile (ADMIN uniquement)
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
          {showForm ? 'Annuler' : 'Nouveau véhicule'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-slide-in border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingVehicle ? '✏️ Modifier le véhicule' : '➕ Nouveau véhicule'}
            </h3>
            {editingVehicle && (
              <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                ID: {editingVehicle.id}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Numéro de police <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.police}
                  onChange={(e) => setFormData({...formData, police: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 12345"
                  required
                />
              </div>

              <div>
                <label className="label">
                  Numéro civil <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nCivil}
                  onChange={(e) => setFormData({...formData, nCivil: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 12345-C-1"
                  required
                />
              </div>

              <div>
                <label className="label">
                  Marque
                </label>
                <input
                  type="text"
                  value={formData.marque}
                  onChange={(e) => setFormData({...formData, marque: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Peugeot Partner"
                />
              </div>

              <div>
                <label className="label">
                  Type de carburant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.carburant}
                  onChange={(e) => setFormData({...formData, carburant: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="gazoil">Gazoil</option>
                  <option value="essence">Essence</option>
                </select>
              </div>

              <div>
                <label className="label">
                  Kilométrage initial <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({...formData, km: parseInt(e.target.value)})}
                  className="input-field"
                  placeholder="0"
                  min="0"
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
                {saveMutation.isPending ? 'Enregistrement...' : editingVehicle ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilterFuel('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterFuel === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({vehicles?.length || 0})
              </button>
              <button
                onClick={() => setFilterFuel('gazoil')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterFuel === 'gazoil'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                Gazoil ({vehicles?.filter(v => v.carburant === 'gazoil').length || 0})
              </button>
              <button
              onClick={() => setFilterFuel('essence')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterFuel === 'essence'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Essence ({vehicles?.filter(v => v.carburant === 'essence').length || 0})
            </button>
          </div>
          </div>
          <div className="flex-1">
            <SearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setPage(1);
              }}
              placeholder="Rechercher par police, n° civil, marque..."
            />
          </div>
        </div>
      </div>

      {/* Vehicles List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : filteredVehicles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left table-header">Police</th>
                  <th className="px-6 py-3 text-left table-header">N° Civil</th>
                  <th className="px-6 py-3 text-left table-header">Marque</th>
                  <th className="px-6 py-3 text-left table-header">Carburant</th>
                  <th className="px-6 py-3 text-left table-header">Kilométrage</th>
                  <th className="px-6 py-3 text-left table-header">Statut</th>
                  <th className="px-6 py-3 text-left table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{vehicle.police}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{vehicle.ncivil}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{vehicle.marque || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        vehicle.carburant === 'gazoil'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {vehicle.carburant}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{vehicle.km.toLocaleString()} km</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        vehicle.actif
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {vehicle.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                          title="Désactiver"
                          disabled={!vehicle.actif}
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
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun véhicule trouvé
            </h3>
            <p className="text-gray-600">
              {filterFuel !== 'all' 
                ? `Aucun véhicule ${filterFuel} disponible`
                : 'Commencez par ajouter un véhicule'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredVehicles.length > 0 && totalPages > 1 && (
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