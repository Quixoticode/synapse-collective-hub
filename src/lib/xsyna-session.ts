// Client-side xSyna Account session (Passkey-based).
// Coexists with legacy syn.session.v1 (SLID+PIK) until the user migrates.
export type XsynaSession = {
  slid: string;
  token: string;
  expires_at: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
};

const KEY = "xsyna.session.v1";

export function getXsynaSession(): XsynaSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as XsynaSession;
    if (new Date(s.expires_at) < new Date()) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch { return null; }
}

export function setXsynaSession(s: XsynaSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("xsyna-session-change"));
}

export function clearXsynaSession() {
  localStorage.removeItem(KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("xsyna-session-change"));
}
