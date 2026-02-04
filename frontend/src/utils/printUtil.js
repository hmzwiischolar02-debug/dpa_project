import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Print approvisionnement bon (receipt/voucher)
 */
export const printApprovisionnement = (appro) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BON D\'APPROVISIONNEMENT', 105, 20, { align: 'center' });
  
  // Type badge
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  if (appro.type_approvi === 'DOTATION') {
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(85, 25, 40, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('DOTATION', 105, 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFillColor(239, 68, 68); // Red
    doc.rect(85, 25, 40, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('MISSION', 105, 30, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);
  
  // Date and Number
  const date = new Date(appro.date).toLocaleDateString('fr-FR');
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, 20, 45);
  doc.text(`N° Bon: ${appro.numero_bon || appro.id}`, 150, 45);
  
  // Details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS', 20, 58);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 68;
  
  if (appro.type_approvi === 'DOTATION') {
    // DOTATION details
    doc.text(`Véhicule:`, 20, yPos);
    doc.text(`${appro.police || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    if (appro.marque) {
      doc.text(`Marque:`, 20, yPos);
      doc.text(`${appro.marque}`, 70, yPos);
      yPos += 8;
    }
    
    if (appro.vhc_provisoire) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Véhicule provisoire:`, 20, yPos);
      doc.text(`${appro.vhc_provisoire}`, 70, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;
    }
    
    doc.text(`Bénéficiaire:`, 20, yPos);
    doc.text(`${appro.benificiaire_nom || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    doc.text(`Service:`, 20, yPos);
    doc.text(`${appro.service_nom || 'N/A'}`, 70, yPos);
    yPos += 8;
  } else {
    // MISSION details
    doc.text(`Véhicule:`, 20, yPos);
    doc.text(`${appro.police_vehicule || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    doc.text(`Conducteur:`, 20, yPos);
    doc.text(`Matricule: ${appro.matricule_conducteur || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    doc.text(`Service externe:`, 20, yPos);
    doc.text(`${appro.service_externe || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    doc.text(`Ville d'origine:`, 20, yPos);
    doc.text(`${appro.ville_origine || 'N/A'}`, 70, yPos);
    yPos += 8;
    
    doc.text(`Ordre de mission:`, 20, yPos);
    doc.text(`${appro.ordre_mission || 'N/A'}`, 70, yPos);
    yPos += 8;
  }
  
  // Carburant section
  yPos += 5;
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('CARBURANT', 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 10;
  
  doc.setFontSize(14);
  doc.text(`Quantité:`, 20, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text(`${appro.qte} Litres`, 70, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text(`KM précédent:`, 20, yPos);
  doc.text(`${appro.km_precedent || 'N/A'}`, 70, yPos);
  yPos += 8;
  
  doc.text(`KM actuel:`, 20, yPos);
  doc.text(`${appro.km || 'N/A'}`, 70, yPos);
  yPos += 8;
  
  if (appro.km && appro.km_precedent) {
    const distance = appro.km - appro.km_precedent;
    doc.text(`Distance parcourue:`, 20, yPos);
    doc.text(`${distance} km`, 70, yPos);
    yPos += 10;
  }
  
  // Observations
  if (appro.observations) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVATIONS:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    
    const observations = doc.splitTextToSize(appro.observations, 170);
    doc.text(observations, 20, yPos);
    yPos += observations.length * 6;
  }
  
  // Signature section
  yPos = Math.max(yPos + 20, 220);
  doc.setLineWidth(0.3);
  doc.line(20, yPos, 190, yPos);
  yPos += 15;
  
  // Two columns for signatures
  doc.setFont('helvetica', 'bold');
  doc.text('Signature du bénéficiaire:', 25, yPos);
  doc.text('Signature du responsable:', 120, yPos);
  
  yPos += 20;
  doc.setLineWidth(0.5);
  doc.line(25, yPos, 80, yPos);
  doc.line(120, yPos, 175, yPos);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('DPA SCL - Direction du Parc Automobile', 105, 285, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, 290, { align: 'center' });
  
  // Save PDF
  const filename = `bon_approvisionnement_${appro.type_approvi}_${appro.id}_${date.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
};

/**
 * Print rapport PDF
 */
export const printRapport = (stats, filters = {}) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT STATISTIQUES', 105, 20, { align: 'center' });
  
  // Period
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const period = filters.mois && filters.annee 
    ? `${new Date(filters.annee, filters.mois - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    : filters.annee 
    ? `Année ${filters.annee}`
    : 'Toutes périodes';
  doc.text(`Période: ${period}`, 105, 30, { align: 'center' });
  
  // Stats table
  doc.autoTable({
    startY: 40,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Total Véhicules', stats.total_vehicules || 0],
      ['Dotations Actives', stats.dotations_actives || 0],
      ['Consommation Totale (L)', (stats.consommation_totale || 0).toFixed(2)],
      ['Quota Total (L)', (stats.quota_total || 0).toFixed(2)],
      ['Quota Utilisé (%)', `${(stats.quota_percent || 0).toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] }
  });
  
  // DOTATION section
  let yPos = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(59, 130, 246);
  doc.rect(20, yPos - 5, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('DOTATION', 105, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  doc.autoTable({
    startY: yPos + 8,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Consommation DOTATION (L)', (stats.dotation_qte || 0).toFixed(2)],
      ['Part DOTATION (%)', `${(stats.dotation_percent || 0).toFixed(1)}%`],
      ['Nombre d\'approvisionnements', stats.dotation_count || 0],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [239, 246, 255] }
  });
  
  // MISSION section
  yPos = doc.lastAutoTable.finalY + 15;
  doc.setFillColor(239, 68, 68);
  doc.rect(20, yPos - 5, 170, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('MISSION', 105, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  doc.autoTable({
    startY: yPos + 8,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Consommation MISSION (L)', (stats.mission_qte || 0).toFixed(2)],
      ['Part MISSION (%)', `${(stats.mission_percent || 0).toFixed(1)}%`],
      ['Nombre d\'approvisionnements', stats.mission_count || 0],
    ],
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
    alternateRowStyles: { fillColor: [254, 242, 242] }
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('DPA SCL - Direction du Parc Automobile', 105, 285, { align: 'center' });
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, 290, { align: 'center' });
  
  // Save
  const filename = `rapport_${period.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};