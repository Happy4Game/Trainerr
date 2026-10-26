/**
 * Password-protected backup: PBKDF2 (SHA-256, 250 000 iterations) derives an
 * AES-GCM 256-bit key; salt and IV are random for each file. Uses the
 * standard Web Crypto API, available in the app and in secure browser pages.
 */
export interface EncryptedFile {
  readonly app: 'trainerr';
  readonly encrypted: true;
  readonly kdf: 'PBKDF2-SHA256';
  readonly iterations: number;
  readonly salt: string;
  readonly iv: string;
  readonly data: string;
}

export const PBKDF2_ITERATIONS = 250_000;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export function encryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined;
}

async function keyFrom(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(text: string, password: string): Promise<EncryptedFile> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(password, salt, PBKDF2_ITERATIONS);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(text),
  );
  return {
    app: 'trainerr',
    encrypted: true,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  };
}

export async function decryptText(file: EncryptedFile, password: string): Promise<string> {
  const key = await keyFrom(password, fromBase64(file.salt), file.iterations);
  try {
    const data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(file.iv) as BufferSource },
      key,
      fromBase64(file.data) as BufferSource,
    );
    return new TextDecoder().decode(data);
  } catch {
    throw new Error('Mot de passe incorrect ou fichier abîmé.');
  }
}

export function isEncryptedFile(value: unknown): value is EncryptedFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { encrypted?: unknown }).encrypted === true
  );
}
