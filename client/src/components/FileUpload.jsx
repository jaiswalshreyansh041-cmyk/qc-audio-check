import { useRef, useState } from 'react';

// ─── Single dropzone ─────────────────────────────────────────────────────────

function DropZone({ accept, label, description, file, onFileChange, icon }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-indigo-500 bg-indigo-950/40'
          : file
          ? 'border-green-600 bg-green-950/20'
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { if (e.target.files[0]) onFileChange(e.target.files[0]); }}
      />
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${file ? 'bg-green-900/60' : 'bg-gray-700'}`}>
          {file ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${file ? 'text-green-300' : 'text-gray-400'}`}>
            {file ? file.name : label}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : description}
          </p>
        </div>
      </div>
    </div>
  );
}

const AudioIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const JsonIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// ─── Multi-pair file manager ──────────────────────────────────────────────────

const MAX_PAIRS = 10;

export default function FileUpload({ pairs, onChange }) {
  const addPair = () => {
    if (pairs.length >= MAX_PAIRS) return;
    onChange([...pairs, { id: Date.now(), audioFile: null, transcriptFile: null }]);
  };

  const removePair = (id) => {
    onChange(pairs.filter((p) => p.id !== id));
  };

  const updatePair = (id, key, file) => {
    onChange(pairs.map((p) => (p.id === id ? { ...p, [key]: file } : p)));
  };

  const readyCount = pairs.filter((p) => p.audioFile && p.transcriptFile).length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Files
          <span className="text-xs text-gray-500 font-normal">
            ({pairs.length}/{MAX_PAIRS} pairs
            {readyCount > 0 ? ` · ${readyCount} ready` : ''})
          </span>
        </h2>
        {pairs.length < MAX_PAIRS && (
          <button
            onClick={addPair}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-950 border border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add pair
          </button>
        )}
      </div>

      {/* Pair list */}
      <div className="space-y-3">
        {pairs.map((pair, idx) => {
          const isReady = pair.audioFile && pair.transcriptFile;
          return (
            <div
              key={pair.id}
              className={`rounded-xl border p-3 transition-all ${
                isReady ? 'border-green-800/60 bg-green-950/10' : 'border-gray-700/60 bg-gray-800/20'
              }`}
            >
              {/* Pair header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    File Pair {idx + 1}
                  </span>
                  {isReady && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Ready
                    </span>
                  )}
                </div>
                {pairs.length > 1 && (
                  <button
                    onClick={() => removePair(pair.id)}
                    className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                )}
              </div>

              {/* Two dropzones side-by-side */}
              <div className="grid grid-cols-2 gap-2">
                <DropZone
                  accept=".mp3,.wav,.m4a,.flac"
                  label="Audio file"
                  description="MP3 · WAV · M4A · FLAC"
                  file={pair.audioFile}
                  onFileChange={(f) => updatePair(pair.id, 'audioFile', f)}
                  icon={<AudioIcon />}
                />
                <DropZone
                  accept=".json"
                  label="Transcript JSON"
                  description="JSON file"
                  file={pair.transcriptFile}
                  onFileChange={(f) => updatePair(pair.id, 'transcriptFile', f)}
                  icon={<JsonIcon />}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add pair hint when at max */}
      {pairs.length >= MAX_PAIRS && (
        <p className="text-xs text-gray-600 text-center mt-3">Maximum {MAX_PAIRS} file pairs reached</p>
      )}
    </div>
  );
}
