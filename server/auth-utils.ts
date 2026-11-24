import crypto from 'node:crypto';
import type { Request } from 'express';
import type { AuthUser } from './appdeploy-sdk';

export const SESSION_COOKIE_NAME = 'yakaji_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Ephemeral fallback secret in RAM only (never hardcoded, never written to disk)
const EPHEMERAL_SESSION_KEY = crypto.randomBytes(32);
const EPHEMERAL_SECRET_COMPARE_KEY = crypto.randomBytes(32);

function getSessionSecret(): Buffer | string {
  const configured = process.env.SESSION_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SESSION_KEY;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  try {
    const expected = Buffer.from(hexDigest, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function verifyPlainSecret(candidate: string, expectedSecret: string): boolean {
  if (!candidate || !expectedSecret) return false;
  const a = crypto.createHmac('sha256', EPHEMERAL_SECRET_COMPARE_KEY).update(candidate).digest();
  const b = crypto.createHmac('sha256', EPHEMERAL_SECRET_COMPARE_KEY).update(expectedSecret).digest();
  return crypto.timingSafeEqual(a, b);
}

type SessionPayload = AuthUser & {
  iat: number;
  exp: number;
};

export function signSessionToken(
  user: AuthUser,
  ttlSeconds = SESSION_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.userId,
    ...(user.email ? { email: user.email } : {}),
    ...(user.name ? { name: user.name } : {}),
    ...(user.picture ? { picture: user.picture } : {}),
    ...(user.role ? { role: user.role } : {}),
    ...(typeof user.isAdmin === 'boolean' ? { isAdmin: user.isAdmin } : {}),
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function verifySessionToken(token?: string): AuthUser | undefined {
  if (!token || typeof token !== 'string') return undefined;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return undefined;
  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64 || sigB64.includes('.')) return undefined;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest();
    const actualSig = Buffer.from(sigB64, 'base64url');
    if (expectedSig.length !== actualSig.length) return undefined;
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return undefined;

    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(jsonStr) as Partial<SessionPayload>;
    if (!parsed?.userId || typeof parsed.userId !== 'string') return undefined;
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp <= now) return undefined;

    return {
      userId: parsed.userId,
      ...(typeof parsed.email === 'string' ? { email: parsed.email } : {}),
      ...(typeof parsed.name === 'string' ? { name: parsed.name } : {}),
      ...(typeof parsed.picture === 'string' ? { picture: parsed.picture } : {}),
      ...(typeof parsed.role === 'string' ? { role: parsed.role } : {}),
      ...(typeof parsed.isAdmin === 'boolean' ? { isAdmin: parsed.isAdmin } : {}),
    };
  } catch {
    return undefined;
  }
}

export function readCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(';');
  for (const part of pairs) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) {
      const val = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return undefined;
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return req.secure || proto.includes('https');
}

export function buildSessionCookie(token: string, req: Request): string {
  const encoded = encodeURIComponent(token);
  const base = `${SESSION_COOKIE_NAME}=${encoded}; Path=/; HttpOnly; Max-Age=${SESSION_TTL_SECONDS}`;
  if (isHttpsRequest(req)) {
    return `${base}; SameSite=None; Secure; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}

export function clearSessionCookie(req: Request): string {
  const base = `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
  if (isHttpsRequest(req)) {
    return `${base}; SameSite=None; Secure; Partitioned`;
  }
  return `${base}; SameSite=Lax`;
}

export function isSafeCookieMutation(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return Boolean(hostHeader && originHost === hostHeader);
    } catch {
      return false;
    }
  }
  const referer = String(req.headers.referer || '').trim();
  if (referer) {
    try {
      const refHost = new URL(referer).host.toLowerCase();
      return Boolean(hostHeader && refHost === hostHeader);
    } catch {
      return false;
    }
  }
  return req.headers['x-requested-with'] === 'yakaji-web';
}
