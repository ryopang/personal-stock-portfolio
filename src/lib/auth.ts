// Server-side session auth. The password lives only in the server env (DASHBOARD_PASSWORD);
// a successful login sets an HttpOnly cookie holding an HMAC-signed expiry. Uses Web Crypto
// so the same code runs in the proxy and in route handlers.

export const SESSION_COOKIE = 'portfolio_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function secretKey(): string | null {
  return process.env.AUTH_SECRET || process.env.DASHBOARD_PASSWORD || null;
}

/** Local dev without a password stays open; production without one fails closed. */
export function isAuthDisabled(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.DASHBOARD_PASSWORD;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-independent comparison so neither passwords nor signatures leak via timing. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const secret = secretKey() ?? 'unset';
  const [ha, hb] = await Promise.all([sign(a, secret), sign(b, secret)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const secret = secretKey();
  if (!secret) throw new Error('DASHBOARD_PASSWORD is not set');
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${exp}.${await sign(`session.${exp}`, secret)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (isAuthDisabled()) return true;
  const secret = secretKey();
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await sign(`session.${exp}`, secret));
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
