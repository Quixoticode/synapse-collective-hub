import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, Smartphone, Trash2, Plus, User, QrCode } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { xaBeginRegistration, xaFinishRegistration, xaListCredentials, xaDeleteCredential, xaUpdateProfile, xaMe, xaBeginPairing } from "@/lib/xsyna-account.functions";
import { getSession } from "@/lib/syn-session";
import { getXsynaSession, setXsynaSession } from "@/lib/xsyna-session";
import { useSync } from "@/lib/use-sync";
import { SyncSpinner } from "@/components/SyncSpinner";

export const Route = createFileRoute("/_authenticated/account")({
  ssr: false,
  component: AccountPage,
});

type Credential = { id: string; device_label: string; transports: string[]; created_at: string; last_used_at: string | null; backup_state: boolean };

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
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string; birthdate?: string; company?: string }>({});
  const [tab, setTab] = useState<"profile" | "security" | "pair">("profile");
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
        first_name: p.first_name ?? "", last_name: p.last_name ?? "",
        email: p.email ?? "", birthdate: p.birthdate ?? "", company: p.company ?? "",
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
    return <div className="p-6 text-center text-sm text-muted-foreground">Nicht angemeldet.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--gradient-neural-soft)" }}>
          <User className="h-6 w-6" style={{ color: "var(--synapse)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold truncate">xSyna Account</h1>
          <p className="text-xs text-muted-foreground">Profil, Passkeys und Geräte</p>
        </div>
        <SyncSpinner active={syncing} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {(["profile","security","pair"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-2xl text-xs ${tab === t ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
            {t === "profile" ? "Profil" : t === "security" ? "Passkeys" : "Zweites Gerät"}
          </button>
        ))}
      </div>

      {error && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{error}</div>}

      {tab === "profile" && (
        <div className="syn-card p-4 sm:p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vorname" value={profile.first_name || ""} onChange={(v) => setProfile((p) => ({ ...p, first_name: v }))} />
            <Field label="Nachname" value={profile.last_name || ""} onChange={(v) => setProfile((p) => ({ ...p, last_name: v }))} />
          </div>
          <Field label="E-Mail" type="email" value={profile.email || ""} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Geburtsdatum" type="date" value={profile.birthdate || ""} onChange={(v) => setProfile((p) => ({ ...p, birthdate: v }))} />
            <Field label="Firma" value={profile.company || ""} onChange={(v) => setProfile((p) => ({ ...p, company: v }))} />
          </div>
          <button onClick={() => void saveProfile()} disabled={syncing} className="syn-btn w-full">Speichern</button>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-3">
          <div className="syn-card p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" style={{ color: "var(--neural-mint)" }} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Passkey hinzufügen</div>
                <div className="text-xs text-muted-foreground">FaceID, TouchID, Windows Hello oder Sicherheitsschlüssel.</div>
              </div>
              <button onClick={() => void addPasskey()} disabled={syncing} className="syn-btn shrink-0"><Plus className="h-4 w-4" />Neuer Passkey</button>
            </div>
          </div>
          <div className="syn-card p-4 sm:p-6 space-y-3">
            <div className="text-xs text-muted-foreground mono uppercase tracking-wider">Registrierte Passkeys ({creds.length})</div>
            {creds.length === 0 && <div className="text-sm text-muted-foreground">Noch keine Passkeys. Ohne Passkey nutzt du weiterhin PIK — bitte lege einen an.</div>}
            {creds.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                <Smartphone className="h-5 w-5 shrink-0" style={{ color: "var(--synapse)" }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.device_label}</div>
                  <div className="text-[11px] text-muted-foreground mono">
                    {new Date(c.created_at).toLocaleDateString()}
                    {c.last_used_at ? ` · zuletzt ${new Date(c.last_used_at).toLocaleDateString()}` : " · noch nicht benutzt"}
                    {c.backup_state ? " · Cloud-Sync" : ""}
                  </div>
                </div>
                <button onClick={() => void removePasskey(c.id)} className="syn-btn-ghost shrink-0" title="Entfernen"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pair" && (
        <div className="syn-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5" style={{ color: "var(--neural-violet)" }} />
            <div>
              <div className="font-semibold">Passkey über zweites Gerät</div>
              <div className="text-xs text-muted-foreground">Erhalte einen 8-stelligen Code, den du auf dem anderen Gerät unter <span className="mono">/auth</span> → „Passkey via Code" eingibst.</div>
            </div>
          </div>
          {!pairing ? (
            <button onClick={() => void startPairing()} disabled={syncing} className="syn-btn w-full"><KeyRound className="h-4 w-4" />Code erzeugen</button>
          ) : (
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold mono tracking-widest">{pairing.code}</div>
              <div className="text-xs text-muted-foreground">Gültig bis {new Date(pairing.expires_at).toLocaleTimeString()}. Öffne auf dem zweiten Gerät <span className="mono">/auth</span> und wähle „Passkey per Code".</div>
              <button onClick={() => setPairing(null)} className="syn-btn-ghost">Neuen Code erzeugen</button>
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground text-center">
        Passkeys sind an die Domain <span className="mono">{typeof window !== "undefined" ? window.location.hostname : ""}</span> gebunden. Beim Umzug auf <span className="mono">pass.xSyna.de</span> müssen neue Passkeys registriert werden.
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">{label}</span>
      <input className="syn-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
