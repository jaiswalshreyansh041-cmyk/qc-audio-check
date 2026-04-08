import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, VerticalAlign,
  PageBreak, BorderStyle,
} from 'docx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCORE_HEX   = { 5: '15803D', 4: '16A34A', 3: 'A16207', 2: 'C2410C', 1: 'B91C1C' };
const SCORE_LABEL = { 5: 'Excellent', 4: 'Good', 3: 'Borderline', 2: 'Poor', 1: 'Very Poor' };

const NO_BORDER = {
  top:    { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left:   { style: BorderStyle.NONE, size: 0 },
  right:  { style: BorderStyle.NONE, size: 0 },
};

const THIN_BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  left:   { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  right:  { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
};

function mkCell(text, { bold = false, color = '111827', bg = 'FFFFFF', width, align = AlignmentType.LEFT, italic = false, size = 18 } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: bg, type: 'clear', color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    borders: THIN_BORDER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text ?? ''), bold, italic, color, size, font: 'Calibri' })],
    })],
  });
}

function mkHeaderCell(text, width) {
  return mkCell(text, { bold: true, color: 'FFFFFF', bg: '1E3A5F', width, size: 18 });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () => new Paragraph({ children: [new TextRun({ text: '' })] }));
}

// ─── Executive summary table ──────────────────────────────────────────────────

function summaryTable(allResults) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          mkHeaderCell('#', 6),
          mkHeaderCell('Audio File', 42),
          mkHeaderCell('Passed', 14),
          mkHeaderCell('Failed', 14),
          mkHeaderCell('Pass Rate', 12),
          mkHeaderCell('Verdict', 12),
        ],
      }),
      ...allResults.map((item, idx) => {
        if (item.error) {
          return new TableRow({
            children: [
              mkCell(idx + 1, { align: AlignmentType.CENTER }),
              mkCell(item.audioName, { bold: true }),
              mkCell(`Error: ${item.error}`, { color: 'B91C1C', italic: true }),
              mkCell(''), mkCell(''),
              mkCell('ERROR', { bold: true, color: 'B91C1C', align: AlignmentType.CENTER }),
            ],
          });
        }
        const p   = item.results.filter((c) => c.passed).length;
        const f   = item.results.length - p;
        const ok  = f === 0;
        const pct = Math.round((p / item.results.length) * 100);
        return new TableRow({
          children: [
            mkCell(idx + 1, { align: AlignmentType.CENTER, color: '6B7280' }),
            mkCell(item.audioName, { bold: true }),
            mkCell(p, { bold: true, color: '15803D', align: AlignmentType.CENTER, bg: 'F0FDF4' }),
            mkCell(f, { bold: f > 0, color: f > 0 ? 'B91C1C' : '6B7280', align: AlignmentType.CENTER, bg: f > 0 ? 'FEF2F2' : 'FFFFFF' }),
            mkCell(`${pct}%`, { align: AlignmentType.CENTER, color: '374151' }),
            mkCell(ok ? 'PASS' : 'FAIL', { bold: true, color: ok ? '15803D' : 'B91C1C', bg: ok ? 'DCFCE7' : 'FEE2E2', align: AlignmentType.CENTER }),
          ],
        });
      }),
    ],
  });
}

// ─── Per-file checks table ────────────────────────────────────────────────────

function checksTable(results) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          mkHeaderCell('Check ID', 10),
          mkHeaderCell('Title', 18),
          mkHeaderCell('Metric', 16),
          mkHeaderCell('Pass Criteria', 16),
          mkHeaderCell('Score', 10),
          mkHeaderCell('Status', 8),
          mkHeaderCell('LLM Explanation', 22),
        ],
      }),
      ...results.map((c) => {
        const color = SCORE_HEX[c.score] || 'B91C1C';
        const ok    = c.passed;
        return new TableRow({
          children: [
            mkCell(c.id, { bold: true, color: '4338CA', bg: 'EEF2FF' }),
            mkCell(c.title, { bold: true, color: '111827' }),
            mkCell(c.metric, { italic: true, color: '4B5563', size: 16 }),
            mkCell(c.passCriteria, { italic: true, color: '4B5563', size: 16 }),
            mkCell(`${c.score}/5\n${SCORE_LABEL[c.score] || ''}`, { bold: true, color, align: AlignmentType.CENTER }),
            mkCell(ok ? 'PASS' : 'FAIL', { bold: true, color: ok ? '15803D' : 'B91C1C', bg: ok ? 'DCFCE7' : 'FEE2E2', align: AlignmentType.CENTER }),
            mkCell(c.explanation || '—', { color: '374151', size: 16 }),
          ],
        });
      }),
    ],
  });
}

// ─── File section ─────────────────────────────────────────────────────────────

function fileSection(item, idx) {
  const sectionParagraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: `File ${idx + 1}: ${item.audioName}`, color: '1E3A5F', size: 32, bold: true, font: 'Calibri' })],
    }),
  ];

  if (item.error) {
    sectionParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `Error: ${item.error}`, color: 'B91C1C', size: 20, font: 'Calibri' })],
      })
    );
    return sectionParagraphs;
  }

  const p    = item.results.filter((c) => c.passed).length;
  const f    = item.results.length - p;
  const ok   = f === 0;
  const pct  = Math.round((p / item.results.length) * 100);

  sectionParagraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'Verdict: ', bold: true, size: 22, font: 'Calibri' }),
        new TextRun({ text: ok ? 'PASS' : 'FAIL', bold: true, color: ok ? '15803D' : 'B91C1C', size: 22, font: 'Calibri' }),
        new TextRun({ text: `   ·   ${p} passed  /  ${f} failed  /  ${pct}% pass rate`, size: 20, color: '6B7280', font: 'Calibri' }),
      ],
    }),
    checksTable(item.results),
  );

  return sectionParagraphs;
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function downloadDocxReport(allResults, model) {
  const date         = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const modelLabel   = model === 'whisper' ? 'Whisper + GPT-4o (OpenAI)' : 'Gemini 3.1 Pro Preview (Google)';
  const passedFiles  = allResults.filter((r) => r.results && r.results.every((c) => c.passed)).length;

  const children = [
    // ── Title block ──
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'Audio QC Checker Report', bold: true, size: 48, color: '1E3A5F', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `Generated: ${date}`, size: 20, color: '6B7280', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `Model: ${modelLabel}`, size: 20, color: '6B7280', font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: `${allResults.length} files analysed  ·  ${passedFiles} passed  ·  ${allResults.length - passedFiles} failed`, size: 20, color: '374151', font: 'Calibri' }),
      ],
    }),

    // ── Executive Summary ──
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: 'Executive Summary', color: '1E3A5F', size: 32, bold: true, font: 'Calibri' })],
    }),
    summaryTable(allResults),

    // ── Detailed per-file sections ──
    ...allResults.flatMap((item, idx) => fileSection(item, idx)),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: '111827' } },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `audio-qc-report-${new Date().toISOString().slice(0, 10)}.docx`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
