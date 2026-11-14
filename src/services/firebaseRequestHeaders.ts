export async function firebaseRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (import.meta.env?.SSR === false) {
    const token = await import('./firebase.ts').then(firebase => firebase.getAuthIdToken()).catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
