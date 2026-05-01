import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { Download, Upload, AlertTriangle, CheckCircle, FileJson, FileText, Info, Loader2, X, Activity } from 'lucide-react';
import { clsx } from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────────

type FitFileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface FitFileEntry {
  file: File;
  status: FitFileStatus;
  error?: string;
  result?: any;
}

// ── Component ─────────────────────────────────────────────────────────────

export function DataPortability() {
  // JSON/CSV import state
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  // .fit batch upload state
  const [fitFiles, setFitFiles] = useState<FitFileEntry[]>([]);
  const [fitRunning, setFitRunning] = useState(false);
  const fitFileRef = useRef<HTMLInputElement>(null);

  // ── Export ──────────────────────────────────────────────────────────────

  const handleExportJson = async () => {
    const blob = await api.exportJson();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altus_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    const blob = await api.exportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altus_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── JSON Import ─────────────────────────────────────────────────────────

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importMode === 'replace') {
      setPendingFile(file);
      setShowReplaceConfirm(true);
    } else {
      doImport(file);
    }
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

  // ── .fit Batch Upload ───────────────────────────────────────────────────

  const handleFitFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    // Add new files, avoiding duplicates by name
    setFitFiles(prev => {
      const existingNames = new Set(prev.map(f => f.file.name));
      const newEntries: FitFileEntry[] = picked
        .filter(f => !existingNames.has(f.name))
        .map(f => ({ file: f, status: 'pending' }));
      return [...prev, ...newEntries];
    });
    e.target.value = '';
  };

  const removeFitFile = (name: string) => {
    setFitFiles(prev => prev.filter(f => f.file.name !== name));
  };

  const clearCompleted = () => {
    setFitFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'error'));
  };

  const startFitUpload = async () => {
    const pending = fitFiles.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setFitRunning(true);

    for (const entry of pending) {
      // Mark as uploading
      setFitFiles(prev =>
        prev.map(f => f.file.name === entry.file.name ? { ...f, status: 'uploading' } : f)
      );
      try {
        const result = await api.uploadFitFile(entry.file);
        setFitFiles(prev =>
          prev.map(f => f.file.name === entry.file.name ? { ...f, status: 'done', result } : f)
        );
      } catch (err: any) {
        const msg = err?.response?.data?.detail || 'Upload failed';
        setFitFiles(prev =>
          prev.map(f => f.file.name === entry.file.name ? { ...f, status: 'error', error: msg } : f)
        );
      }
    }

    setFitRunning(false);
  };

  const pendingCount = fitFiles.filter(f => f.status === 'pending').length;
  const doneCount = fitFiles.filter(f => f.status === 'done').length;
  const errorCount = fitFiles.filter(f => f.status === 'error').length;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[rgb(var(--bg-primary))] p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Data Portability</h1>
        <p className="text-[rgb(var(--text-secondary))] font-medium mt-1">Export your data for backup or sharing, or import from a previous archive.</p>
      </div>

      {/* ── Export Section ── */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
        <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Export Your Data</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* JSON */}
          <div className="border border-[rgb(var(--border))] rounded-2xl p-5 space-y-4 bg-[rgb(var(--bg-primary))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10"><FileJson className="text-emerald-400" size={22} /></div>
              <div>
                <div className="font-black text-[rgb(var(--text-primary))]">JSON Archive</div>
                <div className="text-xs text-[rgb(var(--text-muted))]">Full data backup</div>
              </div>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Exports all your data — profile, goals, nutrition journal, activity logs, biometrics, and endurance records.</p>
            <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
              <Info size={14} className="text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-400 font-medium">Recommended format for archiving your data and importing to a new account.</p>
            </div>
            <button onClick={handleExportJson} className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-colors">
              <Download size={16} /> Download .json
            </button>
          </div>

          {/* CSV */}
          <div className="border border-[rgb(var(--border))] rounded-2xl p-5 space-y-4 bg-[rgb(var(--bg-primary))]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10"><FileText className="text-blue-400" size={22} /></div>
              <div>
                <div className="font-black text-[rgb(var(--text-primary))]">CSV Log Export</div>
                <div className="text-xs text-[rgb(var(--text-muted))]">For sharing & analysis</div>
              </div>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Exports a flat spreadsheet of your nutrition journal, activity log, and biometrics — ideal for sharing with a dietician or analysing in Excel.</p>
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-400 font-medium">This format cannot be re-imported. Use JSON for backups.</p>
            </div>
            <button onClick={handleExportCsv} className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-400 transition-colors">
              <Download size={16} /> Download .csv
            </button>
          </div>
        </div>
      </div>

      {/* ── .fit Batch Upload ── */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Batch .FIT File Upload</h2>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-1">Upload multiple .fit files at once — useful for importing the last 30 days of activities from your device.</p>
          </div>
          {fitFiles.length > 0 && doneCount > 0 && (
            <button onClick={clearCompleted} className="text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] font-bold transition-colors">
              Clear completed
            </button>
          )}
        </div>

        {/* Drop zone / picker */}
        <input type="file" accept=".fit" multiple ref={fitFileRef} className="hidden" onChange={handleFitFilePick} />
        <button
          onClick={() => fitFileRef.current?.click()}
          disabled={fitRunning}
          className="w-full border-2 border-dashed border-[rgb(var(--border))] hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors group disabled:opacity-50"
        >
          <div className="p-3 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
            <Activity className="text-indigo-400" size={28} />
          </div>
          <div className="text-center">
            <div className="font-black text-[rgb(var(--text-primary))]">Select .FIT Files</div>
            <div className="text-xs text-[rgb(var(--text-muted))] mt-1">Hold Ctrl/Cmd to select multiple files</div>
          </div>
        </button>

        {/* File queue */}
        {fitFiles.length > 0 && (
          <div className="space-y-2">
            {fitFiles.map(entry => (
              <div
                key={entry.file.name}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                  entry.status === 'pending' && "border-[rgb(var(--border))] bg-[rgb(var(--bg-primary))]",
                  entry.status === 'uploading' && "border-indigo-500/30 bg-indigo-500/5",
                  entry.status === 'done' && "border-emerald-500/30 bg-emerald-500/5",
                  entry.status === 'error' && "border-red-500/30 bg-red-500/5",
                )}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {entry.status === 'pending' && <div className="w-2 h-2 rounded-full bg-[rgb(var(--text-muted))]" />}
                  {entry.status === 'uploading' && <Loader2 size={16} className="text-indigo-400 animate-spin" />}
                  {entry.status === 'done' && <CheckCircle size={16} className="text-emerald-400" />}
                  {entry.status === 'error' && <AlertTriangle size={16} className="text-red-400" />}
                </div>

                {/* Filename */}
                <div className="flex-1 min-w-0">
                  <div className={clsx(
                    "font-bold truncate",
                    entry.status === 'done' && "text-emerald-400",
                    entry.status === 'error' && "text-red-400",
                    entry.status === 'uploading' && "text-indigo-400",
                    entry.status === 'pending' && "text-[rgb(var(--text-primary))]",
                  )}>
                    {entry.file.name}
                  </div>
                  {entry.status === 'done' && entry.result && (
                    <div className="text-xs text-emerald-400/70 mt-0.5">
                      {Math.round(entry.result.metrics?.total_kj ?? 0)} kJ · LT2: {Math.round(entry.result.new_lt2 ?? 0)}W
                    </div>
                  )}
                  {entry.status === 'error' && (
                    <div className="text-xs text-red-400/70 mt-0.5">{entry.error}</div>
                  )}
                </div>

                {/* File size */}
                <div className="text-xs text-[rgb(var(--text-muted))] shrink-0">
                  {(entry.file.size / 1024).toFixed(0)} KB
                </div>

                {/* Remove (only when not active) */}
                {entry.status !== 'uploading' && (
                  <button onClick={() => removeFitFile(entry.file.name)} className="text-[rgb(var(--text-muted))] hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary + Upload button */}
        {fitFiles.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--border))]">
            <div className="text-xs text-[rgb(var(--text-muted))] space-x-3">
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {doneCount > 0 && <span className="text-emerald-400">{doneCount} complete</span>}
              {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
            </div>
            <button
              onClick={startFitUpload}
              disabled={fitRunning || pendingCount === 0}
              className="flex items-center gap-2 bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-400 transition-colors disabled:opacity-50"
            >
              {fitRunning ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {fitRunning ? 'Uploading...' : `Upload ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* ── JSON Archive Import ── */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
        <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Import JSON Archive</h2>

        {/* Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Import Mode</label>
          <div className="flex rounded-xl overflow-hidden border border-[rgb(var(--border))] w-fit">
            <button onClick={() => setImportMode('merge')} className={clsx("px-5 py-2.5 text-sm font-bold transition-colors", importMode === 'merge' ? "bg-emerald-500 text-black" : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]")}>Merge</button>
            <button onClick={() => setImportMode('replace')} className={clsx("px-5 py-2.5 text-sm font-bold transition-colors", importMode === 'replace' ? "bg-red-500 text-white" : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]")}>Replace</button>
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))] max-w-md">
            {importMode === 'merge' ? "Merge adds new records from the file without touching existing data. Safe to run anytime." : "Replace wipes ALL your current logs and replaces them with the file contents. This cannot be undone."}
          </p>
        </div>

        {importMode === 'replace' && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-medium">Replace mode will permanently delete all your existing food logs, activity logs, and health metrics before importing. Make sure you have a JSON backup first.</p>
          </div>
        )}

        <input type="file" accept=".json" ref={jsonFileRef} className="hidden" onChange={handleJsonFileChange} />
        <button
          onClick={() => jsonFileRef.current?.click()}
          disabled={importing}
          className={clsx("flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors disabled:opacity-50",
            importMode === 'replace' ? "bg-red-500 text-white hover:bg-red-400" : "bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))]"
          )}
        >
          <Upload size={18} />
          {importing ? 'Importing...' : 'Upload .json Archive'}
        </button>

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
              <button onClick={() => { setShowReplaceConfirm(false); setPendingFile(null); }} className="flex-1 py-3 rounded-xl font-black text-sm border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Cancel</button>
              <button onClick={() => pendingFile && doImport(pendingFile)} className="flex-1 py-3 rounded-xl font-black text-sm bg-red-500 text-white hover:bg-red-400 transition-colors">Yes, Replace Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
