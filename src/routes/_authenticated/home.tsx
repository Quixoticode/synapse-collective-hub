import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckSquare, Calendar as CalIcon, Newspaper, Clock, ArrowRight, Play, StopCircle } from "lucide-react";
import { getSession, getCredentials, type SynSession } from "@/lib/syn-session";
import { tasksList } from "@/lib/tasks.functions";
import { calList } from "@/lib/calendar.functions";
import { roadmapList } from "@/lib/versions.functions";
import { wtShiftsList, wtSessionActive, wtSessionStart, wtSessionStop } from "@/lib/worktime.functions";
import { SynIDCard } from "@/components/SynIDCard";

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
    const c = getCredentials(); if (!c) return;
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
      setRoadmap(rm.filter((x) => (x.priority === "high" || x.priority === "important") && x.status !== "done").slice(0, 3));
      setShifts(sh);
      setActive(ac);
    } catch { /* tolerate */ }
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-28 md:pb-8 space-y-4">
      <SynIDCard data={session} />

      {/* WorkTime widget */}
      <section className="syn-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4" style={{ color: "var(--synapse)" }} />
          <h2 className="font-semibold text-sm">Arbeitszeit heute</h2>
          <Link to="/worktime" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">Zeitkalender <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {todayShifts.length > 0 ? (
          <div className="text-xs space-y-1 mb-3">
            {todayShifts.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
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

      {/* Tasks */}
      <section className="syn-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="h-4 w-4" style={{ color: "var(--neural-mint)" }} />
          <h2 className="font-semibold text-sm">Meine Aufgaben</h2>
          <Link to="/tasks" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">Alle <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {tasks.length === 0 ? (
          <div className="text-xs text-muted-foreground">Keine offenen Aufgaben.</div>
        ) : (
          <div className="space-y-1">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs">
                <span className={`h-2 w-2 rounded-full ${t.priority === "urgent" ? "bg-rose-400" : t.priority === "high" ? "bg-amber-400" : "bg-cyan-400"}`} />
                <span className="flex-1 truncate">{t.title}</span>
                {t.due_at && <span className="text-[10px] mono text-muted-foreground shrink-0">{fmtDate(t.due_at)}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events */}
      <section className="syn-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalIcon className="h-4 w-4" style={{ color: "var(--synapse)" }} />
          <h2 className="font-semibold text-sm">Nächste Termine</h2>
          <Link to="/calendar" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">SynCal <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground">Nichts geplant.</div>
        ) : (
          <div className="space-y-1">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs">
                <span className="mono text-muted-foreground shrink-0 w-24">{fmtDate(e.starts_at)} {fmtTime(e.starts_at)}</span>
                <span className="flex-1 truncate">{e.title}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Roadmap */}
      {roadmap.length > 0 && (
        <section className="syn-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="h-4 w-4" style={{ color: "var(--neural-plum)" }} />
            <h2 className="font-semibold text-sm">Wichtig auf der Roadmap</h2>
            <Link to="/news" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground">News <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          <div className="space-y-1">
            {roadmap.map((r) => (
              <div key={r.id} className="p-2 rounded-lg bg-white/5 text-xs">
                <div className="font-medium truncate">{r.title}</div>
                {r.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
