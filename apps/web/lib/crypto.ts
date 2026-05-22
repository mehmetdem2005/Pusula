/**
 * Client-side AES-GCM 256 + PBKDF2 — Master password ile API key şifrele/çöz.
 * Server zero-knowledge: encrypted_key blob'u Supabase'e gönderilir, key asla server'a açık olarak gitmez.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_KEY = 'pusula_master_salt_v1';

async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

export async function encryptApiKey(masterPassword: string, apiKey: string): Promise<{ ciphertext: string; iv: string }> {
  const salt = getOrCreateSalt();
  const key = await deriveKey(masterPassword, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(apiKey));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptApiKey(
  masterPassword: string,
  ciphertext: string,
  ivB64: string
): Promise<string> {
  const salt = getOrCreateSalt();
  const key = await deriveKey(masterPassword, salt);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
