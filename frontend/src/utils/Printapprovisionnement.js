import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────
// Number → French words
// ─────────────────────────────────────────────────────────────────
const UNITES   = ['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF',
                  'DIX','ONZE','DOUZE','TREIZE','QUATORZE','QUINZE','SEIZE',
                  'DIX-SEPT','DIX-HUIT','DIX-NEUF'];
const DIZAINES = ['','','VINGT','TRENTE','QUARANTE','CINQUANTE',
                  'SOIXANTE','SOIXANTE','QUATRE-VINGT','QUATRE-VINGT'];

function toFrench(n) {
  n = Math.round(n);
  if (n === 0) return 'ZÉRO';
  if (n < 0)   return 'MOINS ' + toFrench(-n);
  let w = '';
  if (n >= 1000) { const m = Math.floor(n/1000); w += (m===1?'MILLE':toFrench(m)+' MILLE')+' '; n%=1000; }
  if (n >= 100)  { const h = Math.floor(n/100);  w += (h===1?'CENT':UNITES[h]+' CENTS')+' '; n%=100; if(n>0&&h>1) w=w.replace('CENTS','CENT'); }
  if (n > 0) {
    if (n < 20) { w += UNITES[n]; }
    else {
      const d = Math.floor(n/10), u = n%10;
      if      (d===7||d===9)   w += DIZAINES[d]+'-'+UNITES[10+u];
      else if (d===8 && u===0) w += 'QUATRE-VINGTS';
      else                     w += DIZAINES[d]+(u>0?(u===1&&d!==8?'-ET-UN':'-'+UNITES[u]):'');
    }
  }
  return w.trim();
}

// ─────────────────────────────────────────────────────────────────
// Main print function
// ─────────────────────────────────────────────────────────────────
export const printApprovisionnementPDF = (appro) => {
  // Portrait A4: 210 × 297 mm  — all content fits in top half (≤ 148 mm)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210;
  const ML = 20;   // margin left
  const MR = 190;  // margin right

  // ── data ──────────────────────────────────────────────────────
  const dateStr = appro.date
    ? format(new Date(appro.date), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  // mois/annee MUST be declared before moisLabel
  const mois  = appro.mois  || appro.dotation_mois  || null;
  const annee = appro.annee || appro.dotation_annee  || null;

  const moisLabel = (mois && annee)
    ? format(new Date(annee, mois-1, 1), 'MMMM yyyy', { locale: fr }).toUpperCase()
    : format(new Date(), 'MMMM yyyy', { locale: fr }).toUpperCase();

  const qte        = parseFloat(appro.qte) || 0;
  const qteDisplay = Number.isInteger(qte) ? String(qte) : qte.toFixed(2);
  const qteWords   = toFrench(qte);
  const carburant  = (appro.carburant||'gazoil').toLowerCase() === 'gazoil' ? 'GASOIL' : 'ESSENCE';
  const numeroBon  = appro.numero_bon || '';
  const police     = appro.police  || appro.police_vehicule || '';
  const nCivil     = appro.nCivil || appro.ncivil || '';
  const marque     = (appro.marque || '').toUpperCase();
  const km         = String(appro.km || 0);
  const service    = appro.direction || appro.service_nom || '';

  const benNom = (appro.benificiaire_nom || appro.matricule_conducteur || '').toUpperCase();

  const chefFonction = (appro.chef_fonction || appro.benificiaire_fonction || 'CHEF DE SERVICE').toUpperCase();
  const chefNom      = (appro.chef_nom || appro.benificiaire_nom || '').toUpperCase();

  // ── LAYOUT CONSTANTS ──────────────────────────────────────────
  // Header: 7 lines × 4.5mm + N° block ≈ 46mm → sep at ~68mm
  const HEADER_Y  = 14;   // header block top
  const SEP_Y     = 60;   // separator right after header zone
  const TITLE_Y   = 70;   // "DOTATION MOIS …"  (~16mm below sep)
  const QTE_Y     = 85;   // quantity line       (~15mm below title)
  const FOOTER_Y  = 99;  // footer separator    (~21mm below qty)

  // ──────────────────────────────────────────────────────────────
  // TOP-LEFT: Official header block
  // ──────────────────────────────────────────────────────────────
  const headerLines = [
    'ROYAUME DU MAROC',
    "MINISTRE DE L'INTERIEUR",
    'DIRECTION GENERALE DE LA',
    'SURETE NATIONALE',
    "DIRECTION DE L'EQUIPEMENT",
    'ET DU BUDGET',
    'DIVISION DU PARC AUTOS',
  ];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let hy = HEADER_Y;
  headerLines.forEach(line => { doc.text(line, 40, hy, { align: 'center' }); hy += 4.3; });

  // N° block
  let ny = hy + 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('N°', ML, ny);
  doc.setFont('helvetica', 'bold');
  const bonText = numeroBon ? `${numeroBon} ` : '';
  doc.text(bonText, ML + 8, ny);
  doc.setFont('helvetica', 'normal');
  doc.text('  /DGSN/DEB/DPA/SCL', ML + 8 + doc.getTextWidth(bonText), ny);
  ny += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('N°', ML, ny);
  doc.text('     /DPA/SCL/SSAC', ML + 8, ny);

  // ──────────────────────────────────────────────────────────────
  // TOP-RIGHT: Vehicle info block
  // ──────────────────────────────────────────────────────────────
  const LX = 105;   // label start X
  const VX = 168;   // value start X
  let ry = HEADER_Y;
  const RH = 8.5;

  function infoRow(label, value) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, LX, ry);
    // fill dots between label end and value column
    const afterLabel = LX + doc.getTextWidth(label) + 1;
    const maxWidth = VX - afterLabel - 2;
    const allDots = '................................................................';
    let dots = '';
    for (let i = 1; i <= allDots.length; i++) {
      if (doc.getTextWidth(allDots.slice(0, i)) > maxWidth) { dots = allDots.slice(0, i-1); break; }
      dots = allDots.slice(0, i);
    }
    doc.text(dots, afterLabel, ry);
    doc.setFont('helvetica', 'bold');
    doc.text(value, VX, ry);
    ry += RH;
  }

  infoRow('DATE DE LIVRAISON',  dateStr);
  infoRow('MARQUE DU VEHICULE', marque);
  infoRow('N° POLICE',          police);
  infoRow('N° CIVIL',           nCivil);
  infoRow('SERVICE',            service);
  infoRow('KILOMETRAGE',        km);

  // ──────────────────────────────────────────────────────────────
  // Single thick separator line (after header zone)
  // ──────────────────────────────────────────────────────────────
  doc.setLineWidth(0.8);
  doc.line(ML, SEP_Y, MR, SEP_Y);

  // ──────────────────────────────────────────────────────────────
  // CENTER TITLE: bold italic
  // ──────────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bolditalic');
  const title = appro.type_approvi === 'DOTATION'
    ? `DOTATION MOIS ${moisLabel}`
    : 'BON DE CARBURANT - MISSION';
  doc.text(title, PW/2, TITLE_Y, { align: 'center' });

  // ──────────────────────────────────────────────────────────────
  // QTE LINE: "DOUZE....(12).. LITRES DE ESSENCE./"
  // No leading dots — word comes first
  // ──────────────────────────────────────────────────────────────
  const qteLine = `${qteWords}....(${qteDisplay}).. LITRES DE ${carburant}./`;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(qteLine, PW/2, QTE_Y, { align: 'center' });

  // Mission extra fields
  if (appro.type_approvi === 'MISSION') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const benNom = (appro.benificiaire_nom || appro.matricule_conducteur || '').toUpperCase();
    let my = QTE_Y + 12;
    if (benNom)               { doc.text(`Conducteur: ${benNom}`, ML, my); my += 7; }
    if (appro.num_envoi)      { doc.text(`N° Ordre de mission: ${appro.num_envoi}`, ML, my); my += 7; }
    if (appro.service_affecte){ doc.text(`Service affecté: ${appro.service_affecte}`, ML, my); my += 7; }
    if (appro.destination)    { doc.text(`Destination: ${appro.destination}`, ML, my); }
  }

  if (appro.observations) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    const obsLines = doc.splitTextToSize(`Observations: ${appro.observations}`, 170);
    doc.text(obsLines, PW/2, QTE_Y + 14, { align: 'center' });
  }

  // ──────────────────────────────────────────────────────────────
  // FOOTER separator (at half-page = 148 mm)
  // ──────────────────────────────────────────────────────────────


  // FOOTER:
  //  LEFT                               RIGHT (RIGHT_X)
  //  ─────────────────────────────────  ────────────────────────────────────
  //  [chefFonction small normal]
  //  MR. [chefNom bold]
  //
  //  LE CHEF DE SERVICE (underlined)    VISA DU CHEF DE LA DIVISION (underlined)
  //  CARBURANT ET LUBRIFIANTS P./       DU PARC-AUTO (underlined)
  //   ↑ same row as VISA                 ↑ same row as CARBURANT

  const RIGHT_X = 115;

  const TOP_Y = FOOTER_Y + 7;   // chef fonction label  (left only)
  const NOM_Y = FOOTER_Y + 14;  // MR. nom              (left only)
  const SIG_Y = FOOTER_Y + 24;  // LE CHEF DE SERVICE  /  VISA DU CHEF DE LA DIVISION
  const BOT_Y = FOOTER_Y + 29;  // CARBURANT ...        /  DU PARC-AUTO

  // ── LEFT top: chef info ──────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(chefFonction, ML, TOP_Y);
  doc.setFont('helvetica', 'bold');
  if (chefNom) doc.text(`MR. ${chefNom}`, ML, NOM_Y);

   // ── LEFT SIG_Y: LE CHEF DE SERVICE (underlined) ──────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const leftSig = 'LE CHEF DE SERVICE';
  doc.text(leftSig, ML, SIG_Y);
  doc.setLineWidth(0.4);
  doc.line(ML, SIG_Y + 1.5, ML + doc.getTextWidth(leftSig), SIG_Y + 1.5);

  // ── LEFT BOT_Y: CARBURANT ET LUBRIFIANTS P./ ─────────────────
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const leftSigb='CARBURANT ET LUBRIFIANTS P./';
  doc.text(leftSigb, ML, BOT_Y);
   doc.setLineWidth(0.4);
  doc.line(ML, BOT_Y + 1.5, ML + doc.getTextWidth(leftSigb), BOT_Y + 1.5);

  // ── RIGHT SIG_Y: VISA DU CHEF DE LA DIVISION (underlined) ────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const visaA = 'VISA DU CHEF DE LA DIVISION';
  doc.text(visaA, RIGHT_X, SIG_Y);
  doc.setLineWidth(0.4);
  doc.line(RIGHT_X, SIG_Y + 1.5, RIGHT_X + doc.getTextWidth(visaA), SIG_Y + 1.5);

  // ── RIGHT BOT_Y: DU PARC-AUTO (underlined) ───────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const visaB = 'DU PARC-AUTO';
  doc.text(visaB, RIGHT_X, BOT_Y);
  doc.setLineWidth(0.4);
  doc.line(RIGHT_X, BOT_Y + 1.5, RIGHT_X + doc.getTextWidth(visaB), BOT_Y + 1.5);

  // ──────────────────────────────────────────────────────────────
  // Save
  // ──────────────────────────────────────────────────────────────
  const filename = `bon_${numeroBon || appro.id || 'appro'}.pdf`;
  doc.save(filename);
};