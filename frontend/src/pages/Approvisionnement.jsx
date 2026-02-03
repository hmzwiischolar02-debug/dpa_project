import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import toast from 'react-hot-toast';
import ApprovisionnementList from '../components/ApprovisionnementList';

export default function Approvisionnement() {
  const [showForm, setShowForm] = useState(false);
  const [police, setPolice] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [formData, setFormData] = useState({
    qte: '',
    km_actuel: '',
  });

  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: approvisionnementService.searchVehicle,
    onSuccess: (data) => {
      setVehicleData(data);
      setFormData({
        qte: '',
        km_actuel: data.km_actuel.toString(),
      });
      toast.success('Véhicule trouvé!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Véhicule non trouvé');
      setVehicleData(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: approvisionnementService.create,
    onSuccess: () => {
      toast.success('Approvisionnement ajouté avec succès!');
      queryClient.invalidateQueries(['approvisionnements']);
      setShowForm(false);
      setPolice('');
      setVehicleData(null);
      setFormData({ qte: '', km_actuel: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!police.trim()) {
      toast.error('Veuillez saisir un numéro de police');
      return;
    }
    searchMutation.mutate(police.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.qte || !formData.km_actuel) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const data = {
      dotation_id: vehicleData.dotation_id,
      qte: parseFloat(formData.qte),
      km_precedent: vehicleData.km_actuel,
      km_actuel: parseInt(formData.km_actuel),
    };

    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvisionnement</h1>
          <p className="text-gray-500">Gestion des approvisionnements en carburant</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Annuler' : 'Nouveau'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-6 animate-slide-in">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nouvel Approvisionnement</h2>
          
          {/* Search Vehicle */}
          <form onSubmit={handleSearch} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un véhicule
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={police}
                onChange={(e) => setPolice(e.target.value)}
                placeholder="Numéro de police"
                className="input-field flex-1"
                disabled={searchMutation.isPending}
              />
              <button
                type="submit"
                disabled={searchMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {searchMutation.isPending ? (
                  <div className="spinner border-white w-5 h-5"></div>
                ) : (
                  <Search size={20} />
                )}
                Chercher
              </button>
            </div>
          </form>

          {/* Vehicle Info */}
          {vehicleData && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <InfoField label="Police" value={vehicleData.police} />
                <InfoField label="N° Civil" value={vehicleData.nCivil} />
                <InfoField label="Marque" value={vehicleData.marque} />
                <InfoField label="Carburant" value={vehicleData.carburant} badge />
                <InfoField label="KM Actuel" value={vehicleData.km_actuel.toLocaleString()} />
                <InfoField label="Bénéficiaire" value={vehicleData.benificiaire} />
                <InfoField label="Service" value={vehicleData.service} />
                <InfoField label="Direction" value={vehicleData.direction} />
                <InfoField label="Quota" value={`${vehicleData.quota} L`} />
                <InfoField label="Consommé" value={`${vehicleData.qte_consomme.toFixed(2)} L`} />
                <InfoField label="Reste" value={`${vehicleData.reste.toFixed(2)} L`} highlight />
              </div>

              {/* Add Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantité (L) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qte}
                      onChange={(e) => setFormData({ ...formData, qte: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KM Actuel *
                    </label>
                    <input
                      type="number"
                      value={formData.km_actuel}
                      onChange={(e) => setFormData({ ...formData, km_actuel: e.target.value })}
                      className="input-field"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setPolice('');
                      setVehicleData(null);
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn-primary"
                  >
                    {createMutation.isPending ? 'Enregistrement...' : 'Approvisionner'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <ApprovisionnementList />
    </div>
  );
}

function InfoField({ label, value, badge, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {badge ? (
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          value === 'gazoil' 
            ? 'bg-orange-100 text-orange-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {value}
        </span>
      ) : (
        <p className={`font-medium ${highlight ? 'text-primary-600 text-lg' : 'text-gray-900'}`}>
          {value || '-'}
        </p>
      )}
    </div>
  );
}