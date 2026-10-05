/**
 * Вход по коду и биометрии. Это замок от чужих глаз на устройстве: код хранится
 * только в виде хеша (PBKDF2), биометрия проверяется системой через WebAuthn.
 */

const KEY = 'planner:lock';
export const AUTO_LOCK_MS = 5 * 60 * 1000; // блокировать, если приложение свёрнуто дольше 5 минут
export const MAX_FAILS = 10; // после стольких ошибок — выход из аккаунта
export const PIN_LENGTH = 4;

export interface LockConfig {
  v: 1;
  salt: string;
  hash: string;
  bioId?: string;
  fails: number;
  until: number; // до какого времени ввод заблокирован после серии ошибок
}

export function readLock(): LockConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as LockConfig;
    return c?.v === 1 && c.hash && c.salt ? c : null;
  } catch {
    return null;
  }
}

export function writeLock(c: LockConfig | null): void {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* хранилище недоступно */
  }
}

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150_000 }, key, 256);
  return toB64(bits);
}

export async function createLock(pin: string, prev?: LockConfig | null): Promise<LockConfig> {
  const salt = randomBytes(16);
  return { v: 1, salt: toB64(salt.buffer), hash: await derive(pin, salt), bioId: prev?.bioId, fails: 0, until: 0 };
}

export async function checkPin(c: LockConfig, pin: string): Promise<boolean> {
  return (await derive(pin, fromB64(c.salt))) === c.hash;
}

/* ---------- биометрия ---------- */

export async function bioAvailable(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

/** Как называется биометрия на этом устройстве */
export function bioName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'Face ID';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Face ID';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Android/.test(ua)) return 'отпечаток';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'биометрию';
}

export async function bioRegister(label: string): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Планировщик' },
      user: { id: randomBytes(16), name: label || 'planner', displayName: label || 'Планировщик' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('cancelled');
  return toB64(cred.rawId);
}

export async function bioVerify(id: string): Promise<boolean> {
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: fromB64(id) }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  return !!res;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
