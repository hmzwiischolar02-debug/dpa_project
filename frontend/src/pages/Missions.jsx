import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { MapPin, CheckCircle, Truck, User as UserIcon, Building, MapPinned, Plus, ArrowLeft, Search } from 'lucide-react';
import { approvisionnementService } from '../services/approvisionnement';
import ApprovisionnementList from '../components/Approvisionnementlist';
import toast from 'react-hot-toast';

export default function Mission() {
  const [showForm, setShowForm] = useState(false);
  const [searchPolice, setSearchPolice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
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

  // Auto-search KM when police number is entered
  const handlePoliceSearch = async () => {
    if (!searchPolice || searchPolice.length < 3) {
      toast.error('Veuillez entrer au moins 3 caractères');
      return;
    }

    setIsSearching(true);
    try {
      const result = await approvisionnementService.getLastKm(searchPolice);
      
      if (result.last_km !== null) {
        setFormData({
          ...formData,
          police_vehicule: searchPolice,
          km_precedent: result.last_km.toString()
        });
        toast.success(`Dernier KM trouvé: ${result.last_km} km (source: ${result.source})`);
      } else {
        // No KM found, set police but leave km_precedent empty
        setFormData({
          ...formData,
          police_vehicule: searchPolice,
          km_precedent: ''
        });
        toast.info('Aucun KM précédent trouvé pour ce véhicule. Veuillez le saisir manuellement.');
      }
    } catch (error) {
      toast.error('Erreur lors de la recherche du véhicule');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

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
      setSearchPolice('');
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
              setSearchPolice('');
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

          {/* Vehicle Search Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-red-600" />
              Rechercher le véhicule
            </h2>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={searchPolice}
                onChange={(e) => setSearchPolice(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handlePoliceSearch()}
                className="input-field flex-1"
                placeholder="Entrer le numéro de police (ex: 78901)"
              />
              <button
                onClick={handlePoliceSearch}
                disabled={isSearching || !searchPolice}
                className="btn-mission flex items-center gap-2"
              >
                {isSearching ? (
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
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              💡 Le système recherchera automatiquement le dernier kilométrage enregistré pour ce véhicule
            </p>
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
                    placeholder="Ex: Police de Casablanca"
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
                    placeholder="Ex: Casablanca"
                    required
                  />
                </div>

                {/* Police Number (readonly if searched) */}
                <div>
                  <label className="label">
                    Numéro de police <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.police_vehicule}
                    onChange={(e) => setFormData({...formData, police_vehicule: e.target.value.toUpperCase()})}
                    className="input-field"
                    placeholder="Ex: 78901"
                    required
                    readOnly={!!searchPolice && formData.police_vehicule}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="label">
                    Quantité (L) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.qte}
                    onChange={(e) => setFormData({...formData, qte: e.target.value})}
                    className="input-field"
                    placeholder="Ex: 45.5"
                    required
                  />
                </div>

                {/* KM Precedent (auto-filled or manual) */}
                <div>
                  <label className="label">
                    KM précédent {formData.km_precedent ? '' : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    value={formData.km_precedent}
                    onChange={(e) => setFormData({...formData, km_precedent: e.target.value})}
                    className={`input-field ${formData.km_precedent ? 'bg-green-50 border-green-300' : ''}`}
                    placeholder="Auto-rempli ou saisir manuellement"
                    required
                  />
                  {formData.km_precedent && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ KM précédent récupéré de la base de données
                    </p>
                  )}
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
                    placeholder="Ex: 31965"
                    required
                  />
                  {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ KM inférieur au précédent - Observation requise
                    </p>
                  )}
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="label">
                  Observations {formData.km && formData.km_precedent && parseInt(formData.km) < parseInt(formData.km_precedent) && <span className="text-red-500">*</span>}
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
    </div>
  );
}