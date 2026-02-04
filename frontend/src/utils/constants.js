// Approvisionnement type constants

export const APPRO_TYPES = {
  DOTATION: 'DOTATION',
  MISSION: 'MISSION'
};

export const TYPE_LABELS = {
  DOTATION: 'Dotation',
  MISSION: 'Mission'
};

export const TYPE_COLORS = {
  DOTATION: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    gradient: 'from-blue-500 to-blue-600',
    hover: 'hover:from-blue-600 hover:to-blue-700'
  },
  MISSION: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    gradient: 'from-red-500 to-red-600',
    hover: 'hover:from-red-600 hover:to-red-700'
  }
};

export const FUEL_TYPES = {
  GAZOIL: 'gazoil',
  ESSENCE: 'essence'
};

export const FUEL_COLORS = {
  gazoil: {
    bg: 'bg-orange-100',
    text: 'text-orange-700'
  },
  essence: {
    bg: 'bg-green-100',
    text: 'text-green-700'
  }
};

export const STATUS = {
  ACTIVE: 'ACTIF',
  CLOSED: 'CLÔTURÉ'
};

export const STATUS_COLORS = {
  ACTIF: {
    bg: 'bg-green-100',
    text: 'text-green-700'
  },
  CLÔTURÉ: {
    bg: 'bg-gray-100',
    text: 'text-gray-700'
  }
};

/**
 * Get type badge classes
 * @param {string} type - DOTATION or MISSION
 * @returns {string}
 */
export const getTypeBadgeClass = (type) => {
  return type === APPRO_TYPES.DOTATION ? 'badge-dotation' : 'badge-mission';
};

/**
 * Get fuel badge classes
 * @param {string} fuelType - gazoil or essence
 * @returns {object}
 */
export const getFuelBadgeClass = (fuelType) => {
  return FUEL_COLORS[fuelType] || FUEL_COLORS.gazoil;
};

/**
 * Get status badge classes
 * @param {boolean} isClosed - Whether dotation is closed
 * @returns {string}
 */
export const getStatusBadgeClass = (isClosed) => {
  return isClosed ? 'badge-closed' : 'badge-active';
};