import { useState, useEffect } from 'react';
import axios from 'axios';
import { upload } from '@vercel/blob/client';
import FileUpload from './components/FileUpload';
import ModelSelector from './components/ModelSelector';
import ChecklistTable from './components/ChecklistTable';
import ResultCard from './components/ResultCard';
import { generateHTMLReport } from './utils/reportGenerator';
import { downloadDocxReport } from './utils/docGenerator';

const CHECK_TITLES = [
  'ASR Cross-Check (WER/CER)',
  'Transcript Completeness',
  'Spelling & Grammar Errors',
  'Unicode & Script Correctness',
  'Timestamp Alignment Accuracy',
  'Speaker Label Consistency',
  'Content & Task Compliance',
  'Speaker Naturalness & Prosody',
  'Speaker Balance & Turn Distribution',
];

export default function App() {
  const [pairs, setPairs]             = useState([{ id: 1, audioFile: null, transcriptFile: null }]);
  const [model, setModel]             = useState('gemini');
  const [allResults, setAllResults]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);
  const [currentFile, setCurrentFile] = useState({ idx: 0, name: '', total: 0 });
  const [docLoading, setDocLoading]   = useState(false);

  const validPairs = pairs.filter((p) => p.audioFile && p.transcriptFile);
  const canRun     = validPairs.length > 0 && !loading;

  // Cycle through check titles while loading
  useEffect(() => {
    if (!loading) { setProgressIdx(0); return; }
    const id = setInterval(() => setProgressIdx((i) => (i + 1) % CHECK_TITLES.length), 1800);
    return () => clearInterval(id);
  }, [loading]);

  // ── Run files one by one (sequential) ──────────────────────────────────────
  const handleRunQC = async () => {
    setLoading(true);
    setAllResults([]);

    const accumulated = [];

    for (let i = 0; i < validPairs.length; i++) {
      const pair = validPairs[i];
      setCurrentFile({ idx: i, name: pair.audioFile.name, total: validPairs.length });

      let entry;
      try {
        const DIRECT_LIMIT = 4 * 1024 * 1024; // 4 MB
        let data;

        if (pair.audioFile.size <= DIRECT_LIMIT) {
          // Small file — direct multipart upload (works locally without blob token)
          const fd = new FormData();
          fd.append('audioFile', pair.audioFile);
          fd.append('transcriptFile', pair.transcriptFile);
          fd.append('model', model);
          ({ data } = await axios.post('/api/run-qc', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 360_000,
          }));
        } else {
          // Large file — upload to Vercel Blob first, then pass URL to server
          const blob = await upload(pair.audioFile.name, pair.audioFile, {
            access: 'public',
            handleUploadUrl: '/api/upload',
          });

          const transcriptJson = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try { resolve(JSON.parse(e.target.result)); }
              catch { reject(new Error('Transcript file contains invalid JSON')); }
            };
            reader.onerror = () => reject(new Error('Failed to read transcript file'));
            reader.readAsText(pair.transcriptFile);
          });

          ({ data } = await axios.post('/api/run-qc-url', {
            audioUrl: blob.url,
            audioFilename: pair.audioFile.name,
            transcriptJson,
            model,
          }, { timeout: 360_000 }));
        }

        entry = { id: pair.id, audioName: pair.audioFile.name, results: data.results, error: null };
      } catch (err) {
        entry = {
          id: pair.id,
          audioName: pair.audioFile.name,
          results: null,
          error: err.response?.data?.error ?? err.message ?? 'Unknown error',
        };
      }

      accumulated.push(entry);
      setAllResults([...accumulated]); // show results as each file completes
    }

    setLoading(false);
    setCurrentFile({ idx: 0, name: '', total: 0 });
  };

  // ── Download HTML ──────────────────────────────────────────────────────────
  const handleDownloadHTML = () => {
    const html  = generateHTMLReport(allResults, model);
    const blob  = new Blob([html], { type: 'text/html' });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement('a'), {
      href: url,
      download: `audio-qc-report-${new Date().toISOString().slice(0, 10)}.html`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Download DOCX ──────────────────────────────────────────────────────────
  const handleDownloadDocx = async () => {
    setDocLoading(true);
    try {
      await downloadDocxReport(allResults, model);
    } finally {
      setDocLoading(false);
    }
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const processedCount = allResults?.filter((r) => r.results || r.error).length ?? 0;
  const filePassCount  = allResults?.filter((r) => r.results && r.results.every((c) => c.passed)).length ?? 0;
  const fileFailCount  = allResults ? processedCount - filePassCount : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Header ── */}
      <header className="bg-gray-900 border-b border-gray-800 shadow-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2
                   1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2
                   1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Audio QC Checker</h1>
            <p className="text-xs text-gray-400 mt-0.5">Phase 1 Checklist — 9 Quality Control Checks</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ── Upload + Model ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <FileUpload pairs={pairs} onChange={setPairs} />
          </div>
          <ModelSelector model={model} onChange={setModel} />
        </div>

        {/* ── Run button ── */}
        <div className="flex justify-center">
          <button
            onClick={handleRunQC}
            disabled={!canRun}
            className={`px-10 py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center gap-3 ${
              canRun
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 hover:scale-105 active:scale-100'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running QC Checks…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run QC Checks
                {validPairs.length > 1 && (
                  <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2 py-0.5 rounded-full">
                    {validPairs.length} files · sequential
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* ── Progress ── */}
        {loading && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            {/* File progress bar */}
            {currentFile.total > 1 && (
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-400">
                    File {currentFile.idx + 1} of {currentFile.total}
                  </span>
                  <span className="text-xs text-gray-500">
                    {allResults?.length ?? 0} completed
                  </span>
                </div>
                <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${((allResults?.length ?? 0) / currentFile.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="p-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[0, 150, 300].map((d) => (
                  <div key={d} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              {currentFile.name && (
                <p className="text-sm font-medium text-white truncate px-4">
                  {currentFile.name}
                </p>
              )}
              <p className="text-indigo-300 text-sm">
                Running: {CHECK_TITLES[progressIdx]}…
              </p>
              <p className="text-gray-600 text-xs">All 9 checks running in parallel for this file</p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {allResults && allResults.length > 0 && (
          <div className="space-y-8">
            {/* ── Download bar ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3">
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{processedCount}</span> file{processedCount !== 1 ? 's' : ''} processed
                {loading && currentFile.total > 0 && (
                  <span className="text-indigo-400 ml-2">
                    · analysing {currentFile.idx + 1}/{currentFile.total}…
                  </span>
                )}
                {!loading && (
                  <>
                    {' · '}
                    <span className="text-green-400 font-semibold">{filePassCount} passed</span>
                    {' · '}
                    <span className="text-red-400 font-semibold">{fileFailCount} failed</span>
                  </>
                )}
              </p>

              {/* Download buttons — shown once at least one result is ready */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* HTML report */}
                <button
                  onClick={handleDownloadHTML}
                  className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  title="Download HTML report"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  HTML
                </button>

                {/* Word DOCX report */}
                <button
                  onClick={handleDownloadDocx}
                  disabled={docLoading}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                    docLoading
                      ? 'bg-blue-900/40 text-blue-400 cursor-wait'
                      : 'bg-blue-700 hover:bg-blue-600 text-white'
                  }`}
                  title="Download Word (.docx) report"
                >
                  {docLoading ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Word (.docx)
                </button>
              </div>
            </div>

            {/* ── Per-file results ── */}
            {allResults.map((item, idx) => (
              <div key={item.id} className="space-y-4">
                {/* File label */}
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white flex-1 min-w-0 truncate">
                    {item.audioName}
                  </h3>
                  {item.results && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${
                      item.results.every((c) => c.passed)
                        ? 'bg-green-950 text-green-400 border-green-700'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {item.results.every((c) => c.passed) ? 'PASS' : 'FAIL'}
                    </span>
                  )}
                  {/* Spinner for in-progress file (last item while loading) */}
                  {loading && idx === allResults.length - 1 && !item.error && item.results && (
                    <svg className="animate-spin w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>

                {/* Error */}
                {item.error && (
                  <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 text-sm text-red-300">
                    <span className="font-semibold">Error: </span>{item.error}
                  </div>
                )}

                {/* Results */}
                {item.results && (
                  <>
                    <ResultCard results={item.results} />
                    <ChecklistTable results={item.results} />
                  </>
                )}

                {idx < allResults.length - 1 && (
                  <div className="border-t border-gray-800/60 pt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
