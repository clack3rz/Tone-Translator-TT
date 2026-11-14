import type { GoogleGenAI, Session } from '@google/genai';
import { Modality } from '@google/genai';
import { WebSocket, type WebSocketServer } from 'ws';
import { verifyFirebaseIdToken, type TokenVerifierOptions } from './auth/tokenVerifier.ts';

type LiveSession = Pick<Session, 'sendRealtimeInput' | 'close'>;
type LiveConnector = {
  connect(params: Parameters<GoogleGenAI['live']['connect']>[0]): Promise<LiveSession>;
};

export function attachLiveHandler(wss: WebSocketServer, live: LiveConnector, options: TokenVerifierOptions) {
  wss.on('connection', (client, request) => {
    let authenticating = false;
    let stopped = false;
    let expiresAt = 0;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let session: LiveSession | undefined;
    const authDeadline = performance.now() + 5000;
    const authTimer = setTimeout(() => stop(4401), 5000);

    function closeSession(upstream: LiveSession) {
      try { upstream.close(); } catch { console.error('[server] Live session close failed'); }
    }

    function stop(code: number) {
      if (stopped) return;
      stopped = true;
      clearTimeout(authTimer);
      clearTimeout(expiryTimer);
      if (session) closeSession(session);
      if (client.readyState === WebSocket.OPEN) client.close(code);
    }

    function active() {
      if (stopped || client.readyState !== WebSocket.OPEN) return false;
      if (Date.now() < expiresAt) return true;
      stop(4401);
      return false;
    }

    function scheduleExpiry() {
      if (active()) expiryTimer = setTimeout(scheduleExpiry, Math.min(expiresAt - Date.now(), 2147483647));
    }

    async function authenticate(token: string) {
      authenticating = true;
      let user;
      try {
        user = await verifyFirebaseIdToken(token, options);
      } catch {
        stop(4401);
        return;
      }
      if (performance.now() >= authDeadline) {
        stop(4401);
        return;
      }
      expiresAt = user.exp * 1000;
      if (!active()) return;
      clearTimeout(authTimer);
      scheduleExpiry();

      try {
        const upstream = await live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: 'You are an expert guitar tone engineer assistant for AmpliTube 5.',
          },
          callbacks: {
            onmessage(message) {
              if (!active() || !session) return;
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio) client.send(JSON.stringify({ audio }));
              if (message.serverContent?.interrupted) client.send(JSON.stringify({ interrupted: true }));
            },
            onclose: () => stop(1000),
            onerror: () => stop(1011),
          },
        });
        if (!active()) {
          closeSession(upstream);
          return;
        }
        session = upstream;
        client.send(JSON.stringify({ type: 'authenticated', uid: user.uid }));
      } catch {
        stop(1011);
      }
    }

    client.on('close', () => stop(1000));
    client.on('error', () => stop(1011));
    client.on('message', data => {
      try {
        const message = JSON.parse(data.toString());
        if (!authenticating) {
          const token = message?.token || message?.auth;
          if (typeof token === 'string' && token) void authenticate(token);
          else stop(4401);
        } else if (session && active() && typeof message?.audio === 'string') {
          session.sendRealtimeInput({ audio: { data: message.audio, mimeType: 'audio/pcm;rate=16000' } });
        }
      } catch {
        stop(session ? 1003 : 4401);
      }
    });

    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) void authenticate(authorization.slice(7).trim());
  });
}
