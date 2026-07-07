// Module-level auth bridge. The API client can't read React context, so AppState pushes
// the current token here on sign-in / bootstrap, and registers an unauthorized handler
// that the client calls on a 401 (drives the app back to the login gate).
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setOnUnauthorized(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export function notifyUnauthorized(): void {
  onUnauthorized?.();
}
