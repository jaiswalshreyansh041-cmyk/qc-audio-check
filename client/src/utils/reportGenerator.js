const SCORE_COLORS = {
  5: '#22c55e',
  4: '#4ade80',
  3: '#eab308',
  2: '#f97316',
  1: '#ef4444',
};

const SCORE_LABELS = { 5: 'Excellent', 4: 'Good', 3: 'Borderline', 2: 'Poor', 1: 'Very Poor' };

function scoreBar(score) {
  const color = SCORE_COLORS[score] || '#ef4444';
  const squares = [1, 2, 3, 4, 5]
    .map(i => `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${i <= score ? color : '#374151'};margin-right:2px;"></span>`)
    .join('');
  return `<div style="display:flex;align-items:center;gap:6px;">${squares}<span style="color:${color};font-weight:700;">${score}/5</span></div>`;
}

function statusBadge(passed) {
  return passed
    ? `<span style="background:#14532d;color:#4ade80;border:1px solid #166534;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.08em;">PASS</span>`
    : `<span style="background:#450a0a;color:#f87171;border:1px solid #7f1d1d;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.08em;">FAIL</span>`;
}

function checkRows(results) {
  return results.map(c => `
    <tr style="border-bottom:1px solid #1f2937;background:${c.passed ? 'transparent' : '#1c0a0a'};">
      <td style="padding:12px 10px;font-family:monospace;font-size:12px;color:#818cf8;background:#1e1b4b;white-space:nowrap;">${c.id}</td>
      <td style="padding:12px 10px;font-weight:600;color:#f9fafb;font-size:13px;">${c.title}</td>
      <td style="padding:12px 10px;color:#9ca3af;font-size:12px;">${c.metric}</td>
      <td style="padding:12px 10px;color:#9ca3af;font-size:12px;">${c.passCriteria}</td>
      <td style="padding:12px 10px;">${scoreBar(c.score)}<div style="font-size:10px;color:#6b7280;margin-top:2px;">${SCORE_LABELS[c.score] || ''}</div></td>
      <td style="padding:12px 10px;">${statusBadge(c.passed)}</td>
      <td style="padding:12px 10px;color:#d1d5db;font-size:12px;line-height:1.6;max-width:340px;">${c.explanation || '—'}</td>
    </tr>`).join('');
}

function fileSection(item, idx) {
  if (item.error) {
    return `
    <div style="margin-bottom:40px;border:1px solid #7f1d1d;border-radius:16px;overflow:hidden;">
      <div style="background:#450a0a;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">File ${idx + 1}</div>
          <h3 style="margin:0;color:#f9fafb;font-size:18px;">${item.audioName}</h3>
        </div>
        <span style="background:#7f1d1d;color:#fca5a5;border:1px solid #991b1b;padding:6px 16px;border-radius:99px;font-weight:700;font-size:13px;">ERROR</span>
      </div>
      <div style="padding:20px 24px;color:#f87171;font-size:13px;">${item.error}</div>
    </div>`;
  }

  const passed = item.results.filter(c => c.passed).length;
  const failed = item.results.length - passed;
  const allPass = failed === 0;
  const pct = Math.round((passed / item.results.length) * 100);

  return `
  <div style="margin-bottom:48px;border:1px solid ${allPass ? '#166534' : '#7f1d1d'};border-radius:16px;overflow:hidden;">
    <div style="background:${allPass ? '#052e16' : '#1c0505'};padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
      <div>
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">File ${idx + 1}</div>
        <h3 style="margin:0;color:#f9fafb;font-size:20px;font-weight:700;">${item.audioName}</h3>
      </div>
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="text-align:center;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:10px 18px;">
          <div style="font-size:26px;font-weight:800;color:#4ade80;">${passed}</div>
          <div style="font-size:10px;color:#16a34a;text-transform:uppercase;letter-spacing:.08em;">Passed</div>
        </div>
        <div style="text-align:center;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:10px 18px;">
          <div style="font-size:26px;font-weight:800;color:#f87171;">${failed}</div>
          <div style="font-size:10px;color:#dc2626;text-transform:uppercase;letter-spacing:.08em;">Failed</div>
        </div>
        <div style="text-align:center;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:10px 18px;">
          <div style="font-size:26px;font-weight:800;color:#e5e7eb;">${pct}%</div>
          <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Pass Rate</div>
        </div>
        <span style="background:${allPass ? '#14532d' : '#450a0a'};color:${allPass ? '#4ade80' : '#f87171'};border:2px solid ${allPass ? '#166534' : '#7f1d1d'};padding:8px 20px;border-radius:12px;font-size:18px;font-weight:800;letter-spacing:.06em;">${allPass ? 'PASS' : 'FAIL'}</span>
      </div>
    </div>

    <!-- Progress bar -->
    <div style="background:#030712;padding:0 28px;">
      <div style="background:#1f2937;height:4px;border-radius:0;overflow:hidden;">
        <div style="width:${pct}%;height:4px;background:${allPass ? '#22c55e' : 'linear-gradient(90deg,#22c55e,#ef4444)'};transition:width .5s;"></div>
      </div>
    </div>

    <!-- Checks table -->
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#030712;border-bottom:2px solid #1f2937;">
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;">Check ID</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Title</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Metric</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Pass Criteria</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Score</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Status</th>
            <th style="padding:12px 10px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Explanation</th>
          </tr>
        </thead>
        <tbody>${checkRows(item.results)}</tbody>
      </table>
    </div>
  </div>`;
}

export function generateHTMLReport(allResults, model) {
  const date = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const modelLabel = model === 'whisper' ? 'Whisper + GPT-4o (OpenAI)' : 'Gemini 3.1 Pro Preview (Google)';
  const totalFiles = allResults.length;
  const passedFiles = allResults.filter(r => r.results && r.results.every(c => c.passed)).length;
  const failedFiles = totalFiles - passedFiles;

  const summaryRows = allResults.map((item, idx) => {
    if (item.error) {
      return `<tr style="border-bottom:1px solid #1f2937;background:#1c0505;">
        <td style="padding:12px 16px;color:#9ca3af;">${idx + 1}</td>
        <td style="padding:12px 16px;color:#f9fafb;font-weight:500;">${item.audioName}</td>
        <td colspan="3" style="padding:12px 16px;color:#f87171;font-size:13px;">Error: ${item.error}</td>
      </tr>`;
    }
    const p = item.results.filter(c => c.passed).length;
    const f = item.results.length - p;
    const ok = f === 0;
    return `<tr style="border-bottom:1px solid #1f2937;${!ok ? 'background:#1c0505;' : ''}">
      <td style="padding:12px 16px;color:#9ca3af;">${idx + 1}</td>
      <td style="padding:12px 16px;color:#f9fafb;font-weight:500;">${item.audioName}</td>
      <td style="padding:12px 16px;color:#4ade80;font-weight:700;">${p}</td>
      <td style="padding:12px 16px;color:${f > 0 ? '#f87171' : '#6b7280'};font-weight:700;">${f}</td>
      <td style="padding:12px 16px;">${statusBadge(ok)}</td>
    </tr>`;
  }).join('');

  const detailSections = allResults.map((item, idx) => fileSection(item, idx)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio QC Report — ${date}</title>
</head>
<body style="margin:0;padding:0;background:#030712;color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b,#0f172a);border-bottom:1px solid #1f2937;padding:32px 40px;">
    <div style="max-width:1200px;margin:0 auto;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:20px;">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;background:#4f46e5;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🎧</div>
        <div>
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">Audio QC Checker Report</h1>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Phase 1 Checklist · ${date}</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:10px 16px;text-align:center;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Model</div>
          <div style="font-size:13px;color:#c7d2fe;font-weight:600;margin-top:2px;">${modelLabel}</div>
        </div>
        <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:10px 16px;text-align:center;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Files</div>
          <div style="font-size:20px;font-weight:800;color:#e5e7eb;">${totalFiles}</div>
        </div>
        <div style="background:#052e16;border:1px solid #166534;border-radius:10px;padding:10px 16px;text-align:center;">
          <div style="font-size:11px;color:#16a34a;text-transform:uppercase;letter-spacing:.08em;">Files Passed</div>
          <div style="font-size:20px;font-weight:800;color:#4ade80;">${passedFiles}</div>
        </div>
        <div style="background:${failedFiles > 0 ? '#450a0a' : '#111827'};border:1px solid ${failedFiles > 0 ? '#7f1d1d' : '#1f2937'};border-radius:10px;padding:10px 16px;text-align:center;">
          <div style="font-size:11px;color:${failedFiles > 0 ? '#dc2626' : '#6b7280'};text-transform:uppercase;letter-spacing:.08em;">Files Failed</div>
          <div style="font-size:20px;font-weight:800;color:${failedFiles > 0 ? '#f87171' : '#6b7280'};">${failedFiles}</div>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width:1200px;margin:0 auto;padding:36px 40px;">

    <!-- Executive Summary -->
    <div style="margin-bottom:48px;">
      <h2 style="font-size:18px;font-weight:700;color:#e5e7eb;margin:0 0 16px;display:flex;align-items:center;gap:8px;">
        <span style="color:#818cf8;">▸</span> Executive Summary
      </h2>
      <div style="background:#0f172a;border:1px solid #1f2937;border-radius:14px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#030712;border-bottom:2px solid #1f2937;">
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">#</th>
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Audio File</th>
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Passed</th>
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Failed</th>
              <th style="padding:12px 16px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Verdict</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Detailed Results -->
    <div>
      <h2 style="font-size:18px;font-weight:700;color:#e5e7eb;margin:0 0 24px;display:flex;align-items:center;gap:8px;">
        <span style="color:#818cf8;">▸</span> Detailed Results
      </h2>
      ${detailSections}
    </div>

  </div>

  <div style="border-top:1px solid #1f2937;padding:20px 40px;text-align:center;color:#374151;font-size:12px;">
    Generated by Audio QC Checker · ${date}
  </div>
</body>
</html>`;
}
