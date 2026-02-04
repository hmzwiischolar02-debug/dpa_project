import { Fuel, MapPin } from 'lucide-react';
import { APPRO_TYPES } from '../utils/constants';

/**
 * TypeBadge - Shows DOTATION or MISSION badge with icon
 */
export default function TypeBadge({ type, size = 'md', showIcon = true }) {
  const isDotation = type === APPRO_TYPES.DOTATION;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };
  
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
      isDotation 
        ? 'bg-blue-100 text-blue-700' 
        : 'bg-red-100 text-red-700'
    } ${sizeClasses[size]}`}>
      {showIcon && (
        isDotation 
          ? <Fuel size={iconSizes[size]} />
          : <MapPin size={iconSizes[size]} />
      )}
      {isDotation ? 'DOTATION' : 'MISSION'}
    </span>
  );
}