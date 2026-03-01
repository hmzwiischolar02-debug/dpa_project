import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Fuel, CheckCircle, AlertCircle, Plus, ArrowLeft } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import ApprovisionnementList from '../components/ApprovisionnementList';
import toast from 'react-hot-toast';
import { printApprovisionnementPDF } from '../utils/Printapprovisionnement';

export default function Approvisionnement() {
  const [showForm, setShowForm] = useState(false);
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
        km: data.km || 0  // ✅ Handle NULL km
      }));
    },
    onError: (error) => {
      setVehicleData(null);
      const errorMsg = error.response?.data?.detail || 'Véhicule non trouvé';
      // Convert to string if it's an array or object
      const displayMsg = Array.isArray(errorMsg) 
        ? errorMsg.map(e => e.msg || e).join(', ')
        : String(errorMsg);
      toast.error(displayMsg);
    }
  });

  // Create approvisionnement mutation
  const createMutation = useMutation({
    mutationFn: (data) => approvisionnementService.createDotation(data),
    onSuccess: (data) => {
      toast.success('Approvisionnement ajouté avec succès!');
      queryClient.invalidateQueries(['dashboard-stats']);
      
      // Auto-print PDF WITHOUT confirmation
      setTimeout(() => {
        // Calculate new consumed quantity and rest
        const newConsumed = (vehicleData.qte_consomme || 0) + parseFloat(formData.qte);
        const newRest = vehicleData.quota - newConsumed;
        
        printApprovisionnementPDF({
            date: new Date().toISOString(),
            numero_bon: data?.numero_bon || null,
            chef_fonction: vehicleData.fonction || '',
            chef_nom: vehicleData.benificiaire || '',
            qte: parseFloat(formData.qte),
            km_precedent: vehicleData.km || 0,
            km: parseInt(formData.km),
            quota: vehicleData.quota,
            qte_consomme: newConsumed,
            reste: newRest,
            police: vehicleData.police,
            nCivil: vehicleData.nCivil || '',
            marque: vehicleData.marque,
            carburant: vehicleData.carburant,
            benificiaire_nom: vehicleData.benificiaire,
            fonction: vehicleData.fonction,
            service_nom: vehicleData.service,
            direction: vehicleData.direction,
            mois: new Date().getMonth() + 1,
            annee: new Date().getFullYear(),
            type_approvi: 'DOTATION',
            observations: formData.observations || '',
            vhc_provisoire: formData.vhc_provisoire || null
        });
      }, 500);
      
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
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'ajout';
      // Convert to string if it's an array or object
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
    const usingProvisionalVehicle = formData.vhc_provisoire && formData.vhc_provisoire.trim() !== '';
    
    if (qte <= 0) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }

    if (qte > vehicleData.reste) {
      toast.error(`Quantité supérieure au reste disponible (${vehicleData.reste.toFixed(2)} L)`);
      return;
    }

    // LOGIC FOR PROVISIONAL VEHICLE
    if (usingProvisionalVehicle) {
      // Using provisional vehicle - NO KM VALIDATION
      if (!formData.km_provisoire) {
        toast.error('Veuillez indiquer le kilométrage du véhicule provisoire');
        return;
      }

      // Auto-add to observations if not already mentioned
      const autoObservation = `Utilisation véhicule provisoire ${formData.vhc_provisoire} (KM: ${formData.km_provisoire})`;
      const observations = formData.observations 
        ? `${autoObservation}. ${formData.observations}`
        : autoObservation;

      // Proceed with creation (NO KM CHECK)
      createMutation.mutate({
        dotation_id: vehicleData.dotation_id,
        qte,
        km_precedent: vehicleData.km || 0,  // ✅ Handle NULL km
        km, // This is just for record, no validation
        vhc_provisoire: formData.vhc_provisoire,
        km_provisoire: parseInt(formData.km_provisoire),
        observations
      });
      return;
    }

    // LOGIC FOR MAIN VEHICLE (NORMAL FLOW)
    // CHECK: KM less than previous KM (vehicle breakdown case)
    const previousKm = vehicleData.km || 0;  // ✅ Handle NULL km
    if (km < previousKm) {
      const kmDifference = previousKm - km;
      const confirmMessage = `⚠️ ATTENTION: Kilométrage Inférieur\n\n` +
        `KM actuel: ${km}\n` +
        `KM précédent: ${previousKm}\n` +
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

    // Proceed with creation
    createMutation.mutate({
      dotation_id: vehicleData.dotation_id,
      qte,
      km_precedent: vehicleData.km || 0,  // ✅ Handle NULL km
      km,
      vhc_provisoire: null,
      km_provisoire: null,
      observations: formData.observations || null
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Fuel className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Approvisionnement DOTATION
              </h1>
              <p className="text-gray-600">
                {showForm
                  ? "Enregistrer un approvisionnement sur dotation mensuelle"
                  : "Liste des approvisionnements DOTATION"
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
                km: '',
                vhc_provisoire: '',
                km_provisoire: '',
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
            className="btn-dotation flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nouvel approvisionnement
          </button>
        )}
      </div>

      {/* Show List or Form */}
      {!showForm ? (
        /* List View */
        <ApprovisionnementList typeFilter="DOTATION" />
      ) : (
        /* Form View */
        <>
          {/* Search Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Rechercher un véhicule
            </h2>
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="number"
                maxLength={6}
                max="400000"
                value={searchPolice}
                onChange={(e) => setSearchPolice(e.target.value)}
                placeholder="Numéro de police (ex: 123456)"
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

          {/* Vehicle Info Card */}
          {vehicleData && (
            <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Véhicule</p>
                    <p className="text-lg font-bold text-blue-900">{vehicleData.police}</p>
                    <p className="text-sm font-bold uppercase text-blue-700">{vehicleData.marque}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Bénéficiaire</p>
                    <p className="text-lg font-bold text-blue-900">{vehicleData.benificiaire}</p>
                    <p className="text-sm text-blue-700">{vehicleData.fonction}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Qte Mensuel</p>
                    <p className="text-lg font-bold text-blue-900">{vehicleData.quota} L</p>
                    <p className="text-sm text-blue-700">Consommé: {vehicleData.qte_consomme.toFixed(2)} L</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Reste</p>
                    <p className={`text-lg font-bold ${
                      vehicleData.reste < 20 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {vehicleData.reste.toFixed(2)} L
                    </p>
                  </div>
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
                      Kilométrage <span className="text-red-500">*</span>
                      {formData.vhc_provisoire && (
                        <span className="text-gray-500 text-xs ml-2">(Auto - véhicule provisoire)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      maxLength={6}
                      max="999999"
                      value={formData.km}
                      onChange={(e) => setFormData({...formData, km: e.target.value})}
                      className="input-field"
                      placeholder={`Supérieur à ${vehicleData.km || 0}`}
                      required
                      disabled={!!formData.vhc_provisoire}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      KM précédent: {vehicleData.km || 0}
                    </p>
                  </div>

                  {/* Temporary Vehicle (optional) */}
                  <div>
                    <label className="label">
                      Véhicule provisoire (optionnel)
                    </label>
                    <input
                      type="number"
                      maxLength={6}
                      max="400000"
                      value={formData.vhc_provisoire}
                      onChange={(e) => {
                        const newValue = e.target.value.toUpperCase();
                        setFormData({
                          ...formData, 
                          vhc_provisoire: newValue,
                          // Auto-set normal KM to km_precedent when provisoire is entered
                          km: newValue ? (vehicleData.km || 0) : (formData.km || vehicleData.km || 0)
                        });
                      }}
                      className="input-field"
                      placeholder="Ex: 123456"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si le véhicule principal n'est pas utilisé
                    </p>
                  </div>

                  {/* Temporary Vehicle KM */}
                  {formData.vhc_provisoire && (
                    <div>
                      <label className="label">
                        KM véhicule provisoire <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.km_provisoire}
                        onChange={(e) => setFormData({...formData, km_provisoire: e.target.value})}
                        className="input-field bg-amber-50 border-amber-300"
                        placeholder="KM du véhicule provisoire"
                        required
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        ℹ️ Pas de validation KM pour véhicule provisoire
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Card for Provisional Vehicle */}
                {formData.vhc_provisoire && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <strong>Mode véhicule provisoire:</strong> Aucune validation de kilométrage ne sera effectuée. 
                      L'information sera automatiquement ajoutée aux observations.
                    </p>
                  </div>
                )}

                {/* Observations */}
                <div>
                  <label className="label">
                    Observations 
                    {!formData.vhc_provisoire && formData.km && vehicleData && parseInt(formData.km) < (vehicleData.km || 0) && (
                      <span className="text-red-500"> * (Obligatoire - KM inférieur détecté)</span>
                    )}
                  </label>
                  <textarea
                    name="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                    className={`input-field ${
                      !formData.vhc_provisoire && formData.km && vehicleData && parseInt(formData.km) < (vehicleData.km || 0)
                        ? 'border-red-300 ring-2 ring-red-200' 
                        : ''
                    }`}
                    rows="3"
                    placeholder={
                      formData.vhc_provisoire
                        ? "Raison de l'utilisation du véhicule provisoire (optionnel, sera ajouté automatiquement)..."
                        : formData.km && vehicleData && parseInt(formData.km) < (vehicleData.km || 0)
                        ? "OBLIGATOIRE: Expliquer pourquoi le kilométrage est inférieur (ex: panne moteur, réparation au garage, compteur défectueux...)"
                        : "Remarques éventuelles..."
                    }
                  />
                  {!formData.vhc_provisoire && formData.km && vehicleData && parseInt(formData.km) < (vehicleData.km || 0) && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Veuillez expliquer pourquoi le kilométrage ({formData.km} km) est inférieur au précédent ({vehicleData.km || 0} km)</span>
                    </p>
                  )}
                  {formData.vhc_provisoire && (
                    <p className="text-xs text-amber-600 mt-1">
                      ℹ️ Auto-ajouté: "Utilisation véhicule provisoire {formData.vhc_provisoire} (KM: {formData.km_provisoire || '___'})"
                    </p>
                  )}
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
        </>
      )}
    </div>
  );
}