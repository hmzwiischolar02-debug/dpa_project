import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calendar, Filter, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { statsService } from '../services/stats';
import { getUser } from '../services/auth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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

      // Create CSV content
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Véhicules', data.total_vehicules],
        ['Dotations Actives', data.dotations_actives],
        ['Consommation Totale (L)', data.consommation_totale],
        ['Quota Total (L)', data.quota_total],
        ['Quota Utilisé (%)', data.quota_percent],
        ['', ''],
        ['DOTATION', ''],
        ['Consommation DOTATION (L)', data.dotation_qte],
        ['Part DOTATION (%)', data.dotation_percent],
        ['Nombre DOTATION', data.dotation_count],
        ['', ''],
        ['MISSION', ''],
        ['Consommation MISSION (L)', data.mission_qte],
        ['Part MISSION (%)', data.mission_percent],
        ['Nombre MISSION', data.mission_count]
      ];

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rapport_${year}_${month.toString().padStart(2, '0')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      link.click();

      toast.success('Rapport exporté avec succès!');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error(error);
    }
  };

  const handleExportPDF = () => {
    toast.info('Fonctionnalité PDF en cours de développement');
    // TODO: Implement PDF export using jsPDF
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
                Export Excel (CSV)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Exporter les statistiques au format CSV pour analyse dans Excel
              </p>
              <button className="btn-primary flex items-center gap-2 w-full justify-center">
                <Download className="h-4 w-4" />
                Télécharger CSV
              </button>
            </div>
          </div>
        </div>

        {/* PDF Export */}
        <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer opacity-60" onClick={handleExportPDF}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Rapport PDF
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  Bientôt disponible
                </span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Générer un rapport PDF formaté avec graphiques et tableaux
              </p>
              <button className="btn-secondary flex items-center gap-2 w-full justify-center" disabled>
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
              <p className="text-sm text-gray-600 mb-1">Qte dotation Utilisé</p>
              <p className="text-2xl font-bold text-gray-900">{stats.quota_percent?.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">DOTATION</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Consommation:</span>
                <span className="text-lg font-bold text-blue-900">{stats.dotation_qte?.toFixed(0)} L</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-blue-700">Part:</span>
                <span className="text-lg font-bold text-blue-900">{stats.dotation_percent?.toFixed(1)}%</span>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900 mb-2">MISSION</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700">Consommation:</span>
                <span className="text-lg font-bold text-red-900">{stats.mission_qte?.toFixed(0)} L</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-red-700">Part:</span>
                <span className="text-lg font-bold text-red-900">{stats.mission_percent?.toFixed(1)}%</span>
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
          Les rapports incluent les statistiques de consommation, Qte dotation, véhicules, 
          et la répartition DOTATION/MISSION pour la période sélectionnée. 
          Les exports CSV peuvent être ouverts dans Excel pour une analyse approfondie.
        </p>
      </div>
    </div>
  );
}