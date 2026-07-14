import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  KeyRound, ShieldCheck, Smartphone, Trash2, Plus, User,
  QrCode, Mail, Calendar, Building2, Fingerprint,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  xaBeginRegistration, xaFinishRegistration, xaListCredentials,
  xaDeleteCredential, xaUpdateProfile, xaMe, xaBeginPairing,
} from "@/lib/xsyna-account.functions";
import { getSession } from "@/lib/syn-session";
import { getXsynaSession, setXsynaSession } from "@/lib/xsyna-session";
import { useSync } from "@/lib/use-sync";
import { SyncSpinner } from "@/components/SyncSpinner";
import { LiquidButton, LiquidInput, TabBar, Spin, T } from "@/components/nl";

export const Route = createFileRoute("/_authenticated/account")({
  ssr: false,
  component: AccountPage,
});

type Credential = {
  id: string;
  device_label: string;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
  backup_state: boolean;
};

const TAB_LABELS = ["Profil", "Passkeys", "Zweites Gerät"];
const TAB_KEYS = ["profile", "security", "pair"] as const;

function tabIndex(tab: typeof TAB_KEYS[number]): number { return TAB_KEYS.indexOf(tab); }

/* ───────── page variants ───────── */
const pageAnim = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
  transition: { type: "spring", stiffness: 350, damping: 30 },
};

function NlCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "16px 20px" }}
    >
      {children}
    </div>
  );
}

function AccountPage() {
  const legacy = getSession();
  const xa = getXsynaSession();
  const beginReg = useServerFn(xaBeginRegistration);
  const finishReg = useServerFn(xaFinishRegistration);
  const listCreds = useServerFn(xaListCredentials);
  const delCred = useServerFn(xaDeleteCredential);
  const updateProfile = useServerFn(xaUpdateProfile);
  const me = useServerFn(xaMe);
  const beginPair = useServerFn(xaBeginPairing);
  const { run, syncing, error } = useSync();

  const [creds, setCreds] = useState<Credential[]>([]);
  const [profile, setProfile] = useState<{
    first_name?: string; last_name?: string; email?: string; birthdate?: string; company?: string;
  }>({});
  const [tab, setTab] = useState<typeof TAB_KEYS[number]>("profile");
  const [pairing, setPairing] = useState<{ code: string; expires_at: string } | null>(null);

  useEffect(() => {
    if (!xa) return;
    void run(async () => {
      const [c, m] = await Promise.all([
        listCreds({ data: { token: xa.token } }),
        me({ data: { token: xa.token } }),
      ]);
      setCreds(c as Credential[]);
      const p = (m as { profile: Record<string, string> | null }).profile ?? {};
      setProfile({
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        email: p.email ?? "",
        birthdate: p.birthdate ?? "",
        company: p.company ?? "",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addPasskey() {
    if (!legacy && !xa) return;
    await run(async () => {
      const options = await beginReg({ data: {
        slid: (xa?.slid ?? legacy?.slid) as string,
        pik: xa ? undefined : legacy?.pik,
        token: xa?.token,
        origin: window.location.origin,
      }});
      const response = await startRegistration({ optionsJSON: options as never });
      const session = await finishReg({ data: {
        slid: (xa?.slid ?? legacy?.slid) as string,
        pik: xa ? undefined : legacy?.pik,
        token: xa?.token,
        device_label: navigator.userAgent.slice(0, 60),
        origin: window.location.origin,
        response,
      }});
      setXsynaSession({
        slid: (xa?.slid ?? legacy?.slid) as string,
        token: (session as { token: string }).token,
        expires_at: (session as { expires_at: string }).expires_at,
      });
      const c = await listCreds({ data: { token: (session as { token: string }).token } });
      setCreds(c as Credential[]);
    });
  }

  async function removePasskey(id: string) {
    if (!xa) return;
    await run(async () => {
      await delCred({ data: { token: xa.token, id } });
      const c = await listCreds({ data: { token: xa.token } });
      setCreds(c as Credential[]);
    });
  }

  async function saveProfile() {
    if (!xa) return;
    await run(updateProfile({ data: { token: xa.token, ...profile, birthdate: profile.birthdate || null } }));
  }

  async function startPairing() {
    if (!legacy && !xa) return;
    await run(async () => {
      const p = await beginPair({ data: {
        slid: (xa?.slid ?? legacy?.slid) as string,
        pik: xa ? undefined : legacy?.pik,
        token: xa?.token,
      }});
      setPairing(p as { code: string; expires_at: string });
    });
  }

  if (!legacy && !xa) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: T.muted }}>
        Nicht angemeldet.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{ background: `linear-gradient(135deg, ${T.primary}18, ${T.accent}12)` }}
        >
          <User className="h-6 w-6" style={{ color: T.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: T.text }}>xSyna Account</h1>
          <p className="text-xs" style={{ color: T.muted }}>Profil, Passkeys und Geräte</p>
        </div>
        {syncing && <SyncSpinner inline />}
      </div>

      {/* TabBar */}
      <TabBar
        tabs={TAB_LABELS}
        defaultActive={tabIndex(tab)}
        onChange={(i) => setTab(TAB_KEYS[i])}
      />

      {error && (
        <div className="text-xs mono p-2 rounded-xl" style={{ color: T.error, background: `${T.error}12`, border: `1px solid ${T.error}30` }}>
          {error}
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "profile" && (
          <motion.div key="profile" {...pageAnim}>
            <NlCard className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LiquidInput
                  label="Vorname"
                  value={profile.first_name || ""}
                  onChange={(v) => setProfile((p) => ({ ...p, first_name: v }))}
                  icon={User}
                />
                <LiquidInput
                  label="Nachname"
                  value={profile.last_name || ""}
                  onChange={(v) => setProfile((p) => ({ ...p, last_name: v }))}
                  icon={User}
                />
              </div>
              <LiquidInput
                label="E-Mail"
                type="email"
                value={profile.email || ""}
                onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                icon={Mail}
              />
              <div className="grid grid-cols-2 gap-3">
                <LiquidInput
                  label="Geburtsdatum"
                  type="date"
                  value={profile.birthdate || ""}
                  onChange={(v) => setProfile((p) => ({ ...p, birthdate: v }))}
                  icon={Calendar}
                />
                <LiquidInput
                  label="Firma"
                  value={profile.company || ""}
                  onChange={(v) => setProfile((p) => ({ ...p, company: v }))}
                  icon={Building2}
                />
              </div>
              <LiquidButton fullWidth onClick={() => void saveProfile()} disabled={syncing}>
                {syncing ? <Spin size={16} color={T.bg} /> : null}
                Speichern
              </LiquidButton>
            </NlCard>
          </motion.div>
        )}

        {tab === "security" && (
          <motion.div key="security" {...pageAnim} className="space-y-3">
            {/* Add Passkey */}
            <NlCard>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: T.success }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm" style={{ color: T.text }}>Passkey hinzufügen</div>
                  <div className="text-xs" style={{ color: T.muted }}>FaceID, TouchID, Windows Hello oder Sicherheitsschlüssel.</div>
                </div>
                <LiquidButton onClick={() => void addPasskey()} disabled={syncing} size="sm">
                  <Plus className="h-4 w-4" /> Neuer Passkey
                </LiquidButton>
              </div>
            </NlCard>

            {/* Passkey List */}
            <NlCard className="space-y-3">
              <div className="text-xs mono uppercase" style={{ color: T.muted, letterSpacing: "0.08em" }}>
                Registrierte Passkeys ({creds.length})
              </div>
              {creds.length === 0 && (
                <div className="text-sm" style={{ color: T.muted }}>
                  Noch keine Passkeys. Ohne Passkey nutzt du weiterhin PIK — bitte lege einen an.
                </div>
              )}
              <div className="space-y-2">
                <AnimatePresence>
                  {creds.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}
                    >
                      <Smartphone className="h-5 w-5 shrink-0" style={{ color: T.primary }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate" style={{ color: T.text }}>{c.device_label}</div>
                        <div className="text-[11px] mono" style={{ color: T.muted }}>
                          {new Date(c.created_at).toLocaleDateString()}
                          {c.last_used_at ? ` · zuletzt ${new Date(c.last_used_at).toLocaleDateString()}` : " · noch nicht benutzt"}
                          {c.backup_state ? " · Cloud-Sync" : ""}
                        </div>
                      </div>
                      <LiquidButton variant="danger" size="xs" onClick={() => void removePasskey(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </LiquidButton>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </NlCard>
          </motion.div>
        )}

        {tab === "pair" && (
          <motion.div key="pair" {...pageAnim}>
            <NlCard className="space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 shrink-0" style={{ color: T.accent }} />
                <div>
                  <div className="font-semibold text-sm" style={{ color: T.text }}>Passkey über zweites Gerät</div>
                  <div className="text-xs" style={{ color: T.muted }}>
                    Erhalte einen 8-stelligen Code, den du auf dem anderen Gerät unter <span className="mono">/auth</span> → "Passkey via Code" eingibst.
                  </div>
                </div>
              </div>
              {!pairing ? (
                <LiquidButton fullWidth onClick={() => void startPairing()} disabled={syncing}>
                  <KeyRound className="h-4 w-4" /> Code erzeugen
                </LiquidButton>
              ) : (
                <div className="text-center space-y-3">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="text-4xl font-bold mono tracking-widest"
                    style={{ color: T.primary, textShadow: `0 0 24px ${T.primary}40` }}
                  >
                    {pairing.code}
                  </motion.div>
                  <div className="text-xs" style={{ color: T.muted }}>
                    Gültig bis {new Date(pairing.expires_at).toLocaleTimeString()}. Öffne auf dem zweiten Gerät <span className="mono">/auth</span> und wähle "Passkey per Code".
                  </div>
                  <LiquidButton variant="ghost" onClick={() => setPairing(null)}>
                    Neuen Code erzeugen
                  </LiquidButton>
                </div>
              )}
            </NlCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-[11px] text-center" style={{ color: T.muted }}>
        Passkeys sind an die Domain <span className="mono">{typeof window !== "undefined" ? window.location.hostname : ""}</span> gebunden. Beim Umzug auf <span className="mono">pass.xSyna.de</span> müssen neue Passkeys registriert werden.
      </div>
    </div>
  );
}
