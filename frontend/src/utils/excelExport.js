import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Export approvisionnements data to Excel file
 * @param {Array} data - Array of approvisionnement objects
 * @param {string} filename - Optional filename (without extension)
 */
export const exportToExcel = (data, filename = null) => {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  // Prepare data for Excel
  const excelData = data.map(item => ({
    'Date': format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
    'Type': item.type_approvi,
    'Véhicule': item.police || item.police_vehicule || '',
    'Responsable': item.benificiaire_nom || item.matricule_conducteur || '',
    'Service': item.service_nom || item.service_externe || '',
    'Quantité (L)': item.qte,
    'KM Précédent': item.km_precedent,
    'KM Actuel': item.km,
    'Distance (km)': item.km - item.km_precedent,
    'Véhicule Provisoire': item.vhc_provisoire || '',
    'KM Provisoire': item.km_provisoire || '',
    'Observations': item.observations || ''
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 18 }, // Date
    { wch: 10 }, // Type
    { wch: 12 }, // Véhicule
    { wch: 20 }, // Responsable
    { wch: 15 }, // Service
    { wch: 12 }, // Quantité
    { wch: 12 }, // KM Précédent
    { wch: 12 }, // KM Actuel
    { wch: 12 }, // Distance
    { wch: 18 }, // Véhicule Provisoire
    { wch: 12 }, // KM Provisoire
    { wch: 30 }  // Observations
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Approvisionnements');

  // Generate filename
  const defaultFilename = `approvisionnements_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  const finalFilename = filename ? `${filename}.xlsx` : defaultFilename;

  // Write file
  XLSX.writeFile(workbook, finalFilename);

  return finalFilename;
};

/**
 * Export dotations data to Excel file
 * @param {Array} data - Array of dotation objects
 * @param {string} filename - Optional filename (without extension)
 */
export const exportDotationsToExcel = (data, filename = null) => {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const excelData = data.map(item => ({
    'Véhicule': item.police,
    'Marque': item.marque || '',
    'Bénéficiaire': item.benificiaire_nom,
    'Fonction': item.benificiaire_fonction,
    'Service': item.service_nom,
    'Direction': item.direction,
    'Mois': item.mois,
    'Année': item.annee,
    'Quota (L)': item.qte,
    'Consommé (L)': parseFloat(item.qte_consomme).toFixed(2),
    'Reste (L)': parseFloat(item.reste).toFixed(2),
    'Statut': item.cloture ? 'Clôturée' : 'Active'
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const columnWidths = [
    { wch: 12 }, // Véhicule
    { wch: 15 }, // Marque
    { wch: 20 }, // Bénéficiaire
    { wch: 18 }, // Fonction
    { wch: 15 }, // Service
    { wch: 15 }, // Direction
    { wch: 8 },  // Mois
    { wch: 8 },  // Année
    { wch: 12 }, // Quota
    { wch: 12 }, // Consommé
    { wch: 12 }, // Reste
    { wch: 10 }  // Statut
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dotations');

  const defaultFilename = `dotations_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  const finalFilename = filename ? `${filename}.xlsx` : defaultFilename;

  XLSX.writeFile(workbook, finalFilename);

  return finalFilename;
};

/**
 * Export beneficiaires data to Excel file
 * @param {Array} data - Array of beneficiaire objects
 * @param {string} filename - Optional filename (without extension)
 */
export const exportBeneficiairesToExcel = (data, filename = null) => {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const excelData = data.map(item => ({
    'Matricule': item.matricule || '',
    'Nom': item.nom,
    'Fonction': item.fonction,
    'Service': item.service_nom || '',
    'Direction': item.direction || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const columnWidths = [
    { wch: 12 }, // Matricule
    { wch: 25 }, // Nom
    { wch: 20 }, // Fonction
    { wch: 15 }, // Service
    { wch: 15 }  // Direction
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bénéficiaires');

  const defaultFilename = `beneficiaires_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  const finalFilename = filename ? `${filename}.xlsx` : defaultFilename;

  XLSX.writeFile(workbook, finalFilename);

  return finalFilename;
};