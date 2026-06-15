// Client-side SynID session helper.
// Stores the active employee's SLID + PIK in localStorage. Every server fn call
// passes these credentials and is re-verified server-side against employees.

export type SynSession = {
  slid: string;
  pik: string;
  name: string;
  hl: number;
  regid: string;
  cip: string;
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
