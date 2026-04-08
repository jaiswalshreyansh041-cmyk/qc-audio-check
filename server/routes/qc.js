import express from 'express';
import multer from 'multer';
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { runQCChecks } from '../checks/runner.js';

const router = express.Router();

const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.flac'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audioFile') {
      const ext = '.' + file.originalname.split('.').pop().toLowerCase();
      if (AUDIO_EXTS.includes(ext)) return cb(null, true);
      return cb(new Error('Invalid audio format. Supported: MP3, WAV, M4A, FLAC'));
    }
    if (file.fieldname === 'transcriptFile') {
      if (file.originalname.endsWith('.json')) return cb(null, true);
      return cb(new Error('Transcript must be a JSON file'));
    }
    cb(null, true);
  },
});

const MIME_MAP = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
};

function getAudioMime(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return MIME_MAP[ext] || 'audio/mpeg';
}

// ── Blob upload token endpoint ────────────────────────────────────────────────
// Client calls this to get a signed token for direct-to-Blob upload (bypasses
// Vercel's 4.5 MB serverless body limit).
router.post('/upload', async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: 'Vercel Blob is not configured. Go to your Vercel project → Storage → Connect a Blob store, then redeploy.',
    });
  }
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (_pathname) => ({
        allowedContentTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/x-m4a'],
        maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[blob] upload completed:', blob.url);
      },
    });
    return res.json(jsonResponse);
  } catch (err) {
    console.error('[blob] upload token error:', err);
    return res.status(400).json({ error: err.message });
  }
});

// ── Run QC via blob URL (large files) ─────────────────────────────────────────
router.post('/run-qc-url', async (req, res) => {
  let audioUrl;
  try {
    const { model, audioUrl: url, audioFilename, transcriptJson } = req.body;
    audioUrl = url;

    if (!audioUrl || !audioFilename || !transcriptJson) {
      return res.status(400).json({ error: 'audioUrl, audioFilename, and transcriptJson are required' });
    }
    if (!model || !['whisper', 'gemini'].includes(model)) {
      return res.status(400).json({ error: 'Model must be "whisper" or "gemini"' });
    }

    // Fetch audio from Vercel Blob
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`Failed to fetch audio from blob: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const results = await runQCChecks({
      audioBuffer,
      audioFilename,
      audioMimeType: getAudioMime(audioFilename),
      transcriptJson,
      model,
    });

    res.json({ results });
  } catch (error) {
    console.error('QC run-url error:', error);
    res.status(500).json({ error: error.message || 'Failed to run QC checks' });
  } finally {
    // Clean up blob after processing
    if (audioUrl) {
      del(audioUrl).catch((e) => console.error('[blob] delete failed:', e));
    }
  }
});

// ── Run QC via direct upload (small files ≤ 4 MB, kept for local dev) ────────
router.post(
  '/run-qc',
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'transcriptFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { model } = req.body;

      if (!req.files?.audioFile || !req.files?.transcriptFile) {
        return res.status(400).json({ error: 'Both audioFile and transcriptFile are required' });
      }
      if (!model || !['whisper', 'gemini'].includes(model)) {
        return res.status(400).json({ error: 'Model must be "whisper" or "gemini"' });
      }

      const audioFile = req.files.audioFile[0];
      const transcriptFile = req.files.transcriptFile[0];

      let transcriptJson;
      try {
        transcriptJson = JSON.parse(transcriptFile.buffer.toString('utf-8'));
      } catch {
        return res.status(400).json({ error: 'Transcript file contains invalid JSON' });
      }

      const results = await runQCChecks({
        audioBuffer: audioFile.buffer,
        audioFilename: audioFile.originalname,
        audioMimeType: getAudioMime(audioFile.originalname),
        transcriptJson,
        model,
      });

      res.json({ results });
    } catch (error) {
      console.error('QC run error:', error);
      res.status(500).json({ error: error.message || 'Failed to run QC checks' });
    }
  }
);

export default router;
