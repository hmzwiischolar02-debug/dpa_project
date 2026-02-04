import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, CheckCircle, Truck, User as UserIcon, Building, MapPinned } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import toast from 'react-hot-toast';

export default function Mission() {
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

    if (qte <= 0) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }

    if (km <= km_precedent) {
      toast.error('Le kilométrage actuel doit être supérieur au kilométrage précédent');
      return;
    }

    createMutation.mutate({
      qte,
      km_precedent,
      km,
      matricule_conducteur: formData.matricule_conducteur,
      service_externe: formData.service_externe,
      ville_origine: formData.ville_origine,
      ordre_mission: formData.ordre_mission,
      police_vehicule: formData.police_vehicule,
      observations: formData.observations || null
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Approvisionnement MISSION
            </h1>
            <p className="text-gray-600">
              Enregistrer un approvisionnement pour mission externe
            </p>
          </div>
        </div>
        <span className="badge-mission inline-flex mt-2">
          Nouveau type dans v3.0
        </span>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              À propos des approvisionnements MISSION
            </h3>
            <p className="text-sm text-red-800">
              Utilisez ce formulaire pour enregistrer les approvisionnements effectués lors de missions externes 
              avec des véhicules hors de votre parc habituel. Ces approvisionnements ne sont pas liés aux dotations mensuelles.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-red-600" />
          Détails de la mission
        </h2>

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
                Service externe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.service_externe}
                onChange={(e) => setFormData({...formData, service_externe: e.target.value})}
                className="input-field"
                placeholder="Ex: Service DRH Casablanca"
                required
              />
            </div>

            {/* Origin City */}
            <div>
              <label className="label flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ville d'origine <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ville_origine}
                onChange={(e) => setFormData({...formData, ville_origine: e.target.value})}
                className="input-field"
                placeholder="Ex: Rabat"
                required
              />
            </div>

            {/* Vehicle Police */}
            <div className="md:col-span-2">
              <label className="label flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Numéro de police du véhicule <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.police_vehicule}
                onChange={(e) => setFormData({...formData, police_vehicule: e.target.value})}
                className="input-field"
                placeholder="Ex: C-456-78"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Véhicule utilisé pour la mission (peut être différent du parc habituel)
              </p>
            </div>
          </div>

          {/* Fuel Details */}
          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Détails du carburant
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="Ex: 45.5"
                  required
                />
              </div>

              {/* KM Before */}
              <div>
                <label className="label">
                  Kilométrage avant <span className="text-red-500">*</span>
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

              {/* KM After */}
              <div>
                <label className="label">
                  Kilométrage après <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({...formData, km: e.target.value})}
                  className="input-field"
                  placeholder="Ex: 50250"
                  required
                />
              </div>
            </div>

            {/* KM Difference Display */}
            {formData.km && formData.km_precedent && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Distance parcourue:</strong> {parseInt(formData.km) - parseInt(formData.km_precedent)} km
                </p>
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="label">
              Observations / Remarques
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => setFormData({...formData, observations: e.target.value})}
              className="input-field"
              rows="3"
              placeholder="Informations complémentaires sur la mission..."
            />
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
    </div>
  );
}