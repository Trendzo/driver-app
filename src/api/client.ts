// Thin fetch client for the ClosetX driver backend. Injects the bearer token, unwraps the
// { success, data } envelope, normalizes errors, and drives the app back to login on 401.
import { API_URL } from '../config/env';
import { getAuthToken, notifyUnauthorized } from './session';
import { normalizeError, type ApiError } from './errors';

type Body = Record<string, unknown> | undefined;

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    return (json as { data: T }).data;
  }
  return json as T;
}

async function request<T>(
  method: string,
  path: string,
  opts: { body?: Body; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: string | FormData | undefined;
  if (opts.form) {
    payload = opts.form; // let fetch set the multipart boundary
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw { code: 'unreachable', message: "Can't reach the server. Check your connection." } as ApiError;
  }

  const json = await res.json().catch(() => null);
  if (res.status === 401) notifyUnauthorized();
  const failed = !res.ok || (json && typeof json === 'object' && (json as { success?: boolean }).success === false);
  if (failed) throw normalizeError(res.status, json);
  return unwrap<T>(json);
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: Body) => request<T>('POST', path, { body });
export const apiPatch = <T>(path: string, body?: Body) => request<T>('PATCH', path, { body });
export const apiUpload = <T>(path: string, form: FormData) => request<T>('POST', path, { form });
