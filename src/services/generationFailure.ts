import type { FailureCategory, FailureStage, GenerationFailure } from '../types';

export class GenerationError extends Error {
  constructor(public readonly failure: GenerationFailure) {
    super(failure.message);
    this.name = failure.category === 'cancelled' ? 'AbortError' : 'GenerationError';
  }
}
const codes: Record<string, FailureCategory> = {
  RESOURCE_EXHAUSTED: 'rate_limit', PAYMENT_REQUIRED: 'payment', UNAUTHENTICATED: 'authentication',
  PERMISSION_DENIED: 'permission', DEADLINE_EXCEEDED: 'timeout', UNAVAILABLE: 'unavailable',
};
export function classifyFailure(error: unknown, stage: FailureStage, attemptCount = 1): GenerationFailure {
  if (error instanceof GenerationError) return { ...error.failure, attemptCount };
  const e = error as any;
  const status = [e?.httpStatus, e?.status, e?.code, e?.error?.code].find(v => typeof v === 'number');
  const code = [e?.status, e?.code, e?.error?.status].find(v => typeof v === 'string' && codes[v]);
  let category: FailureCategory = 'unknown';
  if (typeof status === 'number') {
    category = status === 429 ? 'rate_limit' : status === 402 ? 'payment' : status === 401 ? 'authentication'
      : status === 403 ? 'permission' : status === 408 || status === 504 ? 'timeout' : status >= 500 ? 'unavailable' : 'unknown';
  } else if (code) category = codes[code];
  else if (e?.name === 'AbortError') category = 'cancelled';
  else if (e?.name === 'TimeoutError') category = 'timeout';
  else if (stage === 'response_decode') category = 'decode';
  else if (stage === 'response_validation') category = 'validation';
  else if (stage === 'postprocess') category = 'postprocess';
  else if (e instanceof TypeError && /fetch|network/i.test(e.message.slice(0, 200))) category = 'network';
  // Deliberately do not guess operational causes from arbitrary provider prose.
  return { stage, category, httpStatus: status, providerCode: code, attemptCount, retryHistory: [],
    message: `Tone request failed (${stage}/${category}).` };
}
export function fail(stage: FailureStage, error: unknown): never { throw new GenerationError(classifyFailure(error, stage)); }
export function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new GenerationError(classifyFailure({ name: 'AbortError' }, 'generation'));
}
export function abortableWait(ms: number, signal?: AbortSignal): Promise<void> {
  checkCancelled(signal);
  return new Promise((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(new GenerationError(classifyFailure({ name: 'AbortError' }, 'generation'))); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
  });
}
export const canDegrade = (failure: GenerationFailure) => ['rate_limit', 'payment', 'network', 'timeout', 'unavailable'].includes(failure.category);
export function errorEnvelope(error: unknown, stage: FailureStage) {
  const failure = classifyFailure(error, stage);
  return { schemaVersion: 1, error: failure.message, status: failure.providerCode, failure };
}

/** A finite application deadline, including servers that never settle or ignore abort. */
export async function withDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal, ms = 30000): Promise<T> {
  checkCancelled(signal);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let cancel: () => void;
  const boundary = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(new GenerationError(classifyFailure({ name: 'AbortError' }, 'generation'))); };
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new GenerationError(classifyFailure({ name: 'TimeoutError' }, 'generation'))); }, ms);
  });
  try { const result = await Promise.race([operation(controller.signal), boundary]); checkCancelled(signal); return result; }
  finally { clearTimeout(timer!); signal?.removeEventListener('abort', cancel!); }
}

/** Shared policy for profile and generation; decode failures never become availability fallback. */
export async function requestModel(endpoint: string, payload: unknown, stage: 'profile' | 'generation', signal?: AbortSignal): Promise<{ data: any; attempts: number; retryHistory: GenerationFailure['retryHistory'] }> {
  const retryHistory: GenerationFailure['retryHistory'] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    checkCancelled(signal);
    try {
      const data = await withDeadline(async requestSignal => {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: requestSignal });
        let data: any;
        try { data = await response.json(); } catch (e) { fail('response_decode', e); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) fail('response_decode', new Error());
        if (!response.ok) {
          // HTTP status is observed. Only allow bounded server stages to identify decode defects.
          const serverStage = data.schemaVersion === 1 && ['response_decode', 'response_validation', 'postprocess'].includes(data.failure?.stage) ? data.failure.stage : stage;
          if (serverStage !== stage) fail(serverStage, new Error());
          throw new GenerationError(classifyFailure({ httpStatus: response.status, status: data.status }, stage, attempt));
        }
        return data;
      }, signal);
      checkCancelled(signal);
      return { data, attempts: attempt, retryHistory };
    } catch (error) {
      checkCancelled(signal);
      const failure = { ...classifyFailure(error, stage, attempt), retryHistory: [...retryHistory] };
      if (failure.category === 'rate_limit' && attempt < 3) {
        const delayMs = attempt * 1500;
        retryHistory.push({ attempt, category: failure.category, delayMs });
        await abortableWait(delayMs, signal);
      } else throw new GenerationError(failure);
    }
  }
  throw new Error('Unreachable retry boundary');
}
