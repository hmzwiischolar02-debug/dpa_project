import { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExcelImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setPreviewData(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/dotation/import-excel/analyze`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur analyse');
      }

      const data = await response.json();
      setPreviewData(data);
      
      if (data.summary.invalid_rows > 0) {
        toast.warning(`${data.summary.invalid_rows} ligne(s) invalide(s) détectée(s)`);
      } else {
        toast.success('Analyse réussie ! Vérifiez le preview.');
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    const validRows = previewData.rows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('Aucune ligne valide à importer');
      return;
    }

    if (!window.confirm(`Importer ${validRows.length} dotation(s) pour ${mois}/${annee} ?`)) {
      return;
    }

    setImporting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/dotation/import-excel/execute?mois=${mois}&annee=${annee}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            rows: validRows  // Send rows array directly, not JSON string
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        // Display detailed errors
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => {
            toast.error(`Ligne ${err.row}: ${err.message}`, { duration: 6000 });
          });
        }
        throw new Error(result.message || 'Erreur import');
      }

      toast.success(result.message);
      
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => {
          toast(w.message, { icon: '⚠️' });
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const getStatusIcon = (row) => {
    if (!row.valid) return <XCircle className="h-5 w-5 text-red-500" />;
    if (row.vehicle_status === 'create' || row.benef_status === 'create') {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = (row) => {
    if (!row.valid) return 'Erreur';
    const parts = [];
    if (row.vehicle_status === 'create') parts.push('Véh.➕');
    if (row.benef_status === 'create') parts.push('Bén.➕');
    if (row.service_status === 'not_found') parts.push('Serv.❌');
    return parts.length > 0 ? parts.join(' ') : 'OK';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Importer Dotations depuis Excel</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Upload & Config */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">1. Configuration</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Mois</label>
                <select
                  value={mois}
                  onChange={(e) => setMois(parseInt(e.target.value))}
                  className="input-field"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Année</label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(parseInt(e.target.value))}
                  className="input-field"
                  min="2020"
                  max="2030"
                />
              </div>

              <div>
                <label className="label">Fichier Excel</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                <span>{file.name}</span>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="btn-primary w-full"
            >
              {analyzing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Analyser le fichier
                </>
              )}
            </button>
          </div>

          {/* Step 2: Preview */}
          {previewData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">2. Aperçu & Validation</h3>

              {/* Summary */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Total lignes</p>
                  <p className="text-2xl font-bold text-blue-600">{previewData.summary.total_rows}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Valides</p>
                  <p className="text-2xl font-bold text-green-600">{previewData.summary.valid_rows}</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Invalides</p>
                  <p className="text-2xl font-bold text-red-600">{previewData.summary.invalid_rows}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Véhicules ➕</p>
                  <p className="text-2xl font-bold text-yellow-600">{previewData.summary.vehicles_to_create}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Bénéficiaires ➕</p>
                  <p className="text-2xl font-bold text-purple-600">{previewData.summary.beneficiaires_to_create}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">L.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Police</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Bénéficiaire</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Service</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Qté</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">État</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.rows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-gray-500">{row.row_number}</td>
                          <td className="px-3 py-2 font-mono">{row.police}</td>
                          <td className="px-3 py-2 truncate max-w-xs" title={row.nom}>{row.nom}</td>
                          <td className="px-3 py-2">{row.service_name}</td>
                          <td className="px-3 py-2 text-right">{row.qte}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(row)}
                              <span className="text-xs">{getStatusText(row)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {row.errors && row.errors.length > 0 && (
                              <div className="text-xs text-red-600">
                                {row.errors.map((err, i) => (
                                  <div key={i}>{err}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {previewData && (
              <>
                {previewData.summary.valid_rows > 0 ? (
                  <span className="text-green-600 font-medium">
                    ✓ {previewData.summary.valid_rows} dotation(s) prête(s) à importer
                  </span>
                ) : (
                  <span className="text-red-600">Aucune ligne valide</span>
                )}
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            
            {previewData && previewData.summary.valid_rows > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary"
              >
                {importing ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>Importer {previewData.summary.valid_rows} dotation(s)</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}