// Normalized API error. The backend envelope is { success:false, error:{ code, message } }.
export type ApiError = { code: string; message: string; status?: number };

export function normalizeError(status: number, json: unknown): ApiError {
  const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
  if (err?.code || err?.message) {
    return { code: err.code ?? 'error', message: friendly(err.code, err.message), status };
  }
  if (status === 0) {
    return { code: 'unreachable', message: "Can't reach the server. Check your connection." };
  }
  return { code: 'error', message: `Request failed (${status}).`, status };
}

function friendly(code?: string, message?: string): string {
  switch (code) {
    case 'driver_suspended':
      return 'Your account is suspended. Contact dispatch.';
    case 'driver_inactive':
      return 'Your account is inactive. Contact dispatch.';
    case 'validation_error':
      return message || 'Please check the details and try again.';
    case 'invalid_pickup_code':
      return message || 'Incorrect code.';
    default:
      return message || 'Something went wrong.';
  }
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}
