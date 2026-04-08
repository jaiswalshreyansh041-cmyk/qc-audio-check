# Audio QC Checker

A full-stack web app that runs **9 Phase 1 QC checks** on an audio file + transcript JSON pair using either **OpenAI Whisper + GPT-4o** or **Google Gemini 1.5 Pro**.

---

## Setup

### 1. Install dependencies

```bash
# From the project root — installs root, server, and client deps
npm run install:all
```

### 2. Add API keys

Edit `server/.env`:

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
PORT=3001
```

- OpenAI key: https://platform.openai.com/api-keys
- Google AI key: https://makersuite.google.com/app/apikey

### 3. Start development servers

```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

---

## Usage

1. Upload an audio file (MP3, WAV, M4A, FLAC)
2. Upload the corresponding transcript JSON
3. Select a model — **Whisper + GPT-4o** (OpenAI) or **Gemini 1.5 Pro** (Google)
4. Click **Run QC Checks**
5. Review the scored results; click any row to expand the LLM explanation

---

## The 9 QC Checks

| ID | Title | Metric | Pass Criteria |
|---|---|---|---|
| P1-TR-01 | ASR Cross-Check (WER/CER) | Word/Character Error Rate | WER ≤ 10% / CER ≤ 8% |
| P1-TR-02 | Transcript Completeness | Missing/fabricated content % | ≤5% missing; zero fabricated |
| P1-TR-03 | Spelling & Grammar Errors | Error count | Zero errors |
| P1-TR-04 | Unicode & Script Correctness | Script validation errors | Zero errors |
| P1-TS-01 | Timestamp Alignment Accuracy | Average drift (s) | Within ±0.02 s; no overlaps |
| P1-TS-02 | Speaker Label Consistency | Label error rate | Zero errors |
| P1-CQ-01 | Content & Task Compliance | Task adherence (1–5) | Score ≥ 4 |
| P1-CQ-02 | Speaker Naturalness & Prosody | Predicted MOS (1–5) | MOS ≥ 3.5 |
| P1-CQ-04 | Speaker Balance & Turn Distribution | Speaking time ratio | Neither speaker > 70% |

---

## Transcript JSON Format

Any valid JSON is accepted. A well-structured example:

```json
{
  "language": "en",
  "segments": [
    { "start": 0.0,  "end": 3.5, "speaker": "Speaker A", "text": "Hello, welcome to the session." },
    { "start": 3.8,  "end": 8.1, "speaker": "Speaker B", "text": "Thank you for having me." }
  ]
}
```

---

## Model Notes

| | Whisper + GPT-4o | Gemini 1.5 Pro |
|---|---|---|
| Provider | OpenAI | Google |
| Audio limit | **25 MB** | ~100 MB inline |
| How it works | Transcribes with `whisper-1`, then evaluates with `gpt-4o` | Analyzes audio + transcript together |
| Best for | English, accuracy-critical checks | Multilingual, Indic scripts, large files |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Tailwind CSS v3, Vite |
| Backend | Node.js, Express, Multer |
| OpenAI | `openai` SDK v4 — whisper-1 + gpt-4o |
| Google | `@google/generative-ai` SDK — gemini-1.5-pro |
| Concurrency | All 9 checks via `Promise.allSettled` |
