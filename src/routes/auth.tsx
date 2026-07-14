import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, KeyRound, ShieldCheck, QrCode, Camera, Image as ImageIcon,
  X, BadgeCheck, ArrowLeft, LogIn, LifeBuoy, Send, Plus, Zap, Phone,
  MessageCircle, UserPlus, Fingerprint, ChevronRight,
} from "lucide-react";
import { LiquidButton, LiquidInput, XSynaLogo, Spin, TabBar } from "@/components/nl";
import { T } from "@/components/nl";
import { useServerFn } from "@tanstack/react-start";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { synLoginByPik, synVerifyByPik } from "@/lib/syn.functions";
import { registerTrustedDevice, loginByTrustedDevice } from "@/lib/devices.functions";
import { supportAccountCreate, supportAccountLogin, supportAccountPost } from "@/lib/support-accounts.functions";
import { quickLoginConsume } from "@/lib/quick-login.functions";
import {
  xaBeginAuth, xaFinishAuth, xaSessionForToken, xaFinishRegistration, xaBeginRegistration,
} from "@/lib/xsyna-account.functions";
import { xaSignup, xaMigrationStatus } from "@/lib/xsyna-signup.functions";
import { setSession, getSession, type SynSession } from "@/lib/syn-session";
import { SynIDCard, type SynIDCardData } from "@/components/SynIDCard";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SynID Verbinden \u2013 xSyna Central" },
      { name: "description", content: "Sichere SynID-Anmeldung zum xSyna-Kollektiv." },
    ],
  }),
  component: AuthPage,
});

type Mode = "input" | "scan" | "photo";
type Stage = "passkey" | "login" | "verify" | "quick" | "support";

const FP_KEY = "xsyna.deviceFp.v1";
const LAST_SLID_KEY = "xsyna.lastSlid.v1";

const STAGE_TABS = ["Passkey", "SynID", "Verify", "Quick", "Support"];
const STAGE_ORDER: Stage[] = ["passkey", "login", "verify", "quick", "support"];

function stageIndex(s: Stage): number { return STAGE_ORDER.indexOf(s); }

function ensureFingerprint(): string {
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) { fp = crypto.randomUUID(); localStorage.setItem(FP_KEY, fp); }
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

const cardEnter = { initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.98 }, transition: { type: "spring", stiffness: 350, damping: 30 } };

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
    if (getSession()) { navigate({ to: "/home" }); return; }
    const lastSlid = localStorage.getItem(LAST_SLID_KEY);
    const fp = localStorage.getItem(FP_KEY);
    if (lastSlid && fp) {
      void trustedLoginFn({ data: { slid: lastSlid, device_fingerprint: fp } })
        .then((s) => { setSession(s); navigate({ to: "/home" }); })
        .catch(() => { /* ignore, fall back to manual login */ });
    }
  }, [navigate, trustedLoginFn]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("pik");
    if (p) void handle(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handle(rawPik: string) {
    const candidate = extractPik(rawPik);
    if (!candidate) { setError("Kein g\u00fcltiger PIK erkannt."); return; }
    setLoading(true); setError(null); setVerifyState("idle");
    try {
      if (stage === "login") {
        const me = await login({ data: { pik: candidate } });
        setSession(me);
        localStorage.setItem(LAST_SLID_KEY, me.slid);
        let migrated = true;
        try {
          const status = await migrationStatus({ data: { slid: me.slid, pik: candidate } });
          migrated = status.passkey_migrated;
        } catch { /* xsyna_accounts row may not exist yet for legacy staff \u2014 skip nudge */ }
        if (!migrated && typeof window !== "undefined" && window.PublicKeyCredential) {
          setForceMigration({ slid: me.slid, pik: candidate });
        } else {
          setTrustPrompt({ slid: me.slid, pik: candidate });
        }
      } else {
        const res = await verify({ data: { pik: candidate } });
        if (res.valid) { setVerified(res.card as SynIDCardData); setVerifyState("ok"); }
        else { setVerified(null); setVerifyState("fail"); setError("SynID nicht g\u00fcltig."); }
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
    navigate({ to: "/home" });
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
      const options = await beginPasskeyAuth({ data: { origin: window.location.origin } });
      const response = await startAuthentication({ optionsJSON: options as never });
      const session = await finishPasskeyAuth({ data: { response, origin: window.location.origin } });
      setSession(session as SynSession);
      localStorage.setItem(LAST_SLID_KEY, session.slid);
      navigate({ to: "/home" });
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : "Passkey-Anmeldung fehlgeschlagen.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  const accent = stage === "verify" ? T.success : stage === "support" ? T.error : T.primary;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-5 sm:mb-7">
          <div className="flex justify-center mb-3"><XSynaLogo size={48} /></div>
          <div className="inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-full text-[11px]" style={{ color: T.primary, border: `1px solid ${T.border}`, background: T.bg2 }}>
            <Sparkles className="h-3 w-3" /> xSyna Kollektiv
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            <span style={{ background: `linear-gradient(90deg,${T.primary},${T.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>xSyna Central</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm" style={{ color: T.muted }}>
            Login &amp; SynID-Verifikation \u00fcber das SynID-Modul.
          </p>
        </div>

        {/* Stage TabBar */}
        <div className="flex justify-center mb-4">
          <TabBar
            tabs={STAGE_TABS}
            defaultActive={stageIndex(stage)}
            onChange={(i) => {
              const s = STAGE_ORDER[i];
              setStage(s);
              setError(null);
              setPasskeyError(null);
              if (s === "login") { setVerified(null); }
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {stage === "verify" && verified && (
            <motion.div key="verified-card" className="mb-4" {...cardEnter}>
              <SynIDCard data={verified} compact />
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: T.success }}>
                <ShieldCheck className="h-3.5 w-3.5" /> G\u00fcltige SynID
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {stage === "support" ? (
            <motion.div key="support" {...cardEnter}><SupportSection /></motion.div>
          ) : stage === "quick" ? (
            <motion.div key="quick" {...cardEnter}><QuickLoginSection onDone={(s) => { setSession(s); navigate({ to: "/home" }); }} /></motion.div>
          ) : stage === "passkey" ? (
            <motion.div key="passkey" {...cardEnter}>
              <div className="p-4 sm:p-6 space-y-4" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px" }}>
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center" style={{ background: `linear-gradient(135deg,${T.primary}18,${T.accent}12)` }}>
                    <Fingerprint className="h-7 w-7" style={{ color: T.primary }} />
                  </div>
                  <p className="text-xs" style={{ color: T.muted }}>FaceID, TouchID, Windows Hello oder Sicherheitsschl\u00fcssel &mdash; ohne SLID, ohne PIK, ohne Passwort.</p>
                </div>
                <LiquidButton fullWidth onClick={() => void passkeyLogin()} disabled={passkeyBusy}>
                  {passkeyBusy ? <Spin size={16} color={T.bg} /> : <Fingerprint className="h-4 w-4" />}
                  {passkeyBusy ? "Pr\u00fcfe\u2026" : "Mit Passkey anmelden"}
                </LiquidButton>
                {passkeyError && (
                  <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>{passkeyError}</div>
                )}
                <LiquidButton variant="ghost" fullWidth onClick={() => { setShowSignup(true); setPasskeyError(null); }}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span>Noch kein Konto? Jetzt registrieren</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </LiquidButton>
                <div className="flex items-start gap-2 text-[11px]" style={{ color: T.muted }}>
                  <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" style={{ color: T.success }} />
                  <span>Passkeys sind an dieses Ger\u00e4t und diese Domain gebunden &ndash; niemand au\u00dfer dir kann sie nutzen.</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="login-verify" {...cardEnter}>
              <div className="p-4 sm:p-6 space-y-4" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", borderTopColor: accent }}>
                {/* Mode buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {(["input","scan","photo"] as const).map((m) => (
                    <ModeBtn key={m} active={mode === m} onClick={() => setMode(m)}
                      icon={m === "input" ? <KeyRound className="h-4 w-4" /> : m === "scan" ? <QrCode className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      label={m === "input" ? "Eingabe" : m === "scan" ? "QR Scan" : "Galerie"} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {mode === "input" && (
                    <motion.form key="input" {...cardEnter} onSubmit={(e) => { e.preventDefault(); void handle(pik); }} className="space-y-3">
                      <LiquidInput label="PIK" type="password" value={pik} onChange={setPik} placeholder="64-stelliger Hex-Key" icon={KeyRound} autoComplete="current-password" />
                      <LiquidButton type="submit" variant="primary" fullWidth disabled={loading || pik.length < 16}>
                        {loading ? <Spin size={16} color={T.bg} /> : stage === "login" ? <KeyRound className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                        {loading ? "Verarbeite\u2026" : stage === "login" ? "Authentifizieren" : "Verifizieren"}
                      </LiquidButton>
                    </motion.form>
                  )}
                  {mode === "scan" && <motion.div key="scan" {...cardEnter}><QrScanner onResult={(t) => handle(t)} disabled={loading} /></motion.div>}
                  {mode === "photo" && <motion.div key="photo" {...cardEnter}><PhotoScanner onResult={(t) => handle(t)} disabled={loading} /></motion.div>}
                </AnimatePresence>

                {error && (
                  <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>{error}</div>
                )}
                {stage === "verify" && verifyState === "fail" && !error && (
                  <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>SynID ung\u00fcltig.</div>
                )}

                <div className="flex items-start gap-2 text-[11px]" style={{ color: T.muted }}>
                  <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" style={{ color: T.success }} />
                  <span>{stage === "login" ? "PIK wird verschl\u00fcsselt \u00fcbertragen und nur serverseitig gepr\u00fcft." : "Verifikation liefert nur die \u00f6ffentlichen SynID-Karteninfos \u2013 keine Sitzung."}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer links */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <Link to="/"><LiquidButton variant="ghost" size="xs"><ArrowLeft className="h-3 w-3" /> Zur\u00fcck</LiquidButton></Link>
          <Link to="/apply"><LiquidButton variant="ghost" size="xs"><UserPlus className="h-3 w-3" /> Bewerben</LiquidButton></Link>
          <a href="tel:+491773374439"><LiquidButton variant="ghost" size="xs"><Phone className="h-3 w-3" /> +49 177 3374439</LiquidButton></a>
          <a href="https://wa.me/491773374439" target="_blank" rel="noreferrer"><LiquidButton variant="ghost" size="xs"><MessageCircle className="h-3 w-3" style={{ color: "#25d366" }} /> WhatsApp</LiquidButton></a>
        </div>
      </div>

      {/* Signup Modal */}
      <AnimatePresence>
        {showSignup && (
          <SignupModal
            key="signup"
            onClose={() => setShowSignup(false)}
            onDone={(session) => { setSession(session); localStorage.setItem(LAST_SLID_KEY, session.slid); navigate({ to: "/home" }); }}
            signupFn={signupFn}
            finishRegFn={finishSignupReg}
            sessionForTokenFn={sessionForToken}
          />
        )}
      </AnimatePresence>

      {/* Force Migration Modal */}
      <AnimatePresence>
        {forceMigration && (
          <motion.div key="force-migration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <motion.div {...cardEnter} className="max-w-sm w-full p-5 space-y-3 text-center" style={{ background: T.bg2, border: `1px solid ${T.primary}44`, borderRadius: "16px" }}>
              <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ background: `linear-gradient(135deg,${T.primary}18,${T.accent}12)` }}>
                <Fingerprint className="h-6 w-6" style={{ color: T.primary }} />
              </div>
              <h3 className="font-semibold" style={{ color: T.text }}>Passkey jetzt einrichten</h3>
              <p className="text-xs" style={{ color: T.muted }}>
                xSyna Central wechselt auf Passkey-Anmeldung. Richte jetzt einen Passkey f&uuml;r dieses Ger&auml;t ein &mdash; dein PIK wird danach deaktiviert.
              </p>
              {passkeyError && <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>{passkeyError}</div>}
              <LiquidButton fullWidth onClick={() => void setUpForcedPasskey()} disabled={passkeyBusy}>
                {passkeyBusy ? <Spin size={16} color={T.bg} /> : <Fingerprint className="h-4 w-4" />}
                {passkeyBusy ? "Richte ein\u2026" : "Passkey jetzt anlegen"}
              </LiquidButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trust Prompt Modal */}
      <AnimatePresence>
        {trustPrompt && (
          <motion.div key="trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <motion.div {...cardEnter} className="max-w-sm w-full p-5 space-y-3 text-center" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px" }}>
              <div className="mx-auto h-12 w-12 rounded-2xl grid place-items-center" style={{ background: `linear-gradient(135deg,${T.success}18,${T.primary}12)` }}>
                <ShieldCheck className="h-6 w-6" style={{ color: T.success }} />
              </div>
              <h3 className="font-semibold" style={{ color: T.text }}>Dieses Ger&auml;t registrieren?</h3>
              <p className="text-xs" style={{ color: T.muted }}>
                Registriere <span className="mono">{detectOS()}</span> als vertrauensw&uuml;rdig, damit du dich in den n&auml;chsten 90 Tagen ohne PIK anmelden kannst.
                &Uuml;bertragen werden: Ger&auml;temodell, OS-Version, IP.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <LiquidButton variant="ghost" onClick={() => { setTrustPrompt(null); navigate({ to: "/home" }); }}>Nein</LiquidButton>
                <LiquidButton variant="success" onClick={() => void trustThisDevice()}>Ja, vertrauen</LiquidButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Signup Modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <motion.div {...cardEnter} className="max-w-sm w-full p-5 space-y-3" style={{ background: T.bg2, border: `1px solid ${T.primary}44`, borderRadius: "16px" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: T.text }}>xSyna Account erstellen</h3>
          <LiquidButton variant="ghost" size="xs" onClick={onClose}><X className="h-4 w-4" /></LiquidButton>
        </div>
        <p className="text-xs" style={{ color: T.muted }}>F&uuml;r Kunden &amp; Partner. Anmeldung erfolgt danach ausschlie&szlig;lich per Passkey.</p>
        <div className="grid grid-cols-2 gap-2">
          <LiquidInput placeholder="Vorname" value={firstName} onChange={setFirstName} icon={UserPlus} />
          <LiquidInput placeholder="Nachname" value={lastName} onChange={setLastName} icon={UserPlus} />
        </div>
        <LiquidInput type="email" placeholder="E-Mail (optional)" value={email} onChange={setEmail} icon={Sparkles} />
        {err && <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>{err}</div>}
        <LiquidButton fullWidth onClick={() => void submit()} disabled={busy || !firstName.trim() || !lastName.trim()}>
          {busy ? <Spin size={16} color={T.bg} /> : <Fingerprint className="h-4 w-4" />}
          {busy ? "Erstelle Konto\u2026" : "Konto erstellen &amp; Passkey einrichten"}
        </LiquidButton>
      </motion.div>
    </motion.div>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Mode Button \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl text-[11px] transition-all"
      style={{
        background: active ? `${T.primary}18` : "transparent",
        border: active ? `1px solid ${T.primary}40` : `1px solid ${T.border}`,
        color: active ? T.primary : T.muted,
        fontWeight: active ? 600 : 400,
      }}>
      {icon}{label}
    </button>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Support Section \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
      <div className="p-5 space-y-3" style={{ background: T.bg2, border: `1px solid ${T.error}44`, borderRadius: "16px" }}>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" style={{ color: T.error }} />
          <h3 className="font-semibold truncate" style={{ color: T.text }}>{thread.subject}</h3>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {thread.messages.map((m) => (
            <div key={m.id} className="text-xs rounded-2xl p-3" style={{
              background: m.author_role === "staff" ? T.surface : `${T.primary}12`,
              border: m.author_role === "staff" ? `1px solid ${T.border}` : `1px solid ${T.primary}30`,
            }}>
              <div className="text-[10px] mono mb-1" style={{ color: T.muted }}>{m.author_role} &middot; {new Date(m.created_at).toLocaleString()}</div>
              <div className="whitespace-pre-wrap" style={{ color: T.text }}>{m.body}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <LiquidInput placeholder="Antwort\u2026" value={reply} onChange={setReply} icon={Send} />
          </div>
          <LiquidButton onClick={() => void post()} disabled={busy || !reply.trim()}><Send className="h-4 w-4" /></LiquidButton>
        </div>
        <LiquidButton variant="ghost" fullWidth onClick={() => { setThread(null); setCode(""); }}>Abmelden</LiquidButton>
      </div>
    );
  }

  if (created) {
    return (
      <div className="p-5 space-y-3 text-center" style={{ background: T.bg2, border: `1px solid ${T.success}44`, borderRadius: "16px" }}>
        <ShieldCheck className="h-8 w-8 mx-auto" style={{ color: T.success }} />
        <h3 className="font-semibold" style={{ color: T.text }}>Support-Account erstellt</h3>
        <p className="text-xs" style={{ color: T.muted }}>Schreibe dir Name und Code auf. Damit kannst du dich jederzeit wieder in dein Ticket einloggen.</p>
        <div className="p-3 space-y-2" style={{ background: T.surface, borderRadius: "12px" }}>
          <div><div className="text-[10px] mono" style={{ color: T.muted }}>NAME</div><div className="font-semibold mono" style={{ color: T.text }}>{created.name}</div></div>
          <div><div className="text-[10px] mono" style={{ color: T.muted }}>CODE</div><div className="font-bold mono text-2xl tracking-widest" style={{ color: T.primary }}>{created.code}</div></div>
        </div>
        <LiquidButton fullWidth onClick={() => { setName(created.name); setCode(created.code); setCreated(null); setMode("login"); void loginTicket(); }}>
          Ticket &ouml;ffnen
        </LiquidButton>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4" style={{ background: T.bg2, border: `1px solid ${T.error}44`, borderRadius: "16px" }}>
      <div className="grid grid-cols-2 gap-2">
        {(["create","login"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-2xl text-xs transition-all"
            style={{
              background: mode === m ? `${T.primary}18` : "transparent",
              border: mode === m ? `1px solid ${T.primary}40` : `1px solid ${T.border}`,
              color: mode === m ? T.primary : T.muted,
              fontWeight: mode === m ? 600 : 400,
            }}>
            {m === "create" ? <Plus className="h-3 w-3" /> : <LogIn className="h-3 w-3" />}
            {m === "create" ? "Neues Ticket" : "Ticket \u00f6ffnen"}
          </button>
        ))}
      </div>
      <LiquidInput placeholder="Dein Name" value={name} onChange={setName} icon={UserPlus} />
      {mode === "create" ? (
        <>
          <LiquidInput placeholder="Betreff" value={subject} onChange={setSubject} icon={Sparkles} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nachricht"
            className="w-full min-h-24 resize-none"
            style={{
              background: T.bg2, border: `1.5px solid ${T.border}`, borderRadius: "12px",
              color: T.text, fontSize: "14px", padding: "13px 14px", outline: "none",
              fontFamily: "'DM Sans',sans-serif",
            }} />
          <LiquidButton fullWidth onClick={() => void create()} disabled={busy || !name.trim() || !subject.trim() || !body.trim()}>
            {busy ? "Erstelle\u2026" : "Ticket erstellen"}
          </LiquidButton>
        </>
      ) : (
        <>
          <LiquidInput placeholder="6-stelliger Code" value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} icon={ShieldCheck} />
          <LiquidButton fullWidth onClick={() => void loginTicket()} disabled={busy || !name.trim() || code.length !== 6}>
            {busy ? "Pr\u00fcfe\u2026" : "Einloggen"}
          </LiquidButton>
        </>
      )}
      {err && <div className="text-xs mono" style={{ color: T.error }}>{err}</div>}
      <p className="text-[11px]" style={{ color: T.muted }}>Support-Accounts ben&ouml;tigen kein SynID &ndash; nur Name + Code f&uuml;r dein Ticket.</p>
    </div>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Quick Login Section \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
    <div className="p-5 space-y-3" style={{ background: T.bg2, border: `1px solid ${T.primary}44`, borderRadius: "16px" }}>
      <div className="text-xs" style={{ color: T.muted }}>Quick-Login &ndash; Anmeldung per 6-stelligem Code vom Support (g&uuml;ltig 15 Min).</div>
      <LiquidInput placeholder="SLID (z.\u00a0B.\u00a0S1234)" value={slid} onChange={(v) => setSlid(v.toUpperCase())} icon={Zap} />
      <LiquidInput placeholder="6-stelliger Code" value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))} icon={ShieldCheck} />
      <LiquidButton fullWidth disabled={busy || !slid.trim() || code.length !== 6} onClick={() => void submit()}>
        {busy ? <Spin size={16} color={T.bg} /> : <Zap className="h-4 w-4" />}
        {busy ? "Pr\u00fcfe\u2026" : "Einloggen"}
      </LiquidButton>
      {err && <div className="text-xs mono" style={{ color: T.error }}>{err}</div>}
      <p className="text-[11px]" style={{ color: T.muted }}>Fordere den Code beim Support an: +49 177 3374439 (WhatsApp).</p>
    </div>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 QR Scanner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
    if (!("BarcodeDetector" in window)) { setErr("Dieser Browser unterst\u00fctzt keinen QR-Scanner. Nutze 'Galerie' oder 'Eingabe'."); return; }
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
      setErr(e instanceof Error ? e.message : "Kamera nicht verf\u00fcgbar.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl" style={{ border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.4)" }}>
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!running && <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: T.muted }}>Kamera bereit</div>}
        {running && <button onClick={() => stopRef.current()} className="absolute top-2 right-2" style={{ background: `${T.bg2}cc`, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "4px" }}><X className="h-3.5 w-3.5" style={{ color: T.text }} /></button>}
      </div>
      {!running ? (
        <LiquidButton fullWidth onClick={start} disabled={disabled}><Camera className="h-4 w-4" /> Kamera starten</LiquidButton>
      ) : (
        <p className="text-[11px] text-center" style={{ color: T.muted }}>Richte den QR-Code auf die Kamera&hellip;</p>
      )}
      {err && <p className="text-xs mono" style={{ color: T.error }}>{err}</p>}
    </div>
  );
}

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Photo Scanner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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
      <LiquidButton fullWidth onClick={() => fileRef.current?.click()} disabled={disabled || busy}>
        <ImageIcon className="h-4 w-4" /> {busy ? "Lese Bild\u2026" : "Bild aus Galerie w\u00e4hlen"}
      </LiquidButton>
      <p className="text-[11px] text-center" style={{ color: T.muted }}>W\u00e4hle ein QR-Code-Foto aus deiner Galerie.</p>
      {err && <p className="text-xs mono" style={{ color: T.error }}>{err}</p>}
    </div>
  );
}
