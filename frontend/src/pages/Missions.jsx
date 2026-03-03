import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, CheckCircle, Truck, User as UserIcon, Building, MapPinned, Plus, ArrowLeft } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import ApprovisionnementList from '../components/Approvisionnementlist';
import toast from 'react-hot-toast';

export default function Mission() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    qte: '',
    km_precedent: '',
    km: '',
    matricule_conducteur: '',
    service_externe: '',
    ville_origine: '',
    ordre_mission: '',
    police_vehicule: '',
    observations: ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => approvisionnementService.createMission(data),
    onSuccess: () => {
      toast.success('Mission enregistrée avec succès!');
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['approvisionnements']);
      // Reset form
      setFormData({
        qte: '',
        km_precedent: '',
        km: '',
        matricule_conducteur: '',
        service_externe: '',
        ville_origine: '',
        ordre_mission: '',
        police_vehicule: '',
        observations: ''
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const requiredFields = [
      'qte', 'km_precedent', 'km', 'matricule_conducteur',
      'service_externe', 'ville_origine', 'ordre_mission', 'police_vehicule'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const qte = parseFloat(formData.qte);
    const km_precedent = parseInt(formData.km_precedent);
    const km = parseInt(formData.km);

    if (isNaN(qte) || qte <= 0) {
      toast.error('La quantité doit être un nombre positif');
      return;
    }

    if (isNaN(km_precedent) || km_precedent < 0) {
      toast.error('Le kilométrage précédent doit être un nombre positif');
      return;
    }

    if (isNaN(km) || km < 0) {
      toast.error('Le kilométrage actuel doit être un nombre positif');
      return;
    }

    // Check if km is less than km_precedent and observations is required
    if (km < km_precedent && !formData.observations.trim()) {
      toast.error('Veuillez expliquer pourquoi le kilométrage est inférieur au précédent');
      return;
    }

    if (km <= km_precedent && km !== km_precedent) {
      toast.warning('Le kilométrage actuel est inférieur au précédent');
    }

    createMutation.mutate({
      ...formData,
      qte,
      km_precedent,
      km
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <MapPin className="h-8 w-8 text-red-600" />
          Approvisionnement MISSION
        </h1>
        <p className="text-gray-600">
          Gestion des missions externes avec ordre de mission
        </p>
      </div>

      {/* Toggle Form Button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="btn-mission flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nouvelle mission
        </button>
      ) : (
        <>
          {/* Info Card */}
          <div className="card p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  Approvisionnement pour mission externe
                </h3>
                <p className="text-sm text-red-800">
                  Ce type d'approvisionnement est destiné aux agents externes avec ordre de mission.
                  Ces approvisionnements ne sont pas liés aux dotations mensuelles.
                </p>
              </div>
            </div>
          </div>

          {/* Mission Form */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-red-600" />
                Détails de la mission
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mission Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Number */}
                <div>
                  <label className="label">
                    Numéro d'ordre de mission <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ordre_mission}
                    onChange={(e) => setFormData({...formData, ordre_mission: e.target.value})}
                    className="input-field"
                    placeholder="Ex: OM-2026-001"
                    required
                  />
                </div>

                {/* Driver Matricule */}
                <div>
                  <label className="label flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Matricule du conducteur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.matricule_conducteur}
                    onChange={(e) => setFormData({...formData, matricule_conducteur: e.target.value})}
                    className="input-field"
                    placeholder="Ex: M-12345"
                    required
                  />
                </div>

                {/* External Service */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Service affecté <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.service_externe}
                    onChange={(e) => setFormData({...formData, service_externe: e.target.value})}
                    className="input-field"
                    placeholder="Ex: Service Externe Casablanca"
                    required
                  />
                </div>

                {/* Origin City */}
                <div>
                  <label className="label flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Ville d'origine / Destination <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ville_origine}
                    onChange={(e) => setFormData({...formData, ville_origine: e.target.value})}
                    className="input-field"
                    placeholder="Ex: Casablanca"
                    required
                  />
                </div>

                {/* Vehicle Police */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Police du véhicule <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.police_vehicule}
                    onChange={(e) => setFormData({...formData, police_vehicule: e.target.value})}
                    className="input-field"
                    placeholder="Ex: C-456-78"
                    required
                  />
                </div>
              </div>

              {/* Fuel Details */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-red-600" />
                  Détails du carburant
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="label">
                      Quantité (litres) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qte}
                      onChange={(e) => setFormData({...formData, qte: e.target.value})}
                      className="input-field"
                      placeholder="Ex: 50.00"
                      required
                    />
                  </div>

                  {/* Previous KM */}
                  <div>
                    <label className="label">
                      KM précédent <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.km_precedent}
                      onChange={(e) => setFormData({...formData, km_precedent: e.target.value})}
                      className="input-field"
                      placeholder="Ex: 50000"
                      required
                    />
                  </div>

                  {/* Current KM */}
                  <div>
                    <label className="label">
                      KM actuel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.km}
                      onChange={(e) => setFormData({...formData, km: e.target.value})}
                      className={`input-field ${
                        formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent)
                          ? 'border-red-300 ring-2 ring-red-200'
                          : ''
                      }`}
                      placeholder="Ex: 50200"
                      required
                    />
                    {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ KM inférieur au précédent
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="label">
                  Observations 
                  {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && (
                    <span className="text-red-500"> * (Obligatoire - expliquer le KM inférieur)</span>
                  )}
                </label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  className={`input-field ${
                    formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && !formData.observations.trim()
                      ? 'border-red-300 ring-2 ring-red-200' 
                      : ''
                  }`}
                  rows="3"
                  placeholder={
                    formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent)
                      ? "OBLIGATOIRE: Expliquer pourquoi le kilométrage est inférieur (ex: panne moteur, réparation, compteur défectueux...)"
                      : "Informations complémentaires sur la mission..."
                  }
                />
                {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>
                      Veuillez expliquer pourquoi le kilométrage ({formData.km} km) est inférieur au précédent ({formData.km_precedent} km)
                    </span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setFormData({
                    qte: '',
                    km_precedent: '',
                    km: '',
                    matricule_conducteur: '',
                    service_externe: '',
                    ville_origine: '',
                    ordre_mission: '',
                    police_vehicule: '',
                    observations: ''
                  })}
                  className="btn-secondary"
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-mission flex-1 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="spinner border-white w-4 h-4"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Enregistrer la mission
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Help Card */}
          <div className="card p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">
              💡 Conseil
            </h4>
            <p className="text-sm text-gray-600">
              Assurez-vous d'avoir l'ordre de mission signé avant d'enregistrer l'approvisionnement. 
              Les missions sont suivies séparément des dotations mensuelles dans les statistiques.
            </p>
          </div>
        </>
      )}

      {/* Mission History List */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Historique des missions</h2>
        <ApprovisionnementList typeFilter="MISSION" />
      </div>
    </div>
  );
}