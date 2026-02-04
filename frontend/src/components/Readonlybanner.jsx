import { Lock, Info } from 'lucide-react';

/**
 * ReadOnlyBanner - Shows when AGENT is viewing a page in read-only mode
 */
export default function ReadOnlyBanner({ message }) {
  return (
    <div className="readonly-banner animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lock className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-yellow-900">
              Mode Lecture Seule
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
              <Info className="h-3 w-3" />
              Agent
            </span>
          </div>
          <p className="text-sm text-yellow-800">
            {message || "Vous pouvez consulter cette page mais pas la modifier. Contactez un administrateur pour effectuer des modifications."}
          </p>
        </div>
      </div>
    </div>
  );
}