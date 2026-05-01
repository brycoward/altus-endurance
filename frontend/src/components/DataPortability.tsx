import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { Download, Upload, AlertTriangle, CheckCircle, FileJson, FileText, Info } from 'lucide-react';
import { clsx } from 'clsx';

export function DataPortability() {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = async () => {
    const blob = await api.exportJson();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altus_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    const blob = await api.exportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altus_logs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importMode === 'replace') {
      setPendingFile(file);
      setShowReplaceConfirm(true);
    } else {
      doImport(file);
    }
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  const doImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    setShowReplaceConfirm(false);
    setPendingFile(null);
    try {
      const result = await api.importData(file, importMode);
      setImportResult(result);
    } catch (err: any) {
      setImportError(err?.response?.data?.detail || 'Import failed. Please check the file and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[rgb(var(--bg-primary))] p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Data Portability</h1>
        <p className="text-[rgb(var(--text-secondary))] font-medium mt-1">Export your data for backup or sharing, or import from a previous archive.</p>
      </div>

      {/* Export Section */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
        <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Export Your Data</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JSON Export */}
          <div className="border border-[rgb(var(--border))] rounded-2xl p-5 space-y-4 bg-[rgb(var(--bg-primary))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <FileJson className="text-emerald-400" size={22} />
              </div>
              <div>
                <div className="font-black text-[rgb(var(--text-primary))]">JSON Archive</div>
                <div className="text-xs text-[rgb(var(--text-muted))]">Full data backup</div>
              </div>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Exports all your data — profile, goals, nutrition journal, activity logs, biometrics, and endurance records.
            </p>
            <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <Info size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-400 font-medium">
                Recommended format for archiving your data and importing to a new account.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-colors"
            >
              <Download size={16} />
              Download .json
            </button>
          </div>

          {/* CSV Export */}
          <div className="border border-[rgb(var(--border))] rounded-2xl p-5 space-y-4 bg-[rgb(var(--bg-primary))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <FileText className="text-blue-400" size={22} />
              </div>
              <div>
                <div className="font-black text-[rgb(var(--text-primary))]">CSV Log Export</div>
                <div className="text-xs text-[rgb(var(--text-muted))]">For sharing & analysis</div>
              </div>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Exports a flat spreadsheet of your nutrition journal, activity log, and biometrics — ideal for sharing with a dietician or analysing in Excel.
            </p>
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-400 font-medium">
                This format cannot be re-imported. Use JSON for backups.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-400 transition-colors"
            >
              <Download size={16} />
              Download .csv
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
        <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Import Data</h2>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Import Mode</label>
          <div className="flex rounded-xl overflow-hidden border border-[rgb(var(--border))] w-fit">
            <button
              onClick={() => setImportMode('merge')}
              className={clsx(
                "px-5 py-2.5 text-sm font-bold transition-colors",
                importMode === 'merge'
                  ? "bg-emerald-500 text-black"
                  : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              )}
            >
              Merge
            </button>
            <button
              onClick={() => setImportMode('replace')}
              className={clsx(
                "px-5 py-2.5 text-sm font-bold transition-colors",
                importMode === 'replace'
                  ? "bg-red-500 text-white"
                  : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
              )}
            >
              Replace
            </button>
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))] max-w-md">
            {importMode === 'merge'
              ? "Merge adds new records from the file without touching existing data. Safe to run anytime."
              : "Replace wipes ALL your current logs and replaces them with the file contents. This cannot be undone."
            }
          </p>
        </div>

        {importMode === 'replace' && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-medium">
              Replace mode will permanently delete all your existing food logs, activity logs, and health metrics before importing. Make sure you have a JSON backup first.
            </p>
          </div>
        )}

        {/* Upload Button */}
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors disabled:opacity-50",
            importMode === 'replace'
              ? "bg-red-500 text-white hover:bg-red-400"
              : "bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))]"
          )}
        >
          <Upload size={18} />
          {importing ? 'Importing...' : 'Upload .json Archive'}
        </button>

        {/* Result */}
        {importResult && (
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-black">Import Successful ({importResult.mode})</p>
              <p className="text-xs text-emerald-400 mt-1 opacity-80">
                Added: {importResult.imported?.food ?? 0} food logs · {importResult.imported?.activity ?? 0} activities · {importResult.imported?.health ?? 0} biometric entries
              </p>
            </div>
          </div>
        )}

        {importError && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-medium">{importError}</p>
          </div>
        )}
      </div>

      {/* Replace Confirmation Modal */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--bg-secondary))] border border-red-500/30 rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={28} />
              <h3 className="text-xl font-black text-[rgb(var(--text-primary))]">Confirm Replace</h3>
            </div>
            <p className="text-[rgb(var(--text-secondary))]">
              This will <span className="text-red-400 font-black">permanently delete</span> all your existing food logs, activity logs, and biometric entries, then replace them with the contents of your archive file.
            </p>
            <p className="text-sm text-[rgb(var(--text-muted))]">Are you absolutely sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReplaceConfirm(false); setPendingFile(null); }}
                className="flex-1 py-3 rounded-xl font-black text-sm border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingFile && doImport(pendingFile)}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-red-500 text-white hover:bg-red-400 transition-colors"
              >
                Yes, Replace Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
