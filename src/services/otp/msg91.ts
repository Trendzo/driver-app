import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID, OTP_LENGTH } from '../../config/env';

/**
 * MSG91 half of the OTP client: the existing SDK flow, moved behind the provider-neutral
 * interface unchanged. The widget id / token are PUBLIC client identifiers (the secret authkey
 * is server-side). Every SDK call answers either a bare string or `{type, message}`;
 * `type === 'error'` is a failure and `message` (or the string) is the reqId on send and the
 * access token on verify.
 */
export const MSG91_OTP_LENGTH = OTP_LENGTH;
export const MSG91_RESEND_SECONDS = 30;

const OTP_TIMEOUT_MS = 20000;
const UNREACHABLE = "Couldn't reach the OTP service. Check your connection and try again.";

/**
 * MSG91's SDK fires a bare `fetch` with no timeout. On a stalled network the promise never
 * settles, `busy` stays true forever, and every later tap is swallowed by the re-entrancy
 * guard: the button goes permanently dead with nothing on screen. Always settle, so the user
 * gets an error they can act on.
 */
function withTimeout<T>(p: Promise<T>, message = UNREACHABLE, ms = OTP_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export function initMsg91(): void {
  try {
    OTPWidget.initializeWidget(MSG91_WIDGET_ID, MSG91_TOKEN_AUTH);
  } catch {
    // Native module not linked (pre dev-client rebuild): sending surfaces a clear error.
  }
}

const payload = (res: unknown): string | null => {
  const v = typeof res === 'string' ? res : (res as { message?: unknown } | null)?.message;
  return v ? String(v) : null;
};

const failed = (res: unknown): boolean => (res as { type?: string } | null)?.type === 'error';

/** Returns the reqId to verify against. */
export async function msg91Send(dial: string, national: string): Promise<string> {
  const res: unknown = await withTimeout(OTPWidget.sendOTP({ identifier: `${dial}${national}` }));
  if (failed(res)) throw new Error(payload(res) || 'Could not send OTP');
  const reqId = payload(res);
  if (!reqId) throw new Error('Could not send OTP');
  return reqId;
}

export async function msg91Resend(reqId: string): Promise<void> {
  const res: unknown = await withTimeout(OTPWidget.retryOTP({ reqId, retryChannel: 11 }));
  if (failed(res)) throw new Error(payload(res) || 'Could not resend OTP');
}

/** Returns the access token the backend re-verifies. */
export async function msg91Verify(reqId: string, code: string): Promise<string> {
  const res: unknown = await withTimeout(OTPWidget.verifyOTP({ reqId, otp: code }));
  if (failed(res)) throw new Error(payload(res) || 'Invalid OTP');
  const token = payload(res);
  if (!token) throw new Error('Verification failed');
  return token;
}
