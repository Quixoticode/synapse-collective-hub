import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Ban, RotateCcw, X, Zap, ChevronDown, ChevronRight, Trash2, Phone, MessageCircle } from "lucide-react";
import { securityOverview, banUser, unbanUser, revokeSession } from "@/lib/security.functions";
import { quickLoginIssue } from "@/lib/quick-login.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/security")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("syn.session.v1");
    if (!raw) throw redirect({ to: "/auth" });
    let s: { slid?: string; pik?: string; isSuperuser?: boolean };
    try { s = JSON.parse(raw); } catch { throw redirect({ to: "/auth" }); }
    if (!s?.slid || !s?.pik) throw redirect({ to: "/auth" });
    if (s.isSuperuser) return;
    const { myPermissions } = await import("@/lib/permissions.functions");
    const r = await myPermissions({ data: { slid: s.slid, pik: s.pik } }).catch(() => null);
    if (!r || (!r.isSuperuser && !r.features.includes("security.all"))) throw redirect({ to: "/apps" });
  },
  component: SecurityPage,
});

type Overview = {
  employees: { slid: string; name: string; hl: number; kind: string }[];
  events: { slid: string; ok: boolean; device_model: string | null; os: string | null; ip: string | null; created_at: string }[];
  sessions: { id: string; slid: string; device_fingerprint: string; device_model: string | null; os: string | null; ip: string | null; trusted: boolean; last_seen_at: string; expires_at: string | null }[];
  bans: { id: string; slid: string; message: string; expires_at: string | null; created_at: string }[];
};

function SecurityPage() {
  const overviewFn = useServerFn(securityOverview);
  const banFn = useServerFn(banUser);
  const unbanFn = useServerFn(unbanUser);
  const revokeFn = useServerFn(revokeSession);
  const quickIssueFn = useServerFn(quickLoginIssue);
  const session = typeof window !== "undefined" ? getSession() : null;

  const [ov, setOv] = useState<Overview | null>(null);
  const [banFor, setBanFor] = useState<string | null>(null);
  const [banMsg, setBanMsg] = useState("");
  const [banHours, setBanHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [quickCode, setQuickCode] = useState<{ slid: string; code: string; expires_at: string } | null>(null);

  // The route's beforeLoad already requires the "security.all" permission (or superuser)
  // to reach this page at all, so anyone here may issue quick-login codes for others.
  const canQuickLogin = true;

  async function reload() {
    const c = getCredentials(); if (!c) return;
    setOv(await overviewFn({ data: c }) as Overview);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const sessionsBySlid = useMemo(() => {
    const map = new Map<string, Overview["sessions"]>();
    if (!ov) return map;
    for (const s of ov.sessions) {
      if (!map.has(s.slid)) map.set(s.slid, []);
      map.get(s.slid)!.push(s);
    }
    return map;
  }, [ov]);

  const lastLoginBy = useMemo(() => {
    const map = new Map<string, string>();
    if (!ov) return map;
    for (const e of ov.events) if (e.ok && !map.has(e.slid)) map.set(e.slid, e.created_at);
    return map;
  }, [ov]);

  async function doBan() {
    if (!banFor || !banMsg.trim()) return;
    const c = getCredentials(); if (!c) return;
    setBusy(true);
    try { await banFn({ data: { ...c, target: banFor, message: banMsg.trim(), hours: banHours } }); setBanFor(null); setBanMsg(""); await reload(); }
    finally { setBusy(false); }
  }
  async function doUnban(slid: string) {
    const c = getCredentials(); if (!c) return;
    await unbanFn({ data: { ...c, target: slid } });
    await reload();
  }
  async function doRevoke(id: string) {
    if (!confirm("Gerät entfernen? Der Nutzer wird beim nächsten Reload ausgeloggt.")) return;
    const c = getCredentials(); if (!c) return;
    await revokeFn({ data: { ...c, session_id: id } });
    await reload();
  }
  async function issueQuick(slid: string) {
    const c = getCredentials(); if (!c) return;
    try {
      const r = await quickIssueFn({ data: { ...c, target_slid: slid } });
      setQuickCode({ slid, code: r.code, expires_at: r.expires_at });
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler."); }
  }

  function toggle(slid: string) {
    const next = new Set(expanded);
    if (next.has(slid)) next.delete(slid); else next.add(slid);
    setExpanded(next);
  }

  if (!ov) return <div className="p-6 text-sm text-muted-foreground">Lade Security…</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-32 md:pb-8 space-y-5">
      <header className="sticky top-14 md:top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 backdrop-blur bg-background/70 border-b border-border/50">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" style={{ color: "var(--neural-magenta)" }} /> Security
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Login-Historie · Geräte · Sperren · Quick-Login-Support.</p>
      </header>

      {ov.bans.length > 0 && (
        <section className="syn-card p-4 border-l-4" style={{ borderLeftColor: "var(--neural-magenta)" }}>
          <h2 className="font-semibold mb-3 text-sm flex items-center gap-2"><Ban className="h-4 w-4" /> Aktive Sperren ({ov.bans.length})</h2>
          <div className="space-y-2">
            {ov.bans.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-xs flex-wrap p-2 rounded-lg bg-rose-500/5">
                <span className="mono font-semibold">{b.slid}</span>
                <span className="flex-1 min-w-0">{b.message}</span>
                {b.expires_at && <span className="text-muted-foreground shrink-0">bis {new Date(b.expires_at).toLocaleString()}</span>}
                <button onClick={() => void doUnban(b.slid)} className="syn-btn-ghost text-xs"><RotateCcw className="h-3.5 w-3.5" /> Entsperren</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-sm px-1">Mitarbeiter · Geräte · Aktionen</h2>
        {ov.employees.map((e) => {
          const devices = sessionsBySlid.get(e.slid) ?? [];
          const last = lastLoginBy.get(e.slid);
          const isOpen = expanded.has(e.slid);
          return (
            <div key={e.slid} className="syn-card overflow-hidden">
              <button onClick={() => toggle(e.slid)} className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5">
                {isOpen ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mono text-xs font-semibold">{e.slid}</span>
                    <span className="text-sm font-medium truncate">{e.name}</span>
                    <span className="syn-chip text-[10px]">HL {e.hl}</span>
                    {devices.length > 0 && <span className="syn-chip text-[10px]">{devices.length} Gerät{devices.length > 1 ? "e" : ""}</span>}
                  </div>
                  <div className="text-[11px] mono text-muted-foreground mt-0.5">
                    Letzter Login: {last ? new Date(last).toLocaleString() : "—"}
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border/50 p-3 space-y-2">
                  {devices.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Keine registrierten Geräte.</div>
                  ) : devices.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{s.device_model || "Unbekanntes Gerät"}</div>
                        <div className="text-[11px] mono text-muted-foreground truncate">
                          {s.os || "?"} · {s.trusted ? "trusted" : "unbestätigt"} · zuletzt {new Date(s.last_seen_at).toLocaleString()}
                        </div>
                        {s.ip && <div className="text-[10px] mono text-muted-foreground">IP: {s.ip}</div>}
                      </div>
                      <button onClick={() => void doRevoke(s.id)} className="syn-btn-ghost text-xs shrink-0" title="Gerät entfernen (loggt Mitarbeiter aus)">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => { setBanFor(e.slid); setBanMsg(""); setBanHours(24); }} className="syn-btn-ghost text-xs">
                      <Ban className="h-3.5 w-3.5" /> Sperren
                    </button>
                    {canQuickLogin && e.slid !== session?.slid && (
                      <button onClick={() => void issueQuick(e.slid)} className="syn-btn-ghost text-xs" style={{ borderColor: "rgba(0,163,255,0.4)" }}>
                        <Zap className="h-3.5 w-3.5" /> Quick-Login-Code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="syn-card p-4">
        <h2 className="font-semibold mb-3 text-sm">Login-Historie</h2>
        <div className="space-y-1 text-[11px] mono max-h-80 overflow-y-auto">
          {ov.events.map((e, i) => (
            <div key={i} className={`flex gap-3 flex-wrap ${e.ok ? "text-muted-foreground" : "text-rose-300"}`}>
              <span className="w-40 shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              <span className="w-20 shrink-0">{e.slid}</span>
              <span className="w-10">{e.ok ? "OK" : "FAIL"}</span>
              <span className="truncate flex-1">{e.device_model} · {e.os}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="syn-card p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm"><Phone className="h-4 w-4" /> Support-Kontakt</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="tel:+491773374439" className="syn-btn-ghost"><Phone className="h-4 w-4" /> +49 177 3374439</a>
          <a href="https://wa.me/491773374439" target="_blank" rel="noreferrer" className="syn-btn-ghost"><MessageCircle className="h-4 w-4" style={{ color: "#25d366" }} /> WhatsApp</a>
        </div>
      </section>

      {banFor && (
        <Modal title={<>Sperren: <span className="mono">{banFor}</span></>} onClose={() => setBanFor(null)}>
          <textarea className="syn-input min-h-24" placeholder="Nachricht für gesperrte Person…" value={banMsg} onChange={(e) => setBanMsg(e.target.value)} />
          <div className="flex items-center gap-2">
            <label className="text-xs">Dauer (Std):</label>
            <input type="number" className="syn-input flex-1" value={banHours} min={1} max={720} onChange={(e) => setBanHours(Number(e.target.value))} />
          </div>
          <button onClick={() => void doBan()} disabled={busy || !banMsg.trim()} className="syn-btn w-full">
            <Ban className="h-4 w-4" /> Sperre aktivieren
          </button>
        </Modal>
      )}

      {quickCode && (
        <Modal title={<>Quick-Login für <span className="mono">{quickCode.slid}</span></>} onClose={() => setQuickCode(null)}>
          <div className="text-center space-y-2">
            <div className="text-[10px] mono uppercase text-muted-foreground">Einmal-Code (15 Min gültig)</div>
            <div className="text-4xl font-bold mono tracking-widest" style={{ color: "var(--synapse)" }}>{quickCode.code}</div>
            <div className="text-[11px] text-muted-foreground">Übergibt die Person diesen Code, kann sie sich auf <span className="mono">/auth</span> → „Quick" mit ihrer SLID einloggen.</div>
            <div className="text-[10px] text-muted-foreground mono">gültig bis {new Date(quickCode.expires_at).toLocaleTimeString()}</div>
          </div>
          <button onClick={() => setQuickCode(null)} className="syn-btn w-full">Fertig</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="syn-card syn-gradient-border w-full max-w-md p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
