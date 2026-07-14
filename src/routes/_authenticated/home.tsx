import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckSquare, Calendar as CalIcon, Newspaper, Clock, ArrowRight, Play, StopCircle, Zap } from "lucide-react";
import { getSession, getCredentials, type SynSession } from "@/lib/syn-session";
import { tasksList } from "@/lib/tasks.functions";
import { calList } from "@/lib/calendar.functions";
import { roadmapList } from "@/lib/versions.functions";
import { wtShiftsList, wtSessionActive, wtSessionStart, wtSessionStop } from "@/lib/worktime.functions";
import { quickLoginIssue } from "@/lib/quick-login.functions";
import { XsynaAccountCard } from "@/components/XsynaAccountCard";

export const Route = createFileRoute("/_authenticated/home")({
  ssr: false,
  component: HomePage,
});

type Task = { id: string; title: string; status: string; priority: string; due_at: string | null; assignee_slid: string };
type Event = { id: string; title: string; starts_at: string; ends_at: string; location: string | null };
type Roadmap = { id: string; title: string; status: string; description: string | null; sort_order?: number };
type Shift = { id: string; slid: string; starts_at: string; ends_at: string; note: string | null };
type Session = { id: string; started_at: string; status: string };

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });
}
function elapsed(from: string) {
  const s = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function HomePage() {
  const [session, setSession] = useState<SynSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  const tFn = useServerFn(tasksList);
  const cFn = useServerFn(calList);
  const rFn = useServerFn(roadmapList);
  const sFn = useServerFn(wtShiftsList);
  const aFn = useServerFn(wtSessionActive);
  const startFn = useServerFn(wtSessionStart);
  const stopFn = useServerFn(wtSessionStop);

  async function load() {
    const s = getSession(); setSession(s);
    const c = getCredentials(); if (!c) { setLoaded(true); return; }
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 3600_000);
    try {
      const [tk, ev, rm, sh, ac] = await Promise.all([
        tFn({ data: c }) as Promise<Task[]>,
        cFn({ data: { ...c, from: now.toISOString(), to: in7.toISOString() } }) as Promise<Event[]>,
        rFn({ data: c }) as Promise<Roadmap[]>,
        sFn({ data: { ...c, from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), to: in7.toISOString(), slid_filter: s?.slid } }) as Promise<Shift[]>,
        aFn({ data: c }) as Promise<Session | null>,
      ]);
      setTasks(tk.filter((x) => x.status !== "done" && x.assignee_slid === s?.slid).slice(0, 5));
      setEvents(ev.slice(0, 5));
      setRoadmap(rm.filter((x) => x.status !== "done" && x.status !== "shipped").slice(0, 3));
      setShifts(sh);
      setActive(ac);
    } catch { /* tolerate */ }
    setLoaded(true);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick;

  async function toggleTimer() {
    const c = getCredentials(); if (!c) return;
    if (active) { await stopFn({ data: { ...c, id: active.id } }); }
    else { await startFn({ data: { ...c } }); }
    await load();
  }

  if (!session) return null;
  const today = new Date();
  const todayShifts = shifts.filter((s) => new Date(s.starts_at).toDateString() === today.toDateString());

  return (
    <div className={`p-4 sm:p-6 max-w-4xl mx-auto pb-28 md:pb-8 space-y-4 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
      {/* Account Card */}
      <div className={`transition-all duration-500 ${loaded ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
        <XsynaAccountCard data={{ ...session, roles: [] }} />
      </div>

      {/* Quick Login */}
      <div className={`transition-all duration-500 delay-100 ${loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <QuickLoginShortcut slid={session.slid} />
      </div>

      {/* WorkTime */}
      <div className={`transition-all duration-500 delay-200 ${loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <section className="syn-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" style={{ color: "var(--synapse)" }} />
            <h2 className="font-semibold text-sm">Arbeitszeit heute</h2>
            <Link to="/worktime" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors">Zeitkalender <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          {todayShifts.length > 0 ? (
            <div className="text-xs space-y-1 mb-3">
              {todayShifts.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 transition-all hover:bg-white/[0.08]">
                  <span className="mono">{fmtTime(s.starts_at)} – {fmtTime(s.ends_at)}</span>
                  {s.note && <span className="text-muted-foreground truncate">· {s.note}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mb-3">Heute keine Schicht geplant.</div>
          )}
          <div className="flex items-center gap-3">
            {active ? (
              <>
                <div className="flex-1">
                  <div className="text-[10px] uppercase mono text-muted-foreground">Timer aktiv</div>
                  <div className="text-lg mono font-semibold" style={{ color: "var(--neural-mint)" }}>{elapsed(active.started_at)}</div>
                </div>
                <button onClick={() => void toggleTimer()} className="syn-btn"><StopCircle className="h-4 w-4" /> Stop</button>
              </>
            ) : (
              <button onClick={() => void toggleTimer()} className="syn-btn w-full"><Play className="h-4 w-4" /> Arbeit starten</button>
            )}
          </div>
        </section>
      </div>

      {/* Tasks */}
      <div className={`transition-all duration-500 delay-300 ${loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <section className="syn-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-4 w-4" style={{ color: "var(--neural-mint)" }} />
            <h2 className="font-semibold text-sm">Meine Aufgaben</h2>
            <Link to="/tasks" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors">Alle <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-xs text-muted-foreground">Keine offenen Aufgaben.</div>
          ) : (
            <div className="space-y-1">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs transition-all hover:bg-white/[0.08] hover:translate-x-0.5">
                  <span className={`h-2 w-2 rounded-full ${t.priority === "urgent" ? "bg-rose-400" : t.priority === "high" ? "bg-amber-400" : "bg-cyan-400"}`} />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.due_at && <span className="text-[10px] mono text-muted-foreground shrink-0">{fmtDate(t.due_at)}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Events */}
      <div className={`transition-all duration-500 delay-400 ${loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <section className="syn-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalIcon className="h-4 w-4" style={{ color: "var(--synapse)" }} />
            <h2 className="font-semibold text-sm">Nächste Termine</h2>
            <Link to="/calendar" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors">Kalender <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          {events.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nichts geplant.</div>
          ) : (
            <div className="space-y-1">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs transition-all hover:bg-white/[0.08] hover:translate-x-0.5">
                  <span className="mono text-muted-foreground shrink-0 w-24">{fmtDate(e.starts_at)} {fmtTime(e.starts_at)}</span>
                  <span className="flex-1 truncate">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <div className={`transition-all duration-500 delay-500 ${loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <section className="syn-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Newspaper className="h-4 w-4" style={{ color: "var(--neural-plum)" }} />
              <h2 className="font-semibold text-sm">Wichtig auf der Roadmap</h2>
              <Link to="/news" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors">News <ArrowRight className="inline h-3 w-3" /></Link>
            </div>
            <div className="space-y-1">
              {roadmap.map((r) => (
                <div key={r.id} className="p-2 rounded-lg bg-white/5 text-xs transition-all hover:bg-white/[0.08]">
                  <div className="font-medium truncate">{r.title}</div>
                  {r.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function QuickLoginShortcut({ slid }: { slid: string }) {
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const issueFn = useServerFn(quickLoginIssue);
  async function issue() {
    const c = getCredentials(); if (!c) return;
    setBusy(true);
    try { setCode(await issueFn({ data: { ...c, target_slid: slid } })); }
    catch (e) { alert(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }
  return (
    <section className="syn-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4" style={{ color: "var(--neural-amber)" }} />
        <h2 className="font-semibold text-sm">Mein Quick-Login</h2>
        <span className="ml-auto text-[10px] text-muted-foreground mono">6-stelliger Einmal-Code · 15 Min</span>
      </div>
      {!code ? (
        <button onClick={() => void issue()} disabled={busy} className="syn-btn w-full"><Zap className="h-4 w-4" /> Code auf Zweitgerät nutzen</button>
      ) : (
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold mono tracking-[0.3em]" style={{ color: "var(--synapse)" }}>{code.code}</div>
          <div className="text-[11px] text-muted-foreground">Gültig bis {new Date(code.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      )}
    </section>
  );
}
