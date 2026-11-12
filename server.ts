import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import {
  createAuthMiddleware,
  verifyFirebaseIdToken,
  resolveServerProjectId
} from './src/server/auth/tokenVerifier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  const distDir = path.resolve(__dirname, 'dist');

  const expectedProjectId = resolveServerProjectId();
  const authMiddleware = createAuthMiddleware({ expectedProjectId });

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

  // Restricted diagnostic endpoint: source export is strictly disabled in deployed environments
  app.get('/api/export-source', authMiddleware, (req, res) => {
    const isDeployed = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE || !!process.env.APP_ENV;
    const user = (req as any).user;
    if (isDeployed && user?.email !== 'cclackerz@gmail.com') {
      res.status(403).json({ error: 'Source archive export is disabled in deployed environments', code: 'FORBIDDEN' });
      return;
    }
    const zipPath = path.resolve(__dirname, 'public/tone-translator-source.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="tone-translator-source.zip"');
      res.sendFile(zipPath);
    } else {
      res.status(404).json({ error: 'Source archive not ready. Please try again shortly.' });
    }
  });

  // Helper to standardize, clean and sanitize Gemini API errors (no leaked credentials)
  const parseGeminiError = (err: any): { status: number; error: string; code?: number; statusText?: string } => {
    let errMsg = String(err?.message || '');
    // Sanitize any potential API keys, tokens or credentials from upstream error messages
    errMsg = errMsg
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED_TOKEN]');

    const errStatus = err?.status;
    const isPrepayment =
      errMsg.includes('402') ||
      errMsg.toLowerCase().includes('prepayment') ||
      errMsg.toLowerCase().includes('credits are depleted') ||
      errStatus === 402;
    const isRateLimit =
      !isPrepayment &&
      (errMsg.includes('429') || errStatus === 'RESOURCE_EXHAUSTED' || errMsg.includes('RESOURCE_EXHAUSTED'));
    const isTimeout =
      errMsg.includes('Timeout') || err?.name === 'TimeoutError' || errStatus === 'DEADLINE_EXCEEDED';
    const isAuth =
      errMsg.includes('API_KEY_INVALID') || errMsg.includes('403') || errStatus === 'PERMISSION_DENIED';

    if (isPrepayment) {
      return {
        status: 402,
        code: 402,
        statusText: 'PAYMENT_REQUIRED',
        error: 'Your Gemini API prepayment credits are depleted. Please manage billing at https://ai.studio/projects or select an active API key in Settings > Secrets.',
      };
    }
    if (isRateLimit) {
      return {
        status: 429,
        code: 429,
        statusText: 'RESOURCE_EXHAUSTED',
        error: 'Gemini API rate limit exceeded. Please wait a moment and try again.',
      };
    }
    if (isTimeout) {
      return {
        status: 504,
        code: 504,
        statusText: 'GATEWAY_TIMEOUT',
        error: 'Request timed out waiting for Gemini response.',
      };
    }
    if (isAuth) {
      return {
        status: 403,
        code: 403,
        statusText: 'PERMISSION_DENIED',
        error: 'Gemini API key is invalid or lacks required permissions. Please check Settings > Secrets.',
      };
    }
    return {
      status: 500,
      code: 500,
      error: errMsg || 'Failed to communicate with Gemini API',
    };
  };

  // Server-side Gemini content generation endpoint (Protected by Firebase ID token authentication)
  app.post('/api/gemini/generate', authMiddleware, async (req, res) => {
    try {
      const { contents, model = 'gemini-3.8-flash', config } = req.body;
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      res.json({ text: response.text || '' });
    } catch (err: any) {
      const parsed = parseGeminiError(err);
      if (parsed.status === 402) {
        console.warn('[server] Gemini API prepayment credits depleted (402). Returning billing instructions.');
      } else {
        console.error('[server] Gemini generate error:', err);
      }
      res.status(parsed.status).json({
        error: parsed.error,
        code: parsed.code,
        status: parsed.statusText,
      });
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
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      const parsed = parseGeminiError(err);
      if (parsed.status === 402) {
        console.warn('[server] Gemini tone-profile credits depleted (402).');
      } else {
        console.error('[server] tone-profile error:', err);
      }
      res.status(parsed.status).json({
        error: parsed.error,
        code: parsed.code,
        status: parsed.statusText,
      });
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
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      const parsed = parseGeminiError(err);
      if (parsed.status === 402) {
        console.warn('[server] Gemini translate-tone credits depleted (402).');
      } else {
        console.error('[server] translate-tone error:', err);
      }
      res.status(parsed.status).json({
        error: parsed.error,
        code: parsed.code,
        status: parsed.statusText,
      });
    }
  });

  // Server-side Gemini text/content streaming endpoint via SSE (Protected by Firebase ID token authentication)
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
    } catch (err: any) {
      console.error('[server] Gemini stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Streaming failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`);
        res.end();
      }
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    let hasDistIndex = fs.existsSync(path.join(distDir, 'index.html'));
    if (!hasDistIndex) {
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
    }
  } else {
    // In dev mode, mount Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);

  // Gemini Live API bidirectional WebSocket server (Protected by Firebase ID token authentication)
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    let authenticated = false;
    let authUser: any = null;
    let liveSession: any = null;

    // Fast-path: Check if upgrade request has Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        authUser = await verifyFirebaseIdToken(token, { expectedProjectId });
        authenticated = true;
      } catch {
        // Upgrade auth failed, fall back to initial message auth
      }
    }

    // Set 5-second authentication timeout: must authenticate before streaming audio
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ error: 'Authentication timeout: Valid Firebase ID token required.' }));
          clientWs.close(4401, 'Unauthorized');
        }
      }
    }, 5000);

    const initLiveSession = async () => {
      try {
        liveSession = await ai.live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are an expert guitar tone engineer assistant for AmpliTube 5.',
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ audio }));
              }
              if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
            },
            onclose: () => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
              }
            },
            onerror: (err) => {
              console.error('[server] Gemini Live session error:', err?.message || 'Unknown error');
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ error: 'Live session error' }));
              }
            },
          },
        });
      } catch (err: any) {
        console.error('[server] Failed to connect to Gemini Live:', err?.message || 'Unknown error');
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ error: 'Failed to initialize Live API session' }));
          clientWs.close();
        }
      }
    };

    if (authenticated) {
      clearTimeout(authTimeout);
      await initLiveSession();
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'authenticated', uid: authUser.uid }));
      }
    }

    clientWs.on('message', async (data) => {
      try {
        const parsed = JSON.parse(data.toString());

        // Handle initial authentication message
        if (!authenticated) {
          const token = parsed.token || parsed.auth;
          if (token && typeof token === 'string') {
            try {
              authUser = await verifyFirebaseIdToken(token, { expectedProjectId });
              authenticated = true;
              clearTimeout(authTimeout);
              await initLiveSession();
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'authenticated', uid: authUser.uid }));
              }
              return;
            } catch (authErr: any) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ error: authErr.message || 'Authentication failed' }));
                clientWs.close(4401, 'Unauthorized');
              }
              return;
            }
          }

          // Unauthenticated non-auth message rejected immediately
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ error: 'Unauthenticated: Initial authentication message required.' }));
            clientWs.close(4401, 'Unauthorized');
          }
          return;
        }

        // Authenticated audio message processing
        if (parsed.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch {
        console.error('[server] Failed to parse client ws message');
      }
    });

    clientWs.on('close', () => {
      clearTimeout(authTimeout);
      try {
        if (liveSession) {
          liveSession.close();
        }
      } catch (_) {}
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`Server started and listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    wss.close();
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
