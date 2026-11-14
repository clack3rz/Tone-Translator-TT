import { EnvironmentConfigurationError } from './src/config/environment.ts';
import { denySourceExport } from './src/server/sourceExport.ts';
import { createAuthMiddleware, resolveServerProjectId, type TokenVerifierOptions } from './src/server/auth/tokenVerifier.ts';
import { attachLiveHandler } from './src/server/liveHandler.ts';
import { validateServerEnvironment } from './src/config/serverEnvironment.ts';
import { GenerationError, classifyFailure, errorEnvelope, failureHttpStatus, withDeadline } from './src/services/generationFailure.ts';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServerApp(
  ai: { models: Pick<GoogleGenAI['models'], 'generateContent' | 'generateContentStream'> },
  authOptions: TokenVerifierOptions,
  appEnvironment: string,
  distDir = path.resolve(__dirname, 'dist'),
) {
  const authMiddleware = createAuthMiddleware(authOptions);
  const app = express();

  // JSON and URL-encoded body parsers with generous limits for audio references
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoints for Cloud Run, App Engine, Kubernetes and monitoring probes
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/_ah/health', healthHandler);

  app.get(['/api/export-source', '/tone-translator-source.zip'], denySourceExport);

  // Server-side Gemini content generation endpoint
  app.post('/api/gemini/generate', authMiddleware, async (req, res) => {
    try {
      const { contents, model = 'gemini-3.8-flash', config } = req.body;
      const response = await withDeadline(async deadlineSignal => ai.models.generateContent({
        model,
        contents,
        config: { ...config, abortSignal: deadlineSignal },
      }), undefined, 25000);
      res.json({ text: response.text || '', execution: { requestedModel: model, returnedModelVersion: response.modelVersion } });
    } catch (err: any) {
      const envelope = errorEnvelope(err, 'generation');
      const status = failureHttpStatus(envelope.failure);
      res.status(status >= 400 && status <= 599 ? status : 502).json(envelope);
    }
  });

  app.post('/api/gemini/tone-profile', authMiddleware, async (req, res) => {
    try {
      const { textPrompt, targetAudio } = req.body;
      const parts: any[] = [
        {
          text: `You are the Tone Profile Builder AI. Return a JSON object with tone_profile, initial_family_guidance, classification_reasoning, warnings for: "${textPrompt}"`
        }
      ];
      if (targetAudio) {
        parts.push({
          inlineData: {
            data: targetAudio.base64,
            mimeType: targetAudio.mimeType || 'audio/wav',
          }
        });
      }
      const response = await withDeadline(async deadlineSignal => ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', abortSignal: deadlineSignal },
      }), undefined, 25000);
      let parsed: any;
      try { parsed = JSON.parse(response.text || ''); } catch (error) { throw new GenerationError(classifyFailure(error, 'response_decode')); }
      res.json({ ...parsed, execution: { requestedModel: 'gemini-3.8-flash', returnedModelVersion: response.modelVersion } });
    } catch (err: any) {
      const envelope = errorEnvelope(err, 'profile');
      const status = failureHttpStatus(envelope.failure);
      res.status(status >= 400 && status <= 599 ? status : 502).json(envelope);
    }
  });

  app.post('/api/gemini/translate-tone', authMiddleware, async (req, res) => {
    try {
      const { textPrompt, targetAudio, userPreset, youtubeUrl } = req.body;
      const parts: any[] = [
        {
          text: `You are the Tone Translator AI for AmpliTube 5. Return a JSON object with tone_summary, signal_chain, engineering_notes for: "${textPrompt}"`
        }
      ];
      if (targetAudio) {
        parts.push({
          inlineData: {
            data: targetAudio.base64,
            mimeType: targetAudio.mimeType || 'audio/wav',
          }
        });
      }
      if (youtubeUrl) {
        parts.push({ text: `YouTube: ${youtubeUrl}` });
      }
      if (userPreset) {
        parts.push({ text: `User Preset: ${JSON.stringify(userPreset)}` });
      }
      const response = await withDeadline(async deadlineSignal => ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json', abortSignal: deadlineSignal },
      }), undefined, 25000);
      let parsed: any;
      try { parsed = JSON.parse(response.text || ''); } catch (error) { throw new GenerationError(classifyFailure(error, 'response_decode')); }
      res.json({ ...parsed, execution: { requestedModel: 'gemini-3.8-flash', returnedModelVersion: response.modelVersion } });
    } catch (err: any) {
      const envelope = errorEnvelope(err, 'generation');
      const status = failureHttpStatus(envelope.failure);
      res.status(status >= 400 && status <= 599 ? status : 502).json(envelope);
    }
  });

  // Server-side Gemini text/content streaming endpoint via SSE
  app.post('/api/gemini/stream', authMiddleware, async (req, res) => {
    try {
      const { prompt, model = 'gemini-3.8-flash' } = req.body;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResponse = await ai.models.generateContentStream({
        model,
        contents: prompt,
      });

      for await (const chunk of streamResponse) {
        const text = chunk.text || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch {
      console.error('[server] Gemini stream failed');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      }
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.warn('[server] dist/index.html missing. Building browser assets...');
      const { build } = await import('vite');
      await build({ root: __dirname });
    }
    const index = fs.readFileSync(indexPath, 'utf8');
    if (!index.includes(`<meta name="tt-app-environment" content="${appEnvironment}">`)) {
      throw new Error('Browser build does not match APP_ENV. Rebuild with the matching VITE_APP_ENV.');
    }
    app.use(express.static(distDir));
    app.use((_req, res) => res.sendFile(indexPath));
  } else {
    // In dev mode, mount Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: __dirname,
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

async function startServer() {
  const { appEnvironment, apiKey } = validateServerEnvironment(process.env);
  const ai = new GoogleGenAI({
    apiKey,
    vertexai: false,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
  const authOptions = { expectedProjectId: resolveServerProjectId() };
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  const app = await createServerApp(ai, authOptions, appEnvironment);
  const server = http.createServer(app);

  // Gemini Live API bidirectional WebSocket server
  const wss = new WebSocketServer({ server, path: '/live' });

  attachLiveHandler(wss, ai.live, authOptions);

  server.listen(PORT, HOST, () => {
    console.log(`Server started and listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    for (const client of wss.clients) client.terminate();
    wss.close();
    server.close(() => {
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) startServer().catch((error: unknown) => {
  console.error(error instanceof EnvironmentConfigurationError
    ? error.message : 'Failed to start server. Check environment configuration and browser build.');
  process.exit(1);
});
