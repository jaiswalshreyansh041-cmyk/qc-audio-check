import express from 'express';
import multer from 'multer';
import { runQCChecks } from '../checks/runner.js';

const router = express.Router();

const AUDIO_EXTS = ['.mp3', '.wav', '.m4a', '.flac'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 2 },
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
      res.status(500).json({
        error: error.message || 'Failed to run QC checks',
      });
    }
  }
);

export default router;
