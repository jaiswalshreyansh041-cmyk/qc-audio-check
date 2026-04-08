import { useState } from 'react';

// ─── Score config ────────────────────────────────────────────────────────────

const SCORE_CONFIG = {
  5: { squares: 'bg-green-500',  text: 'text-green-400',  label: 'Excellent'  },
  4: { squares: 'bg-green-400',  text: 'text-green-300',  label: 'Good'       },
  3: { squares: 'bg-yellow-500', text: 'text-yellow-400', label: 'Borderline' },
  2: { squares: 'bg-orange-500', text: 'text-orange-400', label: 'Poor'       },
  1: { squares: 'bg-red-500',    text: 'text-red-400',    label: 'Very Poor'  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const cfg = SCORE_CONFIG[score] ?? SCORE_CONFIG[1];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${i <= score ? cfg.squares : 'bg-gray-700'}`}
          />
        ))}
      </div>
      <span className={`text-sm font-bold tabular-nums ${cfg.text}`}>{score}/5</span>
    </div>
  );
}

function StatusBadge({ passed }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${
      passed
        ? 'bg-green-950 text-green-400 border-green-700'
        : 'bg-red-950 text-red-400 border-red-800'
    }`}>
      {passed ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd" />
        </svg>
      )}
      {passed ? 'PASS' : 'FAIL'}
    </span>
  );
}

function CheckIdBadge({ id }) {
  return (
    <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/70 px-2 py-1 rounded whitespace-nowrap">
      {id}
    </span>
  );
}

function Explanation({ result }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${result.passed ? 'bg-green-600' : 'bg-red-600'}`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">LLM Explanation</p>
        <p className="text-sm text-gray-300 leading-relaxed">{result.explanation}</p>
        {result.error && (
          <p className="text-xs text-red-400 mt-2 bg-red-950/50 px-3 py-2 rounded-lg border border-red-900">
            This check encountered an error during evaluation.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChecklistTable({ results }) {
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll  = () => setExpanded(new Set(results.map((r) => r.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          QC Check Results
        </h2>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950/40">
              {['Check ID', 'Title', 'Metric', 'Pass Criteria', 'Score', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    i === 2 ? 'hidden lg:table-cell' :
                    i === 3 ? 'hidden xl:table-cell' : ''
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {results.map((r) => (
              <>
                <tr
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className={`cursor-pointer transition-colors hover:bg-gray-800/40 ${
                    r.passed ? '' : 'bg-red-950/10'
                  }`}
                >
                  <td className="px-4 py-4 w-28">
                    <CheckIdBadge id={r.id} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-gray-200 text-sm">{r.title}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell max-w-xs">
                    <span className="text-gray-400 text-xs">{r.metric}</span>
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell max-w-xs">
                    <span className="text-gray-400 text-xs">{r.passCriteria}</span>
                  </td>
                  <td className="px-4 py-4 w-36">
                    <ScoreBadge score={r.score} />
                  </td>
                  <td className="px-4 py-4 w-24">
                    <StatusBadge passed={r.passed} />
                  </td>
                  <td className="px-4 py-4 w-10">
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded.has(r.id) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>
                {expanded.has(r.id) && (
                  <tr key={`${r.id}-exp`} className="bg-gray-950/50">
                    <td colSpan={7} className="px-6 py-4">
                      <Explanation result={r} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden divide-y divide-gray-800">
        {results.map((r) => (
          <div key={r.id} className={`p-4 ${r.passed ? '' : 'bg-red-950/10'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <CheckIdBadge id={r.id} />
                <span className="font-medium text-gray-200 text-sm leading-snug">{r.title}</span>
              </div>
              <StatusBadge passed={r.passed} />
            </div>
            <div className="flex items-center justify-between">
              <ScoreBadge score={r.score} />
              <button
                onClick={() => toggle(r.id)}
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
              >
                {expanded.has(r.id) ? 'Hide' : 'Show'} details
                <svg
                  className={`w-3 h-3 transition-transform ${expanded.has(r.id) ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {expanded.has(r.id) && (
              <div className="mt-3 bg-gray-950 rounded-xl p-4">
                <Explanation result={r} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
