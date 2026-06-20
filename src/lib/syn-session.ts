// Client-side SynID session helper.
export type SynSession = {
  slid: string;
  pik: string;
  name: string;
  hl: number;
  regid: string;
  cip: string;
  department?: string | null;
  position?: string | null;
  kind?: string | null;
  isSuperuser?: boolean;
};

const KEY = "syn.session.v1";

export function getSession(): SynSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SynSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: SynSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("syn-session-change"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("syn-session-change"));
}

export function getCredentials(): { slid: string; pik: string } | null {
  const s = getSession();
  return s ? { slid: s.slid, pik: s.pik } : null;
}

// Lightweight AES-GCM vault encryption keyed by the user's PIK.
async function deriveKey(pik: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(pik), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("syncrm-vault-v1"), iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

const toB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function vaultEncrypt(plain: string, pik: string) {
  const key = await deriveKey(pik);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return { secret_enc: toB64(ct), secret_iv: toB64(iv.buffer) };
}

export async function vaultDecrypt(secret_enc: string, secret_iv: string, pik: string) {
  try {
    const key = await deriveKey(pik);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(secret_iv) }, key, fromB64(secret_enc));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
