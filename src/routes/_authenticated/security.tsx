import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Ban, RotateCcw, X } from "lucide-react";
import { securityOverview, banUser, unbanUser, revokeSession } from "@/lib/security.functions";
import { getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/security")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("syn.session.v1");
    if (!raw) throw redirect({ to: "/auth" });
    try { const s = JSON.parse(raw); if ((s?.hl ?? 0) < 4 && !s?.isSuperuser) throw redirect({ to: "/apps" }); }
    catch { throw redirect({ to: "/auth" }); }
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
  const [ov, setOv] = useState<Overview | null>(null);
  const [banFor, setBanFor] = useState<string | null>(null);
  const [banMsg, setBanMsg] = useState("");
  const [banHours, setBanHours] = useState(24);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    setOv(await overviewFn({ data: c }) as Overview);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

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
    const c = getCredentials(); if (!c) return;
    await revokeFn({ data: { ...c, session_id: id } });
    await reload();
  }

  if (!ov) return <div className="p-6 text-sm text-muted-foreground">Lade Security…</div>;

  const lastLoginBy = new Map<string, string>();
  for (const e of ov.events) if (e.ok && !lastLoginBy.has(e.slid)) lastLoginBy.set(e.slid, e.created_at);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto pb-28 md:pb-8 space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" style={{ color: "var(--neural-magenta)" }} /> Security
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Login-Historie · Geräte · Sperren.</p>
      </header>

      {ov.bans.length > 0 && (
        <section className="syn-card p-4">
          <h2 className="font-semibold mb-3 text-sm">Aktive Sperren ({ov.bans.length})</h2>
          <div className="space-y-2">
            {ov.bans.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-xs">
                <span className="mono">{b.slid}</span>
                <span className="flex-1 truncate">{b.message}</span>
                {b.expires_at && <span className="text-muted-foreground">bis {new Date(b.expires_at).toLocaleString()}</span>}
                <button onClick={() => void doUnban(b.slid)} className="syn-btn-ghost"><RotateCcw className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="syn-card p-4">
        <h2 className="font-semibold mb-3 text-sm">Mitarbeiter · Letzter Login</h2>
        <div className="grid gap-2">
          {ov.employees.map((e) => (
            <div key={e.slid} className="flex items-center gap-3 text-xs">
              <span className="mono w-24 shrink-0 truncate">{e.slid}</span>
              <span className="flex-1 truncate">{e.name}</span>
              <span className="text-muted-foreground">HL {e.hl}</span>
              <span className="text-muted-foreground w-40 shrink-0 text-right">
                {lastLoginBy.get(e.slid) ? new Date(lastLoginBy.get(e.slid)!).toLocaleString() : "—"}
              </span>
              <button onClick={() => { setBanFor(e.slid); setBanMsg(""); setBanHours(24); }} className="syn-btn-ghost text-xs">
                <Ban className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="syn-card p-4">
        <h2 className="font-semibold mb-3 text-sm">Aktive Geräte-Sessions ({ov.sessions.length})</h2>
        <div className="space-y-2 text-xs">
          {ov.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 flex-wrap">
              <span className="mono w-24 shrink-0">{s.slid}</span>
              <span className="flex-1 min-w-0 truncate">{s.device_model || "Unbekannt"} · {s.os || "?"}</span>
              {s.trusted && <span className="syn-chip">trusted</span>}
              <span className="text-muted-foreground">{new Date(s.last_seen_at).toLocaleString()}</span>
              <button onClick={() => void doRevoke(s.id)} className="syn-btn-ghost"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {ov.sessions.length === 0 && <div className="text-muted-foreground">Keine registrierten Geräte.</div>}
        </div>
      </section>

      <section className="syn-card p-4">
        <h2 className="font-semibold mb-3 text-sm">Login-Historie (letzte 200)</h2>
        <div className="space-y-1 text-[11px] mono max-h-80 overflow-y-auto">
          {ov.events.map((e, i) => (
            <div key={i} className={`flex gap-3 ${e.ok ? "text-muted-foreground" : "text-rose-300"}`}>
              <span className="w-40 shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              <span className="w-20 shrink-0">{e.slid}</span>
              <span>{e.ok ? "OK" : "FAIL"}</span>
              <span className="truncate">{e.device_model} · {e.os}</span>
            </div>
          ))}
        </div>
      </section>

      {banFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card syn-gradient-border w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sperren: <span className="mono">{banFor}</span></h3>
              <button onClick={() => setBanFor(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <textarea className="syn-input min-h-24" placeholder="Nachricht für gesperrte Person…" value={banMsg} onChange={(e) => setBanMsg(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="text-xs">Dauer (Std):</label>
              <input type="number" className="syn-input flex-1" value={banHours} min={1} max={720} onChange={(e) => setBanHours(Number(e.target.value))} />
            </div>
            <button onClick={() => void doBan()} disabled={busy || !banMsg.trim()} className="syn-btn w-full">
              <Ban className="h-4 w-4" /> Sperre aktivieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
