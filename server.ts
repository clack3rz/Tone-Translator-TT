import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  const distDir = path.resolve(__dirname, 'dist');

  // Health check endpoints for Cloud Run, App Engine, Kubernetes and monitoring probes
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/healthz', healthHandler);
  app.get('/_ah/health', healthHandler);

  let hasDistIndex = fs.existsSync(path.join(distDir, 'index.html'));
  if (!hasDistIndex && process.env.NODE_ENV === 'production') {
    console.warn('[server] dist/index.html not found in production. Attempting vite build...');
    try {
      const { execSync } = await import('child_process');
      execSync('npx vite build', { stdio: 'inherit' });
      hasDistIndex = fs.existsSync(path.join(distDir, 'index.html'));
    } catch (buildErr) {
      console.error('[server] Automatic build failed:', buildErr);
    }
  }

  if (hasDistIndex || fs.existsSync(distDir)) {
    // Serve static files from production build directory
    app.use(express.static(distDir));

    // Fallback all SPA routes to index.html with guaranteed 200 OK
    app.use((_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        const rootIndex = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(rootIndex)) {
          res.sendFile(rootIndex);
        } else {
          res.status(200).send('<!doctype html><html><head><title>Tone Translator (Guitar)</title></head><body><div id="root"></div></body></html>');
        }
      }
    });
  } else {
    // In dev mode when dist does not exist, use Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server started and listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
