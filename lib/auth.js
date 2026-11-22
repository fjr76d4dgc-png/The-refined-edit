import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'tre_admin';
const MAX_AGE = 60 * 60 * 24 * 14; // stay logged in for 14 days

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('ADMIN_SESSION_SECRET must be set (16+ characters).');
  return s;
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function adminPasswordIsSet() {
  return Boolean((process.env.ADMIN_PASSWORD || '').trim());
}

export function storedPasswordLength() {
  return (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '').length;
}

export function checkPassword(input) {
  // Trim stray spaces/new lines that sneak in when copying and pasting
  const real = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input).trim()).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createSession() {
  const expires = Date.now() + MAX_AGE * 1000;
  const value = `${expires}.${sign(String(expires))}`;
  cookies().set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(COOKIE, '', { path: '/', maxAge: 0 });
}

export function isAdmin() {
  const value = cookies().get(COOKIE)?.value;
  if (!value) return false;
  const [expires, sig] = value.split('.');
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function unauthorized() {
  return Response.json({ error: 'Not logged in' }, { status: 401 });
}
