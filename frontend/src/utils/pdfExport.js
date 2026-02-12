import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

/**
 * Generate PDF report from statistics data - Simple version without autotable
 * @param {Object} data - Statistics data from API
 * @param {number} month - Month number (1-12)
 * @param {number} year - Year
 */
export const generateStatisticsPDF = (data, month, year) => {
  // Create PDF document
  const doc = new jsPDF();
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const monthName = monthNames[month - 1] || 'Inconnu';
  
  // Colors
  const primaryColor = [37, 99, 235]; // Blue
  
  let yPos = 20;
  
  // Header - Blue background
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT STATISTIQUES', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('DPA SCL - Gestion du Parc Automobile', 105, 30, { align: 'center' });
  
  // Period and date
  yPos = 50;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Période: ${monthName} ${year}`, 20, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 20, yPos + 6);
  
  yPos += 20;
  
  // Section 1: General Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('STATISTIQUES GÉNÉRALES', 20, yPos);
  
  yPos += 10;
  
  // Draw table manually
  doc.setFontSize(10);
  
  // Table header
  doc.setFillColor(37, 99, 235);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Métrique', 25, yPos + 5);
  doc.text('Valeur', 140, yPos + 5);
  
  yPos += 8;
  
  // Table rows
  const generalStats = [
    ['Total Véhicules', (data.total_vehicules || 0).toString()],
    ['Dotations Actives', (data.dotations_actives || 0).toString()],
    ['Consommation Totale', `${(data.consommation_totale || 0).toFixed(2)} L`],
    ['Quota Total', `${(data.quota_total || 0).toFixed(2)} L`],
    ['Quota Utilisé', data.quota_percent ? `${data.quota_percent.toFixed(2)}%` : '0%']
  ];
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  generalStats.forEach((row, index) => {
    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(20, yPos, 170, 8, 'F');
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], 25, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], 140, yPos + 5);
    
    yPos += 8;
  });
  
  // Border around table
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos - (generalStats.length * 8) - 8, 170, (generalStats.length * 8) + 8);
  
  yPos += 10;
  
  // Section 2: Breakdown by Type
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RÉPARTITION PAR TYPE', 20, yPos);
  
  yPos += 10;
  
  const consommationDotation = data.consommation_dotation || 0;
  const consommationMission = data.consommation_mission || 0;
  const consommationTotale = data.consommation_totale || 1;
  
  // Table header
  doc.setFillColor(37, 99, 235);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Type', 25, yPos + 5);
  doc.text('Consommation', 70, yPos + 5);
  doc.text('Part (%)', 125, yPos + 5);
  doc.text('Nombre', 155, yPos + 5);
  
  yPos += 8;
  
  // DOTATION row
  doc.setFillColor(219, 234, 254);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DOTATION', 25, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${consommationDotation.toFixed(2)} L`, 70, yPos + 5);
  doc.text(`${((consommationDotation / consommationTotale) * 100).toFixed(2)}%`, 125, yPos + 5);
  doc.text((data.dotation_count || 0).toString(), 155, yPos + 5);
  
  yPos += 8;
  
  // MISSION row
  doc.setFillColor(254, 226, 226);
  doc.rect(20, yPos, 170, 8, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('MISSION', 25, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${consommationMission.toFixed(2)} L`, 70, yPos + 5);
  doc.text(`${((consommationMission / consommationTotale) * 100).toFixed(2)}%`, 125, yPos + 5);
  doc.text((data.mission_count || 0).toString(), 155, yPos + 5);
  
  yPos += 8;
  
  // Border
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos - 24, 170, 24);
  
  yPos += 15;
  
  // Visual Bar Chart
  if (yPos < 250) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RÉPARTITION VISUELLE', 20, yPos);
    
    yPos += 10;
    
    const dotationPercent = (consommationDotation / consommationTotale) * 100;
    const missionPercent = (consommationMission / consommationTotale) * 100;
    
    const barWidth = 150;
    const barHeight = 20;
    
    // DOTATION bar
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(20, yPos, (barWidth * dotationPercent / 100), barHeight, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(20, yPos, barWidth, barHeight);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`DOTATION: ${dotationPercent.toFixed(1)}%`, 175, yPos + 13, { align: 'left' });
    
    yPos += barHeight + 8;
    
    // MISSION bar
    doc.setFillColor(239, 68, 68); // Red
    doc.rect(20, yPos, (barWidth * missionPercent / 100), barHeight, 'F');
    doc.setDrawColor(239, 68, 68);
    doc.rect(20, yPos, barWidth, barHeight);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`MISSION: ${missionPercent.toFixed(1)}%`, 175, yPos + 13, { align: 'left' });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text('Page 1/1', 105, 290, { align: 'center' });
  doc.text('DPA SCL - Gestion du Parc Automobile', 20, 290);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), 190, 290, { align: 'right' });
  
  // Generate filename
  const filename = `rapport_${monthName}_${year}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  
  // Save PDF
  doc.save(filename);
  
  return filename;
};