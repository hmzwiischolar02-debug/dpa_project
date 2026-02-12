import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calendar, Filter, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { statsService } from '../services/stats';
import { getUser } from '../services/auth';
import { generateStatisticsPDF } from '../utils/pdfExport';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function Rapports() {
  const [reportType, setReportType] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';

  // Fetch dashboard stats for report
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboard()
  });

  const handleExportExcel = async () => {
    try {
      // Fetch data
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/stats/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary Statistics
      const summaryData = [
        ['RAPPORT STATISTIQUES DPA SCL'],
        ['Période:', `${getMonthName(month)} ${year}`],
        ['Date génération:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        [''],
        ['STATISTIQUES GÉNÉRALES'],
        ['Métrique', 'Valeur'],
        ['Total Véhicules', data.total_vehicules || 0],
        ['Dotations Actives', data.dotations_actives || 0],
        ['Consommation Totale (L)', (data.consommation_totale || 0).toFixed(2)],
        ['Quota Total (L)', (data.quota_total || 0).toFixed(2)],
        ['Quota Utilisé (%)', data.quota_percent ? `${data.quota_percent.toFixed(2)}%` : '0%'],
        [''],
        ['RÉPARTITION PAR TYPE'],
        ['Type', 'Consommation (L)', 'Part (%)', 'Nombre'],
        ['DOTATION', (data.consommation_dotation || 0).toFixed(2), ((data.consommation_dotation || 0) * 100 / (data.consommation_totale || 1)).toFixed(2) + '%', data.dotation_count || 0],
        ['MISSION', (data.consommation_mission || 0).toFixed(2), ((data.consommation_mission || 0) * 100 / (data.consommation_totale || 1)).toFixed(2) + '%', data.mission_count || 0],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Set column widths
      summarySheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 }
      ];

      // Add summary sheet
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Statistiques');

      // Generate filename
      const monthName = getMonthName(month);
      const filename = `rapport_${monthName}_${year}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);

      toast.success('Rapport Excel exporté avec succès!');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error(error);
    }
  };

  const handleExportPDF = async () => {
    try {
      // Fetch fresh data
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/stats/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // Generate PDF
      const filename = generateStatisticsPDF(data, month, year);
      toast.success(`Rapport PDF généré: ${filename}`);
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
      console.error(error);
    }
  };

  const getMonthName = (monthNum) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthNum - 1] || 'Inconnu';
  };

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Accès Administrateur Requis
        </h3>
        <p className="text-gray-600">
          Seuls les administrateurs peuvent générer des rapports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary-600" />
          Rapports & Exports
        </h1>
        <p className="text-gray-600">
          Générer et exporter des rapports (ADMIN uniquement)
        </p>
      </div>

      {/* Filter Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Paramètres du rapport
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type */}
          <div>
            <label className="label">Type de rapport</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input-field"
            >
              <option value="monthly">Rapport Mensuel</option>
              <option value="yearly">Rapport Annuel</option>
              <option value="custom">Période Personnalisée</option>
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="label">Mois</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="input-field"
              disabled={reportType === 'yearly'}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="label">Année</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="input-field"
            >
              {[...Array(3)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Excel Export */}
        <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportExcel}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Export Excel
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Exporter les statistiques au format Excel (.xlsx) pour analyse approfondie
              </p>
              <button className="btn-primary flex items-center gap-2 w-full justify-center">
                <Download className="h-4 w-4" />
                Télécharger Excel
              </button>
            </div>
          </div>
        </div>

        {/* PDF Export */}
        <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleExportPDF}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Rapport PDF
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Générer un rapport PDF formaté avec graphiques et tableaux
              </p>
              <button className="btn-primary flex items-center gap-2 w-full justify-center">
                <Download className="h-4 w-4" />
                Générer PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Preview */}
      {stats && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aperçu des statistiques actuelles
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Véhicules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_vehicules}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Dotations Actives</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dotations_actives}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Consommation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.consommation_totale?.toFixed(0)} L</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Quota Total Utilisé</p>
              <p className="text-2xl font-bold text-gray-900">{stats.quota_total?.toFixed(0)} L</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">DOTATION</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Consommation:</span>
                <span className="text-lg font-bold text-blue-900">{stats.consommation_dotation?.toFixed(0)} L</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-blue-700">Part:</span>
                <span className="text-lg font-bold text-blue-900">{((stats.consommation_dotation || 0) * 100 / (stats.consommation_totale || 1))?.toFixed(2)}%</span>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900 mb-2">MISSION</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700">Consommation:</span>
                <span className="text-lg font-bold text-red-900">{stats.consommation_mission?.toFixed(0)} L</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-red-700">Part:</span>
                <span className="text-lg font-bold text-red-900">{((stats.consommation_mission || 0) * 100 / (stats.consommation_totale || 1))?.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card p-4 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">
          💡 Information
        </h4>
        <p className="text-sm text-gray-600">
          Les rapports incluent les statistiques de consommation, quota total, véhicules, 
          et la répartition DOTATION/MISSION pour la période sélectionnée. 
          Les exports Excel peuvent être ouverts dans Excel, LibreOffice ou Google Sheets pour une analyse approfondie.
        </p>
      </div>
    </div>
  );
}