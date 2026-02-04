import { Clock } from 'lucide-react';
import ApprovisionnementList from '../components/Approvisionnementlist';

export default function Historique() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary-600" />
          Historique Complet
        </h1>
        <p className="text-gray-600">
          Tous les approvisionnements (DOTATION + MISSION)
        </p>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Vue chronologique complète
            </h3>
            <p className="text-sm text-blue-800">
              Cette page affiche tous les approvisionnements effectués, qu'ils soient de type DOTATION (quota mensuel) 
              ou MISSION (mission externe). Utilisez les filtres pour affiner votre recherche.
            </p>
          </div>
        </div>
      </div>

      {/* Approvisionnement List with all features */}
      <ApprovisionnementList />
    </div>
  );
}