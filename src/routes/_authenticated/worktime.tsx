import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Clock, ArrowLeft, Plus, Play, StopCircle, Zap, X, Trash2 } from "lucide-react";
import { getSession, getCredentials } from "@/lib/syn-session";
import { wtShiftsList, wtShiftUpsert, wtShiftDelete, wtSessionsList, wtSessionActive, wtSessionStart, wtSessionStop, wtSessionPing, wtSessionUpsert, wtSessionAdminDelete } from "@/lib/worktime.functions";
import { employeesList } from "@/lib/syn.functions";
import { myPermissions } from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/worktime")({
  ssr: false,
  component: WorkTimePage,
});

type Shift = { id: string; slid: string; starts_at: string; ends_at: string; note: string | null };
type Session = { id: string; slid: string; started_at: string; ended_at: string | null; status: string; invalidated_reason: string | null };
type Emp = { slid: string; name: string; hl: number };

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) { return new Date(v).toISOString(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });
}
function elapsed(from: string, to?: string | null) {
  const end = to ? new Date(to).getTime() : Date.now();
  const s = Math.max(0, Math.floor((end - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function WorkTimePage() {
  const session = getSession();
  const shiftsFn = useServerFn(wtShiftsList);
  const shiftUpsertFn = useServerFn(wtShiftUpsert);
  const shiftDelFn = useServerFn(wtShiftDelete);
  const sessionsFn = useServerFn(wtSessionsList);
  const activeFn = useServerFn(wtSessionActive);
  const startFn = useServerFn(wtSessionStart);
  const stopFn = useServerFn(wtSessionStop);
  const pingFn = useServerFn(wtSessionPing);
  const empsFn = useServerFn(employeesList);
  const sessionUpsertFn = useServerFn(wtSessionUpsert);
  const sessionAdminDelFn = useServerFn(wtSessionAdminDelete);
  const permsFn = useServerFn(myPermissions);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session | null>(null);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [edit, setEdit] = useState<Partial<Shift> & { target_slid?: string } | null>(null);
  const [editSession, setEditSession] = useState<Partial<Session> & { target_slid?: string } | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const canManage = !!session?.isSuperuser || allowedFeatures.has("worktime.manage");
  const canDeleteShift = canManage;

  async function load() {
    const c = getCredentials(); if (!c) return;
    setErr(null);
    try {
      const feats = await permsFn({ data: c }) as { features: string[] };
      const allowed = new Set(feats.features);
      setAllowedFeatures(allowed);
      const manage = !!session?.isSuperuser || allowed.has("worktime.manage");
      const now = new Date();
      const from = new Date(now); from.setDate(now.getDate() - 7); from.setHours(0,0,0,0);
      const to = new Date(now); to.setDate(now.getDate() + 14); to.setHours(23,59,59,999);
      const filter = manage && showAllUsers ? null : session?.slid;
      const [sh, se, ac] = await Promise.all([
        shiftsFn({ data: { ...c, from: from.toISOString(), to: to.toISOString(), slid_filter: filter } }) as Promise<Shift[]>,
        sessionsFn({ data: { ...c, from: from.toISOString(), to: to.toISOString(), slid_filter: filter } }) as Promise<Session[]>,
        activeFn({ data: c }) as Promise<Session | null>,
      ]);
      setShifts(sh); setSessions(se); setActive(ac);
      if (manage) {
        try { setEmps(await empsFn({ data: c }) as Emp[]); } catch { /* ignore */ }
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [showAllUsers]);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Group by day (last 7 + next 14)
  const days = useMemo(() => {
    const arr: { key: string; date: Date; shifts: Shift[]; sessions: Session[] }[] = [];
    const now = new Date();
    for (let i = -7; i <= 14; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0,0,0,0);
      const key = d.toDateString();
      arr.push({
        key, date: d,
        shifts: shifts.filter((s) => new Date(s.starts_at).toDateString() === key),
        sessions: sessions.filter((s) => new Date(s.started_at).toDateString() === key),
      });
    }
    return arr.filter((d) => d.shifts.length > 0 || d.sessions.length > 0 || d.key === now.toDateString());
  }, [shifts, sessions]);

  async function toggleTimer() {
    const c = getCredentials(); if (!c) return;
    if (active) await stopFn({ data: { ...c, id: active.id } });
    else await startFn({ data: { ...c } });
    await load();
  }
  async function manualPing() {
    const c = getCredentials(); if (!c || !active) return;
    await pingFn({ data: { ...c, id: active.id } });
  }

  async function saveShift() {
    if (!edit?.starts_at || !edit.ends_at || !edit.target_slid) return;
    const c = getCredentials(); if (!c) return;
    try {
      await shiftUpsertFn({ data: {
        ...c, id: edit.id, target_slid: edit.target_slid,
        starts_at: edit.starts_at, ends_at: edit.ends_at, note: edit.note || null,
      } });
      setEdit(null); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  async function saveSession() {
    if (!editSession?.started_at || !editSession.target_slid) return;
    const c = getCredentials(); if (!c) return;
    try {
      await sessionUpsertFn({ data: {
        ...c, id: editSession.id, target_slid: editSession.target_slid,
        started_at: editSession.started_at, ended_at: editSession.ended_at ?? null,
        status: (editSession.status as "active" | "completed" | "invalidated") || "completed",
        invalidated_reason: editSession.invalidated_reason ?? null,
      } });
      setEditSession(null); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  async function deleteSession(id: string) {
    if (!confirm("Session löschen? (Nur Admin)")) return;
    const c = getCredentials(); if (!c) return;
    try {
      await sessionAdminDelFn({ data: { ...c, id } });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 md:pb-8 space-y-4">
      <header className="flex items-center gap-3">
        <Clock className="h-6 w-6" style={{ color: "var(--synapse)" }} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">WorkTime</h1>
          <p className="text-xs text-muted-foreground">Geplante & gemeldete Arbeitszeit</p>
        </div>
        <Link to="/apps" className="syn-btn-ghost text-xs shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Apps</Link>
      </header>

      {/* Timer */}
      <section className="syn-card p-4 space-y-2">
        <div className="flex items-center gap-3">
          {active ? (
            <>
              <div className="flex-1">
                <div className="text-[10px] uppercase mono text-muted-foreground">Timer aktiv</div>
                <div className="text-2xl mono font-semibold" style={{ color: "var(--neural-mint)" }}>{elapsed(active.started_at)}</div>
              </div>
              <button onClick={() => void manualPing()} className="syn-btn-ghost text-xs"><Zap className="h-3.5 w-3.5" /> Ich bin da</button>
              <button onClick={() => void toggleTimer()} className="syn-btn"><StopCircle className="h-4 w-4" /> Stop</button>
            </>
          ) : (
            <button onClick={() => void toggleTimer()} className="syn-btn w-full"><Play className="h-4 w-4" /> Arbeit starten</button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Der Timer läuft nur, solange die App im Vordergrund ist. Bei Inaktivität erscheint eine kurze Bestätigungs-Anfrage.
        </p>
      </section>

      {canManage && (
        <section className="syn-card p-3 flex flex-wrap items-center gap-2">
          <button onClick={() => setEdit({ target_slid: session?.slid, starts_at: new Date().toISOString(), ends_at: new Date(Date.now()+4*3600_000).toISOString() })} className="syn-btn text-xs">
            <Plus className="h-3.5 w-3.5" /> Schicht planen
          </button>
          <button onClick={() => setEditSession({ target_slid: session?.slid, started_at: new Date().toISOString(), ended_at: new Date().toISOString(), status: "completed" })} className="syn-btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> Session erfassen
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input type="checkbox" checked={showAllUsers} onChange={(e) => setShowAllUsers(e.target.checked)} />
            Alle Mitarbeiter anzeigen
          </label>
        </section>
      )}

      {err && <div className="text-xs text-destructive mono">{err}</div>}

      {/* Zeitkalender */}
      <section className="space-y-2">
        {days.map((d) => (
          <div key={d.key} className="syn-card p-3">
            <div className="text-xs mono uppercase text-muted-foreground mb-2">{fmtDate(d.date.toISOString())}</div>
            {d.shifts.length === 0 && d.sessions.length === 0 && (
              <div className="text-[11px] text-muted-foreground">— nichts —</div>
            )}
            {d.shifts.map((s) => {
              const covered = d.sessions.some((se) =>
                se.slid === s.slid && se.status === "completed" &&
                new Date(se.started_at) <= new Date(s.ends_at) &&
                new Date(se.ended_at ?? Date.now()) >= new Date(s.starts_at),
              );
              const past = new Date(s.ends_at) < new Date();
              return (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg mb-1 text-xs"
                     style={{ background: covered ? "rgba(52,211,153,0.15)" : past ? "rgba(244,63,94,0.15)" : "rgba(56,189,248,0.15)" }}>
                  <span className="mono w-32 shrink-0">{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}</span>
                  <span className="mono text-[10px] text-muted-foreground shrink-0">{s.slid}</span>
                  <span className="flex-1 truncate">{s.note || "Schicht"}</span>
                  <span className="text-[10px] shrink-0">
                    {covered ? "erledigt" : past ? "nicht gemeldet" : "geplant"}
                  </span>
                  {canManage && (
                    <button onClick={() => setEdit({ ...s, target_slid: s.slid })} className="syn-btn-ghost text-[10px]">Edit</button>
                  )}
                  {canDeleteShift && (
                    <button onClick={async () => { const c = getCredentials(); if (!c) return; if (!confirm("Schicht löschen? (Nur Admin)")) return; try { await shiftDelFn({ data: { ...c, id: s.id } }); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); } }} className="syn-btn-ghost text-[10px]"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
              );
            })}
            {d.sessions.map((se) => (
              <div key={se.id} className="flex items-center gap-2 p-2 rounded-lg mb-1 text-xs"
                   style={{ background: se.status === "completed" ? "rgba(52,211,153,0.08)" : se.status === "invalidated" ? "rgba(245,158,11,0.15)" : "rgba(56,189,248,0.15)" }}>
                <span className="mono w-32 shrink-0">{fmtTime(se.started_at)} – {se.ended_at ? fmtTime(se.ended_at) : "…"}</span>
                <span className="mono text-[10px] text-muted-foreground shrink-0">{se.slid}</span>
                <span className="flex-1 truncate">
                  Session · {elapsed(se.started_at, se.ended_at)}
                  {se.invalidated_reason && <span className="text-amber-400"> · {se.invalidated_reason}</span>}
                </span>
                <span className="text-[10px] shrink-0">{se.status}</span>
                {canManage && (
                  <>
                    <button onClick={() => setEditSession({ ...se, target_slid: se.slid })} className="syn-btn-ghost text-[10px]">Edit</button>
                    <button onClick={() => void deleteSession(se.id)} className="syn-btn-ghost text-[10px]"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="syn-card w-full max-w-md p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{edit.id ? "Schicht bearbeiten" : "Schicht planen"}</h3><button onClick={() => setEdit(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button></div>
            <select className="syn-input" value={edit.target_slid || ""} onChange={(e) => setEdit({ ...edit, target_slid: e.target.value })}>
              <option value="">— Mitarbeiter wählen —</option>
              {emps.map((e) => <option key={e.slid} value={e.slid}>{e.name} ({e.slid})</option>)}
            </select>
            <label className="text-xs">Start
              <input type="datetime-local" className="syn-input"
                value={edit.starts_at ? toLocalInput(edit.starts_at) : ""}
                onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} />
            </label>
            <label className="text-xs">Ende
              <input type="datetime-local" className="syn-input"
                value={edit.ends_at ? toLocalInput(edit.ends_at) : ""}
                onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} />
            </label>
            <input className="syn-input" placeholder="Notiz (optional)" value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
            <button className="syn-btn w-full" onClick={() => void saveShift()}>Speichern</button>
          </div>
        </div>
      )}

      {editSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="syn-card w-full max-w-md p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{editSession.id ? "Session bearbeiten" : "Session manuell erfassen"}</h3><button onClick={() => setEditSession(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button></div>
            <select className="syn-input" value={editSession.target_slid || ""} onChange={(e) => setEditSession({ ...editSession, target_slid: e.target.value })}>
              <option value="">— Mitarbeiter wählen —</option>
              {emps.map((e) => <option key={e.slid} value={e.slid}>{e.name} ({e.slid})</option>)}
            </select>
            <label className="text-xs">Start
              <input type="datetime-local" className="syn-input"
                value={editSession.started_at ? toLocalInput(editSession.started_at) : ""}
                onChange={(e) => setEditSession({ ...editSession, started_at: fromLocalInput(e.target.value) })} />
            </label>
            <label className="text-xs">Ende (leer = noch aktiv)
              <input type="datetime-local" className="syn-input"
                value={editSession.ended_at ? toLocalInput(editSession.ended_at) : ""}
                onChange={(e) => setEditSession({ ...editSession, ended_at: e.target.value ? fromLocalInput(e.target.value) : null })} />
            </label>
            <label className="text-xs">Status
              <select className="syn-input" value={editSession.status || "completed"}
                onChange={(e) => setEditSession({ ...editSession, status: e.target.value })}>
                <option value="active">Aktiv</option>
                <option value="completed">Abgeschlossen</option>
                <option value="invalidated">Ungültig</option>
              </select>
            </label>
            {editSession.status === "invalidated" && (
              <input className="syn-input" placeholder="Grund" value={editSession.invalidated_reason || ""} onChange={(e) => setEditSession({ ...editSession, invalidated_reason: e.target.value })} />
            )}
            <button className="syn-btn w-full" onClick={() => void saveSession()}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}
