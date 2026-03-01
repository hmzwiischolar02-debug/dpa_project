import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, CheckCircle, Truck, User as UserIcon, Building, MapPinned, Plus, ArrowLeft, Search } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import ApprovisionnementList from '../components/ApprovisionnementList';
import toast from 'react-hot-toast';
import { printApprovisionnementPDF } from '../utils/Printapprovisionnement';

export default function Mission() {
  const [showForm, setShowForm] = useState(false);
  const [searchPolice, setSearchPolice] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [formData, setFormData] = useState({
    qte: '',
    km_precedent: '',
    km: '',
    matricule_conducteur: '',
    service_affecte: '',
    destination: '',
    num_envoi: '',
    police_vehicule: '',
    observations: ''
  });

  const queryClient = useQueryClient();

  // Search vehicle mutation - uses MISSION endpoint (no dotation required)
  const searchMutation = useMutation({
    mutationFn: (police) => approvisionnementService.searchVehicleMission(police),
    onSuccess: (data) => {
      setVehicleData(data);
      // Auto-fill police_vehicule, km_precedent, and matricule_conducteur if dotation exists
      setFormData(prev => ({
        ...prev,
        police_vehicule: data.police,
        km_precedent: (data.km || 0).toString(),  // ✅ Handle NULL km
        matricule_conducteur: data.matricule_conducteur || prev.matricule_conducteur
      }));

      if (data.matricule_conducteur) {
        toast.success(`Véhicule trouvé: ${data.police} - ${data.marque || 'N/A'} | Bénéficiaire: ${data.benificiaire_nom} (${data.matricule_conducteur})`);
      } else {
        toast.success(`Véhicule trouvé: ${data.police} - ${data.marque || 'N/A'} (KM: ${data.km || 0})`);
      }
    },
    onError: (error) => {
      setVehicleData(null);
      const errorMsg = error.response?.data?.detail || 'Véhicule non trouvé ou inactif';
      // ✅ Convert to string if it's an array or object
      const displayMsg = Array.isArray(errorMsg) 
        ? errorMsg.map(e => e.msg || e).join(', ')
        : String(errorMsg);
      toast.error(displayMsg);
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchPolice.trim()) {
      searchMutation.mutate(searchPolice.trim());
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => approvisionnementService.createMission(data),
    onSuccess: (response, variables) => {
      toast.success('Mission enregistrée avec succès!');
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['approvisionnements']);
      
      // Auto-print PDF directly (no confirmation)
      setTimeout(() => {
        printApprovisionnementPDF({
          type_approvi: 'MISSION',
          date: new Date().toISOString(),
          numero_bon: response?.numero_bon || null,
          chef_fonction: vehicleData?.fonction || '',
          chef_nom: vehicleData?.benificiaire_nom || vehicleData?.benificiaire || '',
          police: variables.police_vehicule,
          nCivil: vehicleData?.nCivil || '',
          marque: vehicleData?.marque || '',
          carburant: vehicleData?.carburant || 'gazoil',
          benificiaire_nom: variables.matricule_conducteur,
          service_nom: variables.service_affecte,
          direction: vehicleData?.direction || '',
          ordre_mission: variables.ordre_mission,  // ✅ Use ordre_mission for PDF
          service_affecte: variables.service_affecte,
          destination: variables.destination,
          qte: parseFloat(variables.qte),
          km_precedent: parseInt(variables.km_precedent),
          km: parseInt(variables.km),
          observations: variables.observations || ''
        });
      }, 500);
      
      // Reset form
      setVehicleData(null);
      setSearchPolice('');
      setFormData({
        qte: '',
        km_precedent: '',
        km: '',
        matricule_conducteur: '',
        service_affecte: '',
        destination: '',
        num_envoi: '',
        police_vehicule: '',
        observations: ''
      });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'enregistrement';
      // ✅ Convert to string if it's an array or object
      const displayMsg = Array.isArray(errorMsg) 
        ? errorMsg.map(e => e.msg || e).join(', ')
        : String(errorMsg);
      toast.error(displayMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const requiredFields = [
      'qte', 'km_precedent', 'km', 'matricule_conducteur',
      'service_affecte', 'destination', 'num_envoi', 'police_vehicule'
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

    // CHECK: KM less than previous KM (vehicle breakdown case)
    if (km < km_precedent) {
      const kmDifference = km_precedent - km;
      const confirmMessage = `⚠️ ATTENTION: Kilométrage Inférieur\n\n` +
        `KM actuel: ${km}\n` +
        `KM précédent: ${km_precedent}\n` +
        `Différence: -${kmDifference} km\n\n` +
        `Cela indique généralement une panne du véhicule.\n\n` +
        `Avez-vous ajouté une observation expliquant cette situation ?`;
      
      if (!window.confirm(confirmMessage)) {
        toast.error('Opération annulée');
        return;
      }

      // Force user to add observation if not already present
      if (!formData.observations || formData.observations.trim() === '') {
        toast.error('⚠️ Veuillez ajouter une observation expliquant pourquoi le kilométrage est inférieur (ex: panne, réparation, compteur défectueux)');
        // Focus on observations field
        document.querySelector('textarea[name="observations"]')?.focus();
        return;
      }
    }

    createMutation.mutate({
      qte,
      km_precedent,
      km,
      matricule_conducteur: formData.matricule_conducteur,
      service_affecte: formData.service_affecte,
      destination: formData.destination,
      ordre_mission: formData.num_envoi,  // ✅ FIXED: Use ordre_mission instead of num_envoi
      police_vehicule: formData.police_vehicule,
      observations: formData.observations || null
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
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
                {showForm
                  ? "Enregistrer un approvisionnement pour mission externe"
                  : "Liste des approvisionnements MISSION"
                }
              </p>
            </div>
          </div>
          {showForm && (
            <span className="badge-mission inline-flex mt-2">
              Nouveau type dans v3.0
            </span>
          )}
        </div>

        {/* Toggle Button */}
        {showForm ? (
          <button
            onClick={() => {
              setShowForm(false);
              setVehicleData(null);
              setSearchPolice('');
              setFormData({
                qte: '',
                km_precedent: '',
                km: '',
                matricule_conducteur: '',
                service_affecte: '',
                destination: '',
                num_envoi: '',
                police_vehicule: '',
                observations: ''
              });
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour à la liste
          </button>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="btn-mission flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouvelle mission
          </button>
        )}
      </div>

      {/* Show List or Form */}
      {!showForm ? (
        /* List View */
        <ApprovisionnementList typeFilter="MISSION" />
      ) : (
        /* Form View */
        <>
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

          {/* Vehicle Search Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-red-600" />
              Rechercher le véhicule
            </h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                value={searchPolice}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setSearchPolice(val);
                }}
                placeholder="Numéro de police (ex: 210362)"
                className="input-field flex-1"
                maxLength={6}
                inputMode="numeric"
                disabled={searchMutation.isPending}
              />
              <button
                type="submit"
                disabled={searchMutation.isPending || !searchPolice.trim()}
                className="btn-mission flex items-center gap-2"
              >
                {searchMutation.isPending ? (
                  <><div className="spinner border-white w-4 h-4"></div> Recherche...</>
                ) : (
                  <><Search className="h-4 w-4" /> Rechercher</>
                )}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              💡 Le système remplira automatiquement le numéro de police et le dernier kilométrage enregistré
            </p>

            {/* Vehicle found info */}
            {vehicleData && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Véhicule trouvé</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500">Police:</span> <strong>{vehicleData.police}</strong></div>
                  <div><span className="text-gray-500">Marque:</span> <strong>{vehicleData.marque || 'N/A'}</strong></div>
                  <div><span className="text-gray-500">Carburant:</span> <strong>{vehicleData.carburant}</strong></div>
                  <div><span className="text-gray-500">Dernier KM:</span> <strong>{vehicleData.km || 0}</strong></div>
                </div>
                {vehicleData.matricule_conducteur && (
                  <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2 text-sm">
                    <span className="text-green-700">👤 Bénéficiaire dotation:</span>
                    <strong className="text-green-900">{vehicleData.benificiaire_nom}</strong>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {vehicleData.matricule_conducteur}
                    </span>
                    <span className="text-xs text-green-600 italic">
                      (matricule pré-rempli)
                    </span>
                  </div>
                )}
              </div>
            )}
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
                value={formData.num_envoi}
                onChange={(e) => setFormData({...formData, num_envoi: e.target.value})}
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

            {/* Service Affecté */}
            <div>
              <label className="label flex items-center gap-2">
                <Building className="h-4 w-4" />
                Service Affecté <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.service_affecte}
                onChange={(e) => setFormData({...formData, service_affecte: e.target.value})}
                className="input-field"
                placeholder="Ex: Service DRH Casablanca"
                required
              />
            </div>

            {/* Destination */}
            <div>
              <label className="label flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
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
              Observations / Remarques {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && (
                <span className="text-red-500">* (Obligatoire - KM inférieur détecté)</span>
              )}
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={(e) => setFormData({...formData, observations: e.target.value})}
              className={`input-field ${
                formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent)
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
                service_affecte: '',
                destination: '',
                num_envoi: '',
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
    </div>
  );
}