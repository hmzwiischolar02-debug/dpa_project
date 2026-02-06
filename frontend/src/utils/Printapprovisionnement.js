import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate and print/download approvisionnement receipt PDF
 * @param {Object} data - Approvisionnement data
 */
export const printApprovisionnementPDF = (data) => {
  const doc = new jsPDF();
  
  // Add logo if available (centered at top)
  // To use: Place your logo at /public/logo.png (120x120px recommended)
  try {
    const imgData = '/logo.png';
    doc.addImage(imgData, 'PNG', 80, 10, 50, 50); // x, y, width, height
  } catch (error) {
    console.log('Logo not found - PDF will generate without logo');
  }
  
  // Title (moved down to make space for logo)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BON D\'APPROVISIONNEMENT', 105, 70, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(data.date).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Date : ${dateStr}`, 20, 85);
  
  // Left column - Vehicle/Responsable info
  const leftCol = 20;
  const rightCol = 110;
  let yPos = 100;
  const lineHeight = 10;
  
  // Row 1: Responsable | Fonction
  doc.setFont('helvetica', 'bold');
  doc.text('Benificiaire :', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.benificiaire_nom || 'N/A', leftCol + 35, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Fonction :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.benificiaire_fonction || 'N/A', rightCol + 35, yPos);

  
  
  yPos += lineHeight;
  
  // Row 2: Police | KM actuel
  doc.setFont('helvetica', 'bold');
  doc.text('Police :', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.police || 'N/A', leftCol + 35, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('KM précédent :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.km_precedent || '0'), rightCol + 35, yPos);
  
  
  
  yPos += lineHeight;
  
  // Row 3: Marque | Quantité
  doc.setFont('helvetica', 'bold');
  doc.text('Marque :', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.marque || 'N/A', leftCol + 35, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('KM actuel :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.km || '0'), rightCol + 35, yPos);
  

  yPos += lineHeight;
  
  // Row 4: Service | Quota (DOTATION only)
  doc.setFont('helvetica', 'bold');
  doc.text('Service :', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text((data.service_nom || 'N/A') + (data.direction ? '/' + data.direction : ''), leftCol + 35, yPos);

  doc.setFont('helvetica', 'bold');
  doc.text('Quantité :', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.qte || '0'), rightCol + 35, yPos);
  
  yPos += lineHeight;
  
  // Row 5: Carburant | Qté Consommée (DOTATION only)
  doc.setFont('helvetica', 'bold');
  doc.text('Carburant :', leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.carburant || 'gazoil', leftCol + 35, yPos);
  
  if (data.type_approvi === 'DOTATION' && data.qte_consomme !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('Qté Consommée :', rightCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.qte_consomme || '0'), rightCol + 35, yPos);
  }
  
  yPos += lineHeight;
  
  // Only show quota info for DOTATION type
  if (data.type_approvi === 'DOTATION') {
    doc.setFont('helvetica', 'bold');
    doc.text('Qte Mensuel :', leftCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.quota), leftCol + 35, yPos);
  }
  // Row 6: Empty left | Reste (DOTATION only)
  if (data.type_approvi === 'DOTATION' ) {
    doc.setFont('helvetica', 'bold');
    doc.text('Reste :', rightCol, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.reste), rightCol + 35, yPos);
    yPos += lineHeight;
  }
  
  // Separator line
  yPos += 10;
  doc.line(20, yPos, 190, yPos);
  
  // Signature section
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Signature responsable :', leftCol, yPos);
  doc.text('Signature station :', rightCol, yPos);
  
  // Generate filename
  const fileName = `bon_${data.police || 'approvi'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.pdf`;
  
  // Auto-print without confirmation
  doc.autoPrint();
  
  // Create blob and open in iframe for automatic printing
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  
  // Create hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  
  // Print automatically when loaded
  iframe.onload = function() {
    iframe.contentWindow.print();
    
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
  
  // Also save a copy
  doc.save(fileName);
};

/**
 * Print function for DOTATION approvisionnement
 */
export const printDotationApprovisionnement = (approData, dotationData) => {
  // Debug logging
  console.log('approData:', approData);
  console.log('dotationData:', dotationData);
  
  // Handle nested dotation_id object if it exists
  const dotation = dotationData?.dotation_id || dotationData;
  
  console.log('Using dotation:', dotation);
  
  printApprovisionnementPDF({
    type_approvi: approData.type_approvi,
    date: approData.date || new Date().toISOString(),
    police: dotation?.police || approData.police,
    marque: dotation?.marque || approData.marque,
    carburant: dotation?.carburant || approData.carburant,
    benificiaire_nom: dotation?.benificiaire || approData.benificiaire_nom,
    benificiaire_fonction: dotation?.fonction || approData.fonction,
    service_nom: dotation?.service || approData.service_nom || approData.service,
    direction: dotation?.direction || approData.direction,
    qte: approData.qte,
    km_precedent: approData.km_precedent,
    km: approData.km,
    quota: dotation?.quota  || approData.quota,
    qte_consomme: dotation?.qte_consomme  || approData.qte_consomme,
    reste: dotation?.reste || approData.reste
  });
};

/**
 * Print function for MISSION approvisionnement
 */
export const printMissionApprovisionnement = (data) => {
  printApprovisionnementPDF({
    type_approvi: 'MISSION',
    date: data.date || new Date().toISOString(),
    police: data.police_vehicule,
    carburant: data.carburant,
    benificiaire_nom: data.matricule_conducteur,
    service_nom: data.service_externe,
    qte: data.qte,
    km_precedent: data.km_precedent,
    km: data.km
  });
};