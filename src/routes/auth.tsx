import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, KeyRound, ShieldCheck, QrCode, Camera, Image as ImageIcon, X, BadgeCheck, ArrowLeft, LogIn, LifeBuoy, Send, Plus, Zap, Phone, MessageCircle, UserPlus, Fingerprint, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { synLoginByPik, synVerifyByPik } from "@/lib/syn.functions";
import { registerTrustedDevice, loginByTrustedDevice } from "@/lib/devices.functions";
import { supportAccountCreate, supportAccountLogin, supportAccountPost } from "@/lib/support-accounts.functions";
import { quickLoginConsume } from "@/lib/quick-login.functions";
import { xaBeginAuth, xaFinishAuth, xaSessionForToken, xaFinishRegistration, xaBeginRegistration } from "@/lib/xsyna-account.functions";
import { xaSignup, xaMigrationStatus } from "@/lib/xsyna-signup.functions";
import { setSession, getSession, type SynSession } from "@/lib/syn-session";
import { SynIDCard, type SynIDCardData } from "@/components/SynIDCard";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SynID Verbinden – xSyna Central" },
      { name: "description", content: "Sichere SynID-Anmeldung zum xSyna-Kollektiv." },
    ],
  }),
  component: AuthPage,
});

type Mode = "input" | "scan" | "photo";
type Stage = "passkey" | "login" | "verify" | "quick" | "support";

const FP_KEY = "xsyna.deviceFp.v1";
const LAST_SLID_KEY = "xsyna.lastSlid.v1";

function ensureFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unbekannt";
}

function extractPik(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const hex = trimmed.match(/\b[a-f0-9]{16,}\b/i);
  if (hex) return hex[0].toLowerCase();
  try { const u = new URL(trimmed); const p = u.searchParams.get("pik"); if (p) return p.trim(); } catch { /* ignore */ }
  try { const j = JSON.parse(trimmed); if (j && typeof j.pik === "string") return j.pik.trim(); } catch { /* ignore */ }
  return trimmed.length >= 16 ? trimmed : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(synLoginByPik);
  const verify = useServerFn(synVerifyByPik);
  const trustFn = useServerFn(registerTrustedDevice);
  const trustedLoginFn = useServerFn(loginByTrustedDevice);

  const beginPasskeyAuth = useServerFn(xaBeginAuth);
  const finishPasskeyAuth = useServerFn(xaFinishAuth);
  const signupFn = useServerFn(xaSignup);
  const finishSignupReg = useServerFn(xaFinishRegistration);
  const sessionForToken = useServerFn(xaSessionForToken);
  const migrationStatus = useServerFn(xaMigrationStatus);
  const beginMigrationReg = useServerFn(xaBeginRegistration);
  const finishMigrationReg = useServerFn(xaFinishRegistration);

  const [stage, setStage] = useState<Stage>("passkey");
  const [mode, setMode] = useState<Mode>("input");
  const [pik, setPik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<SynIDCardData | null>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "fail">("idle");
  const [trustPrompt, setTrustPrompt] = useState<{ slid: string; pik: string } | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [forceMigration, setForceMigration] = useState<{ slid: string; pik: string } | null>(null);

  useEffect(() => {
    if (getSession()) { navigate({ to: "/apps" }); return; }
    // Trusted-device auto-login
    const lastSlid = localStorage.getItem(LAST_SLID_KEY);
    const fp = localStorage.getItem(FP_KEY);
    if (lastSlid && fp) {
      void trustedLoginFn({ data: { slid: lastSlid, device_fingerprint: fp } })
        .then((s) => { setSession(s); navigate({ to: "/apps" }); })
        .catch(() => { /* ignore, fall back to manual login */ });
    }
  }, [navigate, trustedLoginFn]);

  // SSO via URL ?pik=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("pik");
    if (p) void handle(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handle(rawPik: string) {
    const candidate = extractPik(rawPik);
    if (!candidate) { setError("Kein gültiger PIK erkannt."); return; }
    setLoading(true); setError(null); setVerifyState("idle");
    try {
      if (stage === "login") {
        const me = await login({ data: { pik: candidate } });
        setSession(me);
        localStorage.setItem(LAST_SLID_KEY, me.slid);
        // Passkey-only accounts have no usable PIK anymore — old-style PIK
        // logins are nudged (and eventually forced) to set one up.
        let migrated = true;
        try {
          const status = await migrationStatus({ data: { slid: me.slid, pik: candidate } });
          migrated = status.passkey_migrated;
        } catch { /* xsyna_accounts row may not exist yet for legacy staff — skip nudge */ }
        if (!migrated && typeof window !== "undefined" && window.PublicKeyCredential) {
          setForceMigration({ slid: me.slid, pik: candidate });
        } else {
          setTrustPrompt({ slid: me.slid, pik: candidate });
        }
      } else {
        const res = await verify({ data: { pik: candidate } });
        if (res.valid) { setVerified(res.card as SynIDCardData); setVerifyState("ok"); }
        else { setVerified(null); setVerifyState("fail"); setError("SynID nicht gültig."); }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorgang fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function trustThisDevice() {
    if (!trustPrompt) return;
    try {
      await trustFn({ data: {
        slid: trustPrompt.slid, pik: trustPrompt.pik,
        device_fingerprint: ensureFingerprint(),
        device_model: navigator.userAgent.slice(0, 100),
        os: detectOS(),
        user_agent: navigator.userAgent,
        days: 90,
      }});
    } catch { /* ignore */ }
    setTrustPrompt(null);
    navigate({ to: "/apps" });
  }

  async function setUpForcedPasskey() {
    if (!forceMigration) return;
    setPasskeyBusy(true); setPasskeyError(null);
    try {
      const options = await beginMigrationReg({ data: {
        slid: forceMigration.slid, pik: forceMigration.pik, origin: window.location.origin,
      }});
      const response = await startRegistration({ optionsJSON: options as never });
      await finishMigrationReg({ data: {
        slid: forceMigration.slid, pik: forceMigration.pik,
        device_label: navigator.userAgent.slice(0, 60),
        origin: window.location.origin, response,
      }});
      const trustSlid = forceMigration.slid, trustPik = forceMigration.pik;
      setForceMigration(null);
      setTrustPrompt({ slid: trustSlid, pik: trustPik });
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : "Passkey konnte nicht angelegt werden.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function passkeyLogin() {
    setPasskeyBusy(true); setPasskeyError(null);
    try {
      const options = await beginPasskeyAuth({ data: { slid: null, origin: window.location.origin } });
      const response = await startAuthentication({ optionsJSON: options as never });
      const session = await finishPasskeyAuth({ data: { response, origin: window.location.origin } });
      setSession(session as SynSession);
      localStorage.setItem(LAST_SLID_KEY, session.slid);
      navigate({ to: "/apps" });
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : "Passkey-Anmeldung fehlgeschlagen.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  const accent = stage === "verify" ? "var(--neural-mint)" : stage === "support" ? "var(--neural-magenta)" : "var(--synapse)";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-2 syn-chip mb-3">
            <Sparkles className="h-3 w-3" /> xSyna Kollektiv
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="syn-gradient-text">xSyna Central</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Login &amp; SynID-Verifikation über das SynID-Modul.
          </p>
        </div>

        {/* Stage switch */}
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          <StageBtn active={stage === "passkey"} onClick={() => { setStage("passkey"); setError(null); setPasskeyError(null); }} icon={<Fingerprint className="h-4 w-4" />} label="Passkey" />
          <StageBtn active={stage === "login"} onClick={() => { setStage("login"); setVerified(null); setError(null); }} icon={<LogIn className="h-4 w-4" />} label="SynID" />
          <StageBtn active={stage === "verify"} onClick={() => { setStage("verify"); setError(null); }} icon={<BadgeCheck className="h-4 w-4" />} label="Verify" />
          <StageBtn active={stage === "quick"} onClick={() => { setStage("quick"); setError(null); }} icon={<Zap className="h-4 w-4" />} label="Quick" />
          <StageBtn active={stage === "support"} onClick={() => { setStage("support"); setError(null); }} icon={<LifeBuoy className="h-4 w-4" />} label="Support" />
        </div>

        {stage === "verify" && verified && (
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SynIDCard data={verified} compact />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--neural-mint)" }}>
              <ShieldCheck className="h-3.5 w-3.5" /> Gültige SynID
            </div>
          </div>
        )}

        {stage === "support" ? (
          <SupportSection />
        ) : stage === "quick" ? (
          <QuickLoginSection onDone={(s) => { setSession(s); navigate({ to: "/apps" }); }} />
        ) : stage === "passkey" ? (
          <div className="syn-card p-4 sm:p-6 space-y-4 syn-gradient-border" style={{ borderColor: "var(--synapse)" }}>
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
                <Fingerprint className="h-7 w-7" style={{ color: "var(--synapse)" }} />
              </div>
              <p className="text-xs text-muted-foreground">FaceID, TouchID, Windows Hello oder Sicherheitsschlüssel — ohne PIK, ohne Passwort.</p>
            </div>
            <button onClick={() => void passkeyLogin()} disabled={passkeyBusy} className="syn-btn w-full">
              <Fingerprint className="h-4 w-4" /> {passkeyBusy ? "Prüfe…" : "Mit Passkey anmelden"}
            </button>
            {passkeyError && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{passkeyError}</div>}
            <button onClick={() => { setShowSignup(true); setPasskeyError(null); }} className="syn-btn-ghost w-full text-xs justify-between">
              Noch kein Konto? Jetzt registrieren <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--neural-mint)" }} />
              <span>Passkeys sind an dieses Gerät und diese Domain gebunden – niemand außer dir kann sie nutzen.</span>
            </div>
          </div>
        ) : (
          <div className="syn-card p-4 sm:p-6 space-y-4 syn-gradient-border" style={{ borderColor: accent }}>
            <div className="grid grid-cols-3 gap-2">
              <ModeBtn active={mode === "input"} onClick={() => setMode("input")} icon={<KeyRound className="h-4 w-4" />} label="Eingabe" />
              <ModeBtn active={mode === "scan"} onClick={() => setMode("scan")} icon={<QrCode className="h-4 w-4" />} label="QR Scan" />
              <ModeBtn active={mode === "photo"} onClick={() => setMode("photo")} icon={<ImageIcon className="h-4 w-4" />} label="Galerie" />
            </div>

            {mode === "input" && (
              <form onSubmit={(e) => { e.preventDefault(); void handle(pik); }} className="space-y-3">
                <label className="text-xs text-muted-foreground mono uppercase tracking-wider">PIK</label>
                <input value={pik} onChange={(e) => setPik(e.target.value)} type="password" placeholder="64-stelliger Hex-Key" className="syn-input" autoComplete="current-password" inputMode="text" />
                <button type="submit" disabled={loading || pik.length < 16} className="syn-btn w-full">
                  {stage === "login" ? <KeyRound className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                  {loading ? "Verarbeite…" : stage === "login" ? "Authentifizieren" : "Verifizieren"}
                </button>
              </form>
            )}

            {mode === "scan" && <QrScanner onResult={(t) => handle(t)} disabled={loading} />}
            {mode === "photo" && <PhotoScanner onResult={(t) => handle(t)} disabled={loading} />}

            {error && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{error}</div>}
            {stage === "verify" && verifyState === "fail" && !error && (
              <div className="text-xs mono p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">SynID ungültig.</div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--neural-mint)" }} />
              <span>{stage === "login" ? "PIK wird verschlüsselt übertragen und nur serverseitig geprüft." : "Verifikation liefert nur die öffentlichen SynID-Karteninfos – keine Sitzung."}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link to="/" className="syn-btn-ghost inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Zurück</Link>
          <Link to="/apply" className="syn-btn-ghost inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> Bewerben</Link>
          <a href="tel:+491773374439" className="syn-btn-ghost inline-flex items-center gap-1"><Phone className="h-3 w-3" /> +49 177 3374439</a>
          <a href="https://wa.me/491773374439" target="_blank" rel="noreferrer" className="syn-btn-ghost inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" style={{ color: "#25d366" }} /> WhatsApp</a>
        </div>
      </div>

      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onDone={(session) => { setSession(session); localStorage.setItem(LAST_SLID_KEY, session.slid); navigate({ to: "/apps" }); }}
          signupFn={signupFn}
          finishRegFn={finishSignupReg}
          sessionForTokenFn={sessionForToken}
        />
      )}

      {forceMigration && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card syn-gradient-border max-w-sm w-full p-5 space-y-3 text-center" style={{ borderColor: "var(--synapse)" }}>
            <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
              <Fingerprint className="h-6 w-6" style={{ color: "var(--synapse)" }} />
            </div>
            <h3 className="font-semibold">Passkey jetzt einrichten</h3>
            <p className="text-xs text-muted-foreground">
              xSyna Central wechselt auf Passkey-Anmeldung. Richte jetzt einen Passkey für dieses Gerät ein — dein PIK wird danach deaktiviert.
            </p>
            {passkeyError && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{passkeyError}</div>}
            <button onClick={() => void setUpForcedPasskey()} disabled={passkeyBusy} className="syn-btn w-full">
              <Fingerprint className="h-4 w-4" /> {passkeyBusy ? "Richte ein…" : "Passkey jetzt anlegen"}
            </button>
          </div>
        </div>
      )}

      {trustPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card syn-gradient-border max-w-sm w-full p-5 space-y-3 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
              <ShieldCheck className="h-6 w-6" style={{ color: "var(--neural-mint)" }} />
            </div>
            <h3 className="font-semibold">Dieses Gerät registrieren?</h3>
            <p className="text-xs text-muted-foreground">
              Registriere <span className="mono">{detectOS()}</span> als vertrauenswürdig, damit du dich in den nächsten 90 Tagen ohne PIK anmelden kannst.
              Übertragen werden: Gerätemodell, OS-Version, IP.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setTrustPrompt(null); navigate({ to: "/apps" }); }} className="syn-btn-ghost">Nein</button>
              <button onClick={() => void trustThisDevice()} className="syn-btn">Ja, vertrauen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignupModal({
  onClose, onDone, signupFn, finishRegFn, sessionForTokenFn,
}: {
  onClose: () => void;
  onDone: (session: SynSession) => void;
  signupFn: ReturnType<typeof useServerFn<typeof xaSignup>>;
  finishRegFn: ReturnType<typeof useServerFn<typeof xaFinishRegistration>>;
  sessionForTokenFn: ReturnType<typeof useServerFn<typeof xaSessionForToken>>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setBusy(true); setErr(null);
    try {
      const { slid, token, options } = await signupFn({ data: {
        first_name: firstName.trim(), last_name: lastName.trim(),
        email: email.trim() || undefined, origin: window.location.origin,
      }});
      const response = await startRegistration({ optionsJSON: options as never });
      await finishRegFn({ data: { slid, token, device_label: navigator.userAgent.slice(0, 60), origin: window.location.origin, response } });
      const session = await sessionForTokenFn({ data: { token } });
      onDone(session as SynSession);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registrierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="syn-card syn-gradient-border max-w-sm w-full p-5 space-y-3" style={{ borderColor: "var(--synapse)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">xSyna Account erstellen</h3>
          <button onClick={onClose} className="syn-btn-ghost p-1.5"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Für Kunden &amp; Partner. Anmeldung erfolgt danach ausschließlich per Passkey.</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="syn-input" placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className="syn-input" placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <input className="syn-input" type="email" placeholder="E-Mail (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        {err && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{err}</div>}
        <button onClick={() => void submit()} disabled={busy || !firstName.trim() || !lastName.trim()} className="syn-btn w-full">
          <Fingerprint className="h-4 w-4" /> {busy ? "Erstelle Konto…" : "Konto erstellen & Passkey einrichten"}
        </button>
      </div>
    </div>
  );
}

function StageBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl text-[11px] sm:text-xs transition-all ${active ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
      {icon}{label}
    </button>
  );
}

function SupportSection() {
  const createFn = useServerFn(supportAccountCreate);
  const loginFn = useServerFn(supportAccountLogin);
  const postFn = useServerFn(supportAccountPost);
  const [mode, setMode] = useState<"create" | "login">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  type Msg = { id: string; body: string; author_role: string; created_at: string };
  const [thread, setThread] = useState<{ subject: string; messages: Msg[] } | null>(null);
  const [reply, setReply] = useState("");

  async function create() {
    setBusy(true); setErr(null);
    try {
      const r = await createFn({ data: { name, subject, body } });
      setCreated({ name: r.name, code: r.code });
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }
  async function loginTicket() {
    setBusy(true); setErr(null);
    try {
      const r = await loginFn({ data: { name, code } });
      setThread({ subject: r.ticket?.subject || "Ticket", messages: r.messages as Msg[] });
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }
  async function post() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await postFn({ data: { name, code, body: reply } });
      setReply("");
      await loginTicket();
    } finally { setBusy(false); }
  }

  if (thread) {
    return (
      <div className="syn-card syn-gradient-border p-5 space-y-3" style={{ borderColor: "var(--neural-magenta)" }}>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" />
          <h3 className="font-semibold truncate">{thread.subject}</h3>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {thread.messages.map((m) => (
            <div key={m.id} className={`text-xs rounded-2xl p-3 ${m.author_role === "staff" ? "bg-card border border-border" : "syn-tab-active"}`}>
              <div className="text-[10px] mono text-muted-foreground mb-1">{m.author_role} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="syn-input flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Antwort…" />
          <button onClick={() => void post()} disabled={busy || !reply.trim()} className="syn-btn"><Send className="h-4 w-4" /></button>
        </div>
        <button onClick={() => { setThread(null); setCode(""); }} className="syn-btn-ghost w-full text-xs">Abmelden</button>
      </div>
    );
  }

  if (created) {
    return (
      <div className="syn-card syn-gradient-border p-5 space-y-3 text-center" style={{ borderColor: "var(--neural-mint)" }}>
        <ShieldCheck className="h-8 w-8 mx-auto" style={{ color: "var(--neural-mint)" }} />
        <h3 className="font-semibold">Support-Account erstellt</h3>
        <p className="text-xs text-muted-foreground">Schreibe dir Name und Code auf. Damit kannst du dich jederzeit wieder in dein Ticket einloggen.</p>
        <div className="syn-card p-3 space-y-2">
          <div><div className="text-[10px] mono text-muted-foreground">NAME</div><div className="font-semibold mono">{created.name}</div></div>
          <div><div className="text-[10px] mono text-muted-foreground">CODE</div><div className="font-bold mono text-2xl tracking-widest">{created.code}</div></div>
        </div>
        <button className="syn-btn w-full" onClick={() => { setName(created.name); setCode(created.code); setCreated(null); setMode("login"); void loginTicket(); }}>
          Ticket öffnen
        </button>
      </div>
    );
  }

  return (
    <div className="syn-card syn-gradient-border p-5 space-y-4" style={{ borderColor: "var(--neural-magenta)" }}>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMode("create")} className={`px-3 py-2 rounded-2xl text-xs ${mode === "create" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}><Plus className="h-3 w-3 inline mr-1" />Neues Ticket</button>
        <button onClick={() => setMode("login")} className={`px-3 py-2 rounded-2xl text-xs ${mode === "login" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}><LogIn className="h-3 w-3 inline mr-1" />Ticket öffnen</button>
      </div>
      <input className="syn-input" placeholder="Dein Name" value={name} onChange={(e) => setName(e.target.value)} />
      {mode === "create" ? (
        <>
          <input className="syn-input" placeholder="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className="syn-input min-h-24" placeholder="Nachricht" value={body} onChange={(e) => setBody(e.target.value)} />
          <button onClick={() => void create()} disabled={busy || !name.trim() || !subject.trim() || !body.trim()} className="syn-btn w-full">
            {busy ? "Erstelle…" : "Ticket erstellen"}
          </button>
        </>
      ) : (
        <>
          <input className="syn-input mono tracking-widest text-center text-lg" placeholder="6-stelliger Code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <button onClick={() => void loginTicket()} disabled={busy || !name.trim() || code.length !== 6} className="syn-btn w-full">
            {busy ? "Prüfe…" : "Einloggen"}
          </button>
        </>
      )}
      {err && <div className="text-xs text-destructive mono">{err}</div>}
      <p className="text-[11px] text-muted-foreground">Support-Accounts benötigen kein SynID – nur Name + Code für dein Ticket.</p>
    </div>
  );
}

function QuickLoginSection({ onDone }: { onDone: (s: {
  slid: string; pik: string; name: string; hl: number; regid: string; cip: string;
  department: string | null; position: string | null; kind: string | null; isSuperuser: boolean;
}) => void }) {
  const consumeFn = useServerFn(quickLoginConsume);
  const [slid, setSlid] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setErr(null);
    try {
      const s = await consumeFn({ data: { slid: slid.trim(), code } });
      onDone(s);
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }
  return (
    <div className="syn-card p-5 space-y-3 syn-gradient-border" style={{ borderColor: "var(--synapse)" }}>
      <div className="text-xs text-muted-foreground">Quick-Login – Anmeldung per 6-stelligem Code vom Support (gültig 15 Min).</div>
      <input className="syn-input" placeholder="SLID (z. B. S1234)" value={slid} onChange={(e) => setSlid(e.target.value.toUpperCase())} />
      <input className="syn-input mono tracking-widest text-center text-lg" placeholder="6-stelliger Code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      <button className="syn-btn w-full" disabled={busy || !slid.trim() || code.length !== 6} onClick={() => void submit()}>
        <Zap className="h-4 w-4" /> {busy ? "Prüfe…" : "Einloggen"}
      </button>
      {err && <div className="text-xs text-destructive mono">{err}</div>}
      <p className="text-[11px] text-muted-foreground">Fordere den Code beim Support an: +49 177 3374439 (WhatsApp).</p>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl text-[11px] transition-all ${active ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
      {icon}{label}
    </button>
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { BarcodeDetector?: any }
}

function QrScanner({ onResult, disabled }: { onResult: (text: string) => void; disabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    setErr(null);
    if (!("BarcodeDetector" in window)) { setErr("Dieser Browser unterstützt keinen QR-Scanner. Nutze 'Galerie' oder 'Eingabe'."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      let stopped = false;
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes && codes[0]?.rawValue) { stop(); onResult(codes[0].rawValue); return; }
        } catch { /* ignore */ }
        requestAnimationFrame(tick);
      };
      const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); setRunning(false); };
      stopRef.current = stop;
      requestAnimationFrame(tick);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kamera nicht verfügbar.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-black/40">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!running && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">Kamera bereit</div>}
        {running && <button onClick={() => stopRef.current()} className="absolute top-2 right-2 syn-btn-ghost !p-1.5"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {!running ? (
        <button onClick={start} disabled={disabled} className="syn-btn w-full"><Camera className="h-4 w-4" /> Kamera starten</button>
      ) : (
        <p className="text-[11px] text-center text-muted-foreground">Richte den QR-Code auf die Kamera…</p>
      )}
      {err && <p className="text-xs text-destructive mono">{err}</p>}
    </div>
  );
}

function PhotoScanner({ onResult, disabled }: { onResult: (text: string) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File) {
    setErr(null); setBusy(true);
    try {
      if (!("BarcodeDetector" in window)) throw new Error("Dieser Browser kann QR-Bilder nicht decodieren. Nutze 'Eingabe'.");
      const bitmap = await createImageBitmap(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(bitmap);
      if (!codes || !codes[0]?.rawValue) throw new Error("Kein QR-Code im Bild erkannt.");
      onResult(codes[0].rawValue);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bild konnte nicht gelesen werden.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); }} />
      <button onClick={() => fileRef.current?.click()} disabled={disabled || busy} className="syn-btn w-full">
        <ImageIcon className="h-4 w-4" /> {busy ? "Lese Bild…" : "Bild aus Galerie wählen"}
      </button>
      <p className="text-[11px] text-center text-muted-foreground">Wähle ein QR-Code-Foto aus deiner Galerie.</p>
      {err && <p className="text-xs text-destructive mono">{err}</p>}
    </div>
  );
}
