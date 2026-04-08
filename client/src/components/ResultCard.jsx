export default function ResultCard({ results }) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allPassed = failed === 0;

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all ${
      allPassed ? 'border-green-600 bg-green-950/20' : 'border-red-700 bg-red-950/10'
    }`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        {/* Verdict */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            allPassed ? 'bg-green-900/60' : 'bg-red-900/50'
          }`}>
            {allPassed ? (
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${allPassed ? 'text-green-400' : 'text-red-400'}`}>
              Overall: {allPassed ? 'PASS' : 'FAIL'}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {allPassed
                ? 'All 9 checks passed successfully'
                : `${failed} check${failed > 1 ? 's' : ''} failed — review required`}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 flex-shrink-0">
          <div className="text-center bg-green-950/60 border border-green-800/70 rounded-xl px-5 py-3">
            <div className="text-3xl font-bold text-green-400">{passed}</div>
            <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mt-0.5">Passed</div>
          </div>
          <div className="text-center bg-red-950/50 border border-red-900/60 rounded-xl px-5 py-3">
            <div className="text-3xl font-bold text-red-400">{failed}</div>
            <div className="text-xs text-red-700 font-semibold uppercase tracking-wide mt-0.5">Failed</div>
          </div>
          <div className="text-center bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-3">
            <div className="text-3xl font-bold text-gray-300">{results.length}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-0.5">Total</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            allPassed ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 via-yellow-500 to-red-500'
          }`}
          style={{ width: `${(passed / results.length) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-gray-600">
        <span>{passed}/{results.length} checks passed</span>
        <span>{Math.round((passed / results.length) * 100)}% pass rate</span>
      </div>
    </div>
  );
}
