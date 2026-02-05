import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Plus, Edit2, Trash2, Filter, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { vehiculesService } from '../services/vehicules';
import { getUser } from '../services/auth';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import toast from 'react-hot-toast';

export default function Vehicules() {
  const [filterFuel, setFilterFuel] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  // CLIENT-SIDE PAGINATION (like Approvisionnement)
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    police: '',
    nCivil: '',
    marque: '',
    carburant: 'gazoil',
    km: 0
  });

  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch ALL vehicles (no pagination)
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiculesService.getAll({ page: 1, per_page: 1000, active_only: true })
  });

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
    setShowForm(false);
    setEditingVehicle(null);
    setFormData({
      police: '',
      nCivil: '',
      marque: '',
      carburant: 'gazoil',
      km: 0
    });
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      police: vehicle.police,
      nCivil: vehicle.ncivil,
      marque: vehicle.marque,
      carburant: vehicle.carburant,
      km: vehicle.km
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce véhicule?')) {
      deleteMutation.mutate(id);
    }
  };

  // CLIENT-SIDE FILTERING & PAGINATION (like Approvisionnement)
  const filteredVehicles = (vehicles?.items || []).filter(item => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      item.police?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ncivil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.marque?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Fuel filter
    const matchesFuel = filterFuel === 'all' || item.carburant === filterFuel;
    
    return matchesSearch && matchesFuel;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFuelFilterChange = (value) => {
    setFilterFuel(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!isAdmin && <ReadOnlyBanner />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Véhicules</h1>
            <p className="text-gray-600">Gestion du parc automobile</p>
          </div>
        </div>

        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouveau véhicule
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingVehicle ? 'Modifier' : 'Ajouter'} un véhicule
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Police <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.police}
                  onChange={(e) => setFormData({...formData, police: e.target.value.toUpperCase()})}
                  className="input-field"
                  placeholder="Ex: 78901"
                  required
                />
              </div>

              <div>
                <label className="label">N° Civil <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.nCivil}
                  onChange={(e) => setFormData({...formData, nCivil: e.target.value.toUpperCase()})}
                  className="input-field"
                  placeholder="Ex: 259423"
                  required
                />
              </div>

              <div>
                <label className="label">Marque <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.marque}
                  onChange={(e) => setFormData({...formData, marque: e.target.value})}
                  className="input-field"
                  placeholder="Ex: DACIA DOKKER"
                  required
                />
              </div>

              <div>
                <label className="label">Carburant <span className="text-red-500">*</span></label>
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

              <div className="md:col-span-2">
                <label className="label">Kilométrage <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({...formData, km: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 31500"
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
                {saveMutation.isPending ? 'Enregistrement...' : (editingVehicle ? 'Modifier' : 'Ajouter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par police, n°civil ou marque..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Fuel Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterFuel}
              onChange={(e) => handleFuelFilterChange(e.target.value)}
              className="input-field flex-1"
            >
              <option value="all">Tous les carburants</option>
              <option value="gazoil">Gazoil</option>
              <option value="essence">Essence</option>
            </select>
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
        ) : paginatedVehicles.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Police</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Civil</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marque</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carburant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kilométrage</th>
                    {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{vehicle.police}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{vehicle.ncivil}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{vehicle.marque}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vehicle.carburant === 'gazoil'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {vehicle.carburant}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{vehicle.km.toLocaleString()} km</p>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(vehicle)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(vehicle.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Désactiver"
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
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredVehicles.length)} sur {filteredVehicles.length} véhicule(s)
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
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun véhicule trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}