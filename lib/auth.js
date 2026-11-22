import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './supabase.js';

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

const SETTING_KEY = 'admin_password_hash';

function envPassword() {
  return (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
}

function sameHash(x, y) {
  const a = crypto.createHash('sha256').update(String(x)).digest();
  const b = crypto.createHash('sha256').update(String(y)).digest();
  return crypto.timingSafeEqual(a, b);
}

// The password saved from the dashboard (Settings tab), if there is one.
async function savedHash() {
  try {
    const { data, error } = await db().from('settings').select('value').eq('key', SETTING_KEY).maybeSingle();
    if (error) return null; // settings table not created yet → use ADMIN_PASSWORD
    return data?.value || null;
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function matchesHash(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return sameHash(test, hash);
}

export async function adminPasswordIsSet() {
  return Boolean(envPassword() || (await savedHash()));
}

export async function checkPassword(input) {
  const typed = String(input || '').trim();
  if (!typed) return false;
  const stored = await savedHash();
  if (stored) return matchesHash(typed, stored);
  const real = envPassword();
  return Boolean(real) && sameHash(typed, real);
}

export async function savePassword(newPassword) {
  const { error } = await db()
    .from('settings')
    .upsert({ key: SETTING_KEY, value: hashPassword(String(newPassword).trim()), updated_at: new Date().toISOString() });
  if (error) {
    if (error.code === '42P01' || /settings/.test(error.message || '')) {
      throw new Error('One-time setup needed: run the "settings" SQL in Supabase first (see the README).');
    }
    throw error;
  }
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
