import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPasswordSync } from '@/lib/db';

export const ADMIN_COOKIE_NAME = 'bni_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

export function hashPassword(plain: string): string {
  return hashPasswordSync(plain);
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;

  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, salt, originalHashHex] = parts;
    const derived = crypto.scryptSync(plain, salt, 64);
    const originalBuf = Buffer.from(originalHashHex, 'hex');
    if (derived.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(derived, originalBuf);
  }

  // Fallback para comparação caso ainda esteja em texto puro
  const a = Buffer.from(plain, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getSigningKey(): string {
  const db = getDb();
  const secretRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('session_secret') as { value: string } | undefined;
  const passRow = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get('admin_password') as { value: string } | undefined;

  const baseSecret =
    process.env.SESSION_SECRET || secretRow?.value || 'bni-fallback-secret-key';
  const passFingerprint = (passRow?.value || '').slice(-16);
  return `${baseSecret}:${passFingerprint}`;
}

export function createAdminSessionToken(): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `${issuedAt}.${expiresAt}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;

  const [issuedAtStr, expiresAtStr, nonce, signature] = parts;
  const issuedAt = Number(issuedAtStr);
  const expiresAt = Number(expiresAtStr);

  if (!issuedAt || !expiresAt || !nonce || !signature) return false;
  if (Date.now() > expiresAt) return false;

  const payload = `${issuedAtStr}.${expiresAtStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

export function isAdminAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Acesso negado. Faça login como administrador.' },
      { status: 401 }
    );
  }
  return null;
}

export function attachAdminCookie(res: NextResponse, req: NextRequest, token: string) {
  const isHttps =
    req.nextUrl.protocol === 'https:' ||
    req.headers.get('x-forwarded-proto') === 'https';

  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && isHttps,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// Rate Limiting em memória por IP + contexto
interface RateRecord {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __bni_rate_limits: Map<string, RateRecord> | undefined;
}

function getRateMap(): Map<string, RateRecord> {
  if (!global.__bni_rate_limits) {
    global.__bni_rate_limits = new Map<string, RateRecord>();
  }
  return global.__bni_rate_limits;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown-ip'
  );
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const map = getRateMap();
  const now = Date.now();
  const record = map.get(key);

  if (!record || now > record.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  getRateMap().delete(key);
}
