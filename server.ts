import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

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

  // JSON and URL-encoded body parsers with generous limits for audio references
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoints for Cloud Run, App Engine, Kubernetes and monitoring probes
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/healthz', healthHandler);
  app.get('/_ah/health', healthHandler);

  // Server-side Gemini content generation endpoint
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { contents, model = 'gemini-3.8-flash', config } = req.body;
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      res.json({ text: response.text || '' });
    } catch (err: any) {
      console.error('[server] Gemini generate error:', err);
      const isRateLimit = err?.message?.includes('429') || err?.status === 'RESOURCE_EXHAUSTED';
      const isTimeout = err?.message?.includes('Timeout') || err?.name === 'TimeoutError';
      const status = isRateLimit ? 429 : isTimeout ? 504 : 500;
      res.status(status).json({
        error: err?.message || 'Failed to generate content',
        status: isRateLimit ? 'RESOURCE_EXHAUSTED' : undefined,
      });
    }
  });

  app.post('/api/gemini/tone-profile', async (req, res) => {
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
      console.error('[server] tone-profile error:', err);
      const isRateLimit = err?.message?.includes('429') || err?.status === 'RESOURCE_EXHAUSTED';
      res.status(isRateLimit ? 429 : 500).json({ error: err?.message || 'Failed to build tone profile' });
    }
  });

  app.post('/api/gemini/translate-tone', async (req, res) => {
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
      console.error('[server] translate-tone error:', err);
      const isRateLimit = err?.message?.includes('429') || err?.status === 'RESOURCE_EXHAUSTED';
      const isTimeout = err?.message?.includes('Timeout') || err?.name === 'TimeoutError';
      const status = isRateLimit ? 429 : isTimeout ? 504 : 500;
      res.status(status).json({
        error: err?.message || 'Failed to translate tone',
        status: isRateLimit ? 'RESOURCE_EXHAUSTED' : undefined,
      });
    }
  });

  // Server-side Gemini text/content streaming endpoint via SSE
  app.post('/api/gemini/stream', async (req, res) => {
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

  // Gemini Live API bidirectional WebSocket server
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    try {
      const session = await ai.live.connect({
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
            console.error('[server] Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || 'Live session error' }));
            }
          },
        },
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (err) {
          console.error('[server] Failed to parse client ws message:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch (_) {}
      });
    } catch (err: any) {
      console.error('[server] Failed to connect to Gemini Live:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err?.message || 'Failed to initialize Live API session' }));
        clientWs.close();
      }
    }
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
