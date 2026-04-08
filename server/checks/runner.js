import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toFile } from 'openai/uploads';
import dotenv from 'dotenv';

dotenv.config();

// ─── QC Check definitions ────────────────────────────────────────────────────

const QC_CHECKS = [
  {
    id: 'P1-TR-01',
    title: 'ASR Cross-Check (WER/CER)',
    metric: 'Word Error Rate (English) / Character Error Rate (Indic)',
    passCriteria: 'WER ≤ 10% for English; CER ≤ 8% for Indic',
  },
  {
    id: 'P1-TR-02',
    title: 'Transcript Completeness',
    metric: 'Missing/fabricated content %',
    passCriteria: '≤5% missing; zero fabricated lines',
  },
  {
    id: 'P1-TR-03',
    title: 'Spelling & Grammar Errors',
    metric: 'Human typo and grammar error count',
    passCriteria: 'Zero spelling errors; zero grammar errors',
  },
  {
    id: 'P1-TR-04',
    title: 'Unicode & Script Correctness',
    metric: 'Script validation error count',
    passCriteria: 'Zero invalid chars; zero wrong-script intrusions',
  },
  {
    id: 'P1-TS-01',
    title: 'Timestamp Alignment Accuracy',
    metric: 'Average timestamp drift (seconds)',
    passCriteria: 'Timestamps within ±0.35s; zero overlapping segments',
  },
  {
    id: 'P1-TS-02',
    title: 'Speaker Label Consistency',
    metric: 'Speaker label error rate (%)',
    passCriteria: 'Zero speaker attribution errors',
  },
  {
    id: 'P1-CQ-01',
    title: 'Content & Task Compliance',
    metric: 'LLM-scored task adherence (1–5)',
    passCriteria: 'Score ≥ 4',
  },
  {
    id: 'P1-CQ-02',
    title: 'Speaker Naturalness & Prosody',
    metric: 'Predicted MOS (1–5)',
    passCriteria: 'MOS ≥ 3.5',
  },
  {
    id: 'P1-CQ-04',
    title: 'Speaker Balance & Turn Distribution',
    metric: 'Speaking time ratio (Speaker A% vs Speaker B%)',
    passCriteria: 'Neither speaker >70% of total time',
  },
];

// ─── Per-check evaluation instructions ──────────────────────────────────────

const CHECK_INSTRUCTIONS = {
  'P1-TR-01': `Compare the audio/transcription with the JSON transcript to estimate error rate.
- English: count substitutions, deletions, insertions vs total words → WER = errors / total_words
- Indic: count character-level errors → CER = errors / total_chars
- Score 5: ~0% errors | Score 4: WER≤10% or CER≤8% (PASS) | Score 3: WER≤20% or CER≤15% | Score 2: WER≤35% or CER≤25% | Score 1: >35%/>25%`,

  'P1-TR-02': `Assess whether the transcript captures all content without fabrication.
- Missing: content present in audio but absent from JSON
- Fabricated: text in JSON that was never spoken
- Score 5: 0% missing, 0 fabricated | Score 4: ≤5% missing, 0 fabricated (PASS) | Score 3: ≤10% missing or 1 fabricated | Score 2: ≤20% or 2-3 fabricated | Score 1: >20% or >3 fabricated`,

  'P1-TR-03': `Scan every word in the transcript JSON text for linguistic quality.
- Spelling: misspelled words, letter transpositions, phonetic typos
- Grammar: tense errors, subject-verb disagreement, missing articles
- Score 5: 0 errors | Score 4: 0 errors (PASS) | Score 3: 1-2 minor errors | Score 2: 3-5 errors | Score 1: >5 errors`,

  'P1-TR-04': `Inspect the raw JSON text for Unicode and script integrity.
- Invalid chars: replacement characters U+FFFD, unescaped control chars
- Script mixing: unexpected Cyrillic/Arabic/Devanagari in an otherwise Latin transcript (or vice-versa)
- Encoding artifacts: mojibake, raw HTML entities
- Score 5: 0 issues | Score 4: 0 issues (PASS) | Score 3: 1-2 isolated issues | Score 2: 3-5 issues | Score 1: systematic corruption`,

  'P1-TS-01': `Evaluate timestamp accuracy across all segments.
- Drift: difference in seconds between where a word/segment appears in audio vs its start/end timestamp
- Overlaps: segment N end_time > segment N+1 start_time
- Score 5: all within ±0.10s, zero overlaps | Score 4: within ±0.35s, zero overlaps (PASS) | Score 3: ≤0.5s drift or rare overlaps | Score 2: >0.5s drift or multiple overlaps | Score 1: major misalignment`,

  'P1-TS-02': `Check speaker label correctness and consistency throughout the transcript.
- Consistent format: "Speaker A" not "speakerA" or "SPEAKER_A" in the same file
- Attribution: each segment's text should match what that labeled speaker actually said
- Score 5: 0 inconsistencies, 0 attribution errors | Score 4: 0 attribution errors (PASS) | Score 3: 1-2 labeling inconsistencies | Score 2: 3-5 errors or confusion | Score 1: speakers systematically mixed`,

  'P1-CQ-01': `Evaluate overall content quality and task adherence.
- Logical flow: conversation follows a coherent structure
- Task compliance: content is appropriate for the apparent task type (interview, narration, Q&A, etc.)
- No off-topic, harmful, or inappropriate content
- Score 5: excellent task adherence | Score 4: meets criteria (PASS) | Score 3: mostly on-task with minor lapses | Score 2: partial compliance | Score 1: mostly off-task`,

  'P1-CQ-02': `Assess the naturalness and prosodic quality of the speech.
- Natural rhythm, appropriate pacing, varied intonation (not robotic/monotone)
- Appropriate disfluencies (ums, pauses) for conversational speech
- No synthetic artifacts, clipping, or unnatural cadence
- MOS prediction: Score 5 ≈ MOS 4.5+ | Score 4 ≈ MOS ≥ 3.5 (PASS) | Score 3 ≈ MOS ~3.0 | Score 2 ≈ MOS ~2.5 | Score 1 ≈ MOS <2.5`,

  'P1-CQ-04': `Calculate and evaluate speaking-time balance across speakers.
- Sum segment durations per speaker from the JSON timestamps
- Compute each speaker's share: speaker_time / total_time × 100
- Flag if any speaker exceeds 70%
- Score 5: 40–60% split | Score 4: both within 30–70% (PASS) | Score 3: one at 70–75% | Score 2: one at 75–80% | Score 1: one speaker >80%`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampScore(raw) {
  return Math.min(5, Math.max(1, parseInt(String(raw), 10) || 3));
}

function extractJSON(text) {
  // 1. Completed code fence (```json ... ```)
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* fall through */ }
  }

  // 2. Greedy JSON object search (handles truncated fences)
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
  }

  // 3. Partial response — try to recover score at minimum
  const scoreMatch = text.match(/"score"\s*:\s*([1-5])/);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1], 10);
    const expMatch = text.match(/"explanation"\s*:\s*"([^"]{10,})/);
    return { score, explanation: expMatch ? expMatch[1] + '…' : 'Response truncated.' };
  }

  throw new Error(`No JSON found in model response: ${text.slice(0, 300)}`);
}

function formatCheck(check, score, explanation, hasError = false) {
  return {
    id: check.id,
    title: check.title,
    metric: check.metric,
    passCriteria: check.passCriteria,
    score,
    explanation,
    passed: score >= 4,
    ...(hasError ? { error: true } : {}),
  };
}

// ─── OpenAI / GPT-4o ────────────────────────────────────────────────────────

function buildGPT4oPrompt(check, transcriptionResult, transcriptJson) {
  const transcriptionText = transcriptionResult?.text ?? 'Not available';
  const segments = Array.isArray(transcriptionResult?.segments)
    ? JSON.stringify(transcriptionResult.segments.slice(0, 50), null, 2).slice(0, 2500)
    : 'Not available';
  const transcriptPreview = JSON.stringify(transcriptJson, null, 2).slice(0, 5000);

  return `You are an expert audio quality-control (QC) judge evaluating transcript accuracy.

## Check: ${check.title} (${check.id})
Metric: ${check.metric}
Pass Criteria: ${check.passCriteria}

## Scoring (1–5):
5 = Excellent — fully meets/exceeds criteria
4 = Good — meets criteria (minimum PASS)
3 = Borderline — minor issues, slightly below criteria
2 = Poor — significant issues
1 = Very Poor — fails criteria completely

## Evaluation Instructions:
${CHECK_INSTRUCTIONS[check.id]}

## Whisper ASR Transcription Text:
${transcriptionText}

## Whisper Segments with Timestamps (up to 50):
${segments}

## Provided Transcript JSON (first 5 000 chars):
${transcriptPreview}

Evaluate the check carefully. Respond ONLY with valid JSON (no prose):
{"score": <1-5>, "explanation": "<3-5 sentences citing specific evidence>"}`;
}

async function runGPT4oCheck(openai, check, transcriptionResult, transcriptJson) {
  const prompt = buildGPT4oPrompt(check, transcriptionResult, transcriptJson);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert audio QC judge. Return ONLY valid JSON with keys "score" (integer 1-5) and "explanation" (string).',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 600,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return formatCheck(check, clampScore(parsed.score), parsed.explanation || 'No explanation provided.');
}

// ─── Google Gemini ───────────────────────────────────────────────────────────

function buildGeminiPrompt(check, transcriptJson) {
  const transcriptPreview = JSON.stringify(transcriptJson, null, 2).slice(0, 5000);

  return `You are an expert audio quality-control (QC) judge. The audio file above has been provided for your analysis along with the corresponding transcript JSON below.

## Check: ${check.title} (${check.id})
Metric: ${check.metric}
Pass Criteria: ${check.passCriteria}

## Scoring (1–5):
5 = Excellent — fully meets/exceeds criteria
4 = Good — meets criteria (minimum PASS)
3 = Borderline — minor issues, slightly below criteria
2 = Poor — significant issues
1 = Very Poor — fails criteria completely

## Evaluation Instructions:
${CHECK_INSTRUCTIONS[check.id]}

## Provided Transcript JSON (first 5 000 chars):
${transcriptPreview}

Listen to the audio and evaluate this check. Respond ONLY with valid JSON (no prose):
{"score": <1-5>, "explanation": "<3-5 sentences citing specific evidence>"}`;
}

async function runGeminiCheck(genAI, check, audioBase64, audioMimeType, transcriptJson) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-pro-preview',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildGeminiPrompt(check, transcriptJson);

  const result = await model.generateContent([
    { inlineData: { mimeType: audioMimeType, data: audioBase64 } },
    { text: prompt },
  ]);

  const text = result.response.text();
  const parsed = extractJSON(text);
  return formatCheck(check, clampScore(parsed.score), parsed.explanation || 'No explanation provided.');
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function runQCChecks({ audioBuffer, audioFilename, audioMimeType, transcriptJson, model }) {
  if (model === 'whisper') {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error(
        'OpenAI API key is missing. Open server/.env and set OPENAI_API_KEY=sk-... ' +
        'or switch the model to "Gemini 1.5 Pro" which uses your existing Google API key.'
      );
    }
    if (audioBuffer.length > 25 * 1024 * 1024) {
      throw new Error(
        'Audio file exceeds Whisper\'s 25 MB limit. Compress the file or switch to the Gemini model.'
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`[whisper] Transcribing "${audioFilename}" …`);
    const audioFile = await toFile(audioBuffer, audioFilename, { type: audioMimeType });
    const transcriptionResult = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });
    console.log(`[whisper] Transcription done (${transcriptionResult.text?.split(' ').length ?? 0} words). Running 9 checks…`);

    const settled = await Promise.allSettled(
      QC_CHECKS.map((check) => runGPT4oCheck(openai, check, transcriptionResult, transcriptJson))
    );

    return settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : formatCheck(QC_CHECKS[i], 1, `Check failed: ${r.reason?.message ?? 'Unknown error'}`, true)
    );
  }

  if (model === 'gemini') {
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      throw new Error('GOOGLE_API_KEY is not configured in server/.env');
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const audioBase64 = audioBuffer.toString('base64');

    console.log(`[gemini] Running 9 checks on "${audioFilename}" in parallel…`);

    const settled = await Promise.allSettled(
      QC_CHECKS.map((check) => runGeminiCheck(genAI, check, audioBase64, audioMimeType, transcriptJson))
    );

    return settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : formatCheck(QC_CHECKS[i], 1, `Check failed: ${r.reason?.message ?? 'Unknown error'}`, true)
    );
  }

  throw new Error(`Unknown model: "${model}"`);
}
