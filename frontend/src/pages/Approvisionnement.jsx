import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Fuel, CheckCircle, AlertCircle } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import toast from 'react-hot-toast';

export default function Approvisionnement() {
  const [searchPolice, setSearchPolice] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [formData, setFormData] = useState({
    qte: '',
    km: '',
    vhc_provisoire: '',
    km_provisoire: '',
    observations: ''
  });

  const queryClient = useQueryClient();

  // Search vehicle mutation
  const searchMutation = useMutation({
    mutationFn: (police) => approvisionnementService.searchVehicle(police),
    onSuccess: (data) => {
      setVehicleData(data);
      setFormData(prev => ({
        ...prev,
        km: data.km + 1 // Initialize with current km + 1
      }));
      toast.success('Véhicule trouvé!');
    },
    onError: (error) => {
      setVehicleData(null);
      toast.error(error.response?.data?.detail || 'Véhicule non trouvé');
    }
  });

  // Create approvisionnement mutation
  const createMutation = useMutation({
    mutationFn: (data) => approvisionnementService.createDotation(data),
    onSuccess: () => {
      toast.success('Approvisionnement ajouté avec succès!');
      queryClient.invalidateQueries(['dashboard-stats']);
      // Reset form
      setVehicleData(null);
      setSearchPolice('');
      setFormData({
        qte: '',
        km: '',
        vhc_provisoire: '',
        km_provisoire: '',
        observations: ''
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchPolice.trim()) {
      searchMutation.mutate(searchPolice.trim());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!vehicleData) {
      toast.error('Veuillez d\'abord rechercher un véhicule');
      return;
    }

    if (!formData.qte || !formData.km) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const qte = parseFloat(formData.qte);
    const km = parseInt(formData.km);
    
    if (qte <= 0 || km <= vehicleData.km) {
      toast.error('Valeurs invalides');
      return;
    }

    if (qte > vehicleData.reste) {
      toast.error(`Quantité supérieure au reste disponible (${vehicleData.reste.toFixed(2)} L)`);
      return;
    }

    createMutation.mutate({
      dotation_id: vehicleData.dotation_id,
      qte,
      km_precedent: vehicleData.km,
      km,
      vhc_provisoire: formData.vhc_provisoire || null,
      km_provisoire: formData.km_provisoire ? parseInt(formData.km_provisoire) : null,
      observations: formData.observations || null
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Fuel className="h-8 w-8 text-blue-600" />
          Approvisionnement DOTATION
        </h1>
        <p className="text-gray-600">
          Enregistrer un approvisionnement sur dotation mensuelle
        </p>
      </div>

      {/* Search Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Rechercher un véhicule
        </h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchPolice}
            onChange={(e) => setSearchPolice(e.target.value)}
            placeholder="Numéro de police (ex: 12345)"
            className="input-field flex-1"
            disabled={searchMutation.isPending}
          />
          <button
            type="submit"
            disabled={searchMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {searchMutation.isPending ? (
              <>
                <div className="spinner border-white w-4 h-4"></div>
                Recherche...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Rechercher
              </>
            )}
          </button>
        </form>
      </div>

      {/* Vehicle Info */}
      {vehicleData && (
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 animate-slide-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Fuel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {vehicleData.police}
                </h3>
                <p className="text-sm text-gray-600">
                  {vehicleData.marque || 'N/A'} - {vehicleData.carburant}
                </p>
              </div>
            </div>
            <span className="badge-dotation">DOTATION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Bénéficiaire</p>
              <p className="font-semibold text-gray-900">{vehicleData.benificiaire}</p>
              <p className="text-xs text-gray-600">{vehicleData.fonction}</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Service</p>
              <p className="font-semibold text-gray-900">{vehicleData.service}</p>
              <p className="text-xs text-gray-600">{vehicleData.direction}</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Quota / Consommé</p>
              <p className="font-semibold text-gray-900">
                {vehicleData.quota} L / {vehicleData.qte_consomme.toFixed(2)} L
              </p>
              <p className="text-xs text-gray-600">
                {((vehicleData.qte_consomme / vehicleData.quota) * 100).toFixed(1)}% utilisé
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Reste disponible</p>
              <p className={`text-2xl font-bold ${
                vehicleData.reste < 20 ? 'text-red-600' : 'text-green-600'
              }`}>
                {vehicleData.reste.toFixed(2)} L
              </p>
            </div>
          </div>

          {vehicleData.reste < 20 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <strong>Attention:</strong> Stock faible, moins de 20L restants
              </p>
            </div>
          )}
        </div>
      )}

      {/* Approvisionnement Form */}
      {vehicleData && (
        <div className="card p-6 animate-slide-in">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Enregistrer l'approvisionnement
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Ex: 30.5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {vehicleData.reste.toFixed(2)} L
                </p>
              </div>

              {/* KM */}
              <div>
                <label className="label">
                  Kilométrage actuel <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({...formData, km: e.target.value})}
                  className="input-field"
                  placeholder={`Supérieur à ${vehicleData.km}`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  KM précédent: {vehicleData.km}
                </p>
              </div>

              {/* Temporary Vehicle (optional) */}
              <div>
                <label className="label">
                  Véhicule provisoire (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.vhc_provisoire}
                  onChange={(e) => setFormData({...formData, vhc_provisoire: e.target.value})}
                  className="input-field"
                  placeholder="Ex: B-999-99"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si le véhicule principal n'est pas utilisé
                </p>
              </div>

              {/* Temporary Vehicle KM */}
              {formData.vhc_provisoire && (
                <div>
                  <label className="label">
                    KM véhicule provisoire
                  </label>
                  <input
                    type="number"
                    value={formData.km_provisoire}
                    onChange={(e) => setFormData({...formData, km_provisoire: e.target.value})}
                    className="input-field"
                    placeholder="KM du véhicule provisoire"
                  />
                </div>
              )}
            </div>

            {/* Observations */}
            <div>
              <label className="label">
                Observations
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                className="input-field"
                rows="3"
                placeholder="Remarques éventuelles..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-dotation flex-1 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="spinner border-white w-4 h-4"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Enregistrer l'approvisionnement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
      {!vehicleData && !searchMutation.isPending && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun véhicule sélectionné
          </h3>
          <p className="text-gray-600">
            Recherchez un véhicule par son numéro de police pour commencer
          </p>
        </div>
      )}
    </div>
  );
}