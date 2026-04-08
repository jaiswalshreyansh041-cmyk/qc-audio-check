import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import qcRouter from './routes/qc.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Allow localhost in dev, any origin in production (Vercel)
app.use(cors({
  origin: process.env.VERCEL
    ? true
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', qcRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Local dev: redirect root to Vite dev server
if (!process.env.VERCEL) {
  app.get('/', (_req, res) => res.redirect('http://localhost:5173'));
}

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Local dev: start HTTP server ───────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Audio QC Checker server running on http://localhost:${PORT}`);
  });
}

// ── Vercel: export app as serverless handler ───────────────────────────────
export default app;
