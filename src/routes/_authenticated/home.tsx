import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckSquare, Calendar as CalIcon, Newspaper, Clock, ArrowRight,
  Play, Square, Zap, User, Shield, Building2, Hash,
} from "lucide-react";
import { LiquidButton, T } from "@/components/nl";
import { getSession, getCredentials, type SynSession } from "@/lib/syn-session";
import { tasksList } from "@/lib/tasks.functions";
import { calList } from "@/lib/calendar.functions";
import { roadmapList } from "@/lib/versions.functions";
import { wtShiftsList, wtSessionActive, wtSessionStart, wtSessionStop } from "@/lib/worktime.functions";
import { quickLoginIssue } from "@/lib/quick-login.functions";

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
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const cardAnim = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 300, damping: 28 },
};

function NlCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      initial={cardAnim.initial}
      animate={cardAnim.animate}
      transition={{ ...cardAnim.transition, delay }}
      className={`p-4 ${className}`}
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px" }}
    >
      {children}
    </motion.section>
  );
}

function ProfileCard({ session, delay = 0 }: { session: SynSession; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay }}
      style={{
        background: `linear-gradient(135deg, ${T.bg2} 0%, ${T.surface} 100%)`,
        border: `1px solid ${T.border}`,
        borderRadius: "16px",
        padding: "16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${T.primary}, ${T.accent}, ${T.secondary})`, opacity: 0.6 }} />
      <div className="flex items-center gap-3">
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0, background: `linear-gradient(135deg, ${T.primary}22, ${T.accent}18)`, border: `1px solid ${T.primary}30`, display: "grid", placeItems: "center" }}>
          <User size={22} style={{ color: T.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: T.text }}>{session.name || "Unbekannt"}</span>
            <span className="text-[10px] mono px-1.5 py-0.5 rounded-md" style={{ background: `${T.primary}15`, color: T.primary, border: `1px solid ${T.primary}30` }}>{session.slid}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {session.kind && <span className="text-[10px] flex items-center gap-1" style={{ color: T.muted }}><Shield size={10} /> {session.kind}</span>}
            {session.department && <span className="text-[10px] flex items-center gap-1" style={{ color: T.muted }}><Building2 size={10} /> {session.department}</span>}
            {session.position && <span className="text-[10px] flex items-center gap-1" style={{ color: T.muted }}><Hash size={10} /> {session.position}</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
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
      setRoadmap(rm.filter((x) => x.status !== "done" && x.status !== "shipped").slice(0, 3));
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
      <ProfileCard session={session} delay={0} />
      <QuickLoginSection slid={session.slid} />

      <NlCard delay={0.1}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4" style={{ color: T.primary }} />
          <h2 className="font-semibold text-sm" style={{ color: T.text }}>Arbeitszeit heute</h2>
          <Link to="/worktime" className="ml-auto text-[11px] flex items-center gap-0.5 transition-colors hover:underline" style={{ color: T.muted }}>Zeitkalender <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {todayShifts.length > 0 ? (
          <div className="text-xs space-y-1.5 mb-3">
            {todayShifts.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: `${T.surface}`, border: `1px solid ${T.border}` }}>
                <span className="mono" style={{ color: T.text }}>{fmtTime(s.starts_at)} &ndash; {fmtTime(s.ends_at)}</span>
                {s.note && <span className="truncate" style={{ color: T.muted }}>&middot; {s.note}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs mb-3" style={{ color: T.muted }}>Heute keine Schicht geplant.</div>
        )}
        <div className="flex items-center gap-3">
          {active ? (
            <>
              <div className="flex-1">
                <div className="text-[10px] uppercase mono" style={{ color: T.muted }}>Timer aktiv</div>
                <motion.div key={active.started_at} className="text-lg mono font-semibold" style={{ color: T.success }} animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  {elapsed(active.started_at)}
                </motion.div>
              </div>
              <LiquidButton variant="danger" size="sm" onClick={() => void toggleTimer()}><Square className="h-4 w-4" /> Stop</LiquidButton>
            </>
          ) : (
            <LiquidButton variant="success" fullWidth size="sm" onClick={() => void toggleTimer()}><Play className="h-4 w-4" /> Arbeit starten</LiquidButton>
          )}
        </div>
      </NlCard>

      <NlCard delay={0.2}>
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="h-4 w-4" style={{ color: T.success }} />
          <h2 className="font-semibold text-sm" style={{ color: T.text }}>Meine Aufgaben</h2>
          <Link to="/tasks" className="ml-auto text-[11px] flex items-center gap-0.5 transition-colors hover:underline" style={{ color: T.muted }}>Alle <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {tasks.length === 0 ? (
          <div className="text-xs" style={{ color: T.muted }}>Keine offenen Aufgaben.</div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex items-center gap-2 p-2.5 rounded-xl text-xs" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: t.priority === "urgent" ? T.error : t.priority === "high" ? T.secondary : T.primary, boxShadow: `0 0 6px ${t.priority === "urgent" ? T.error : t.priority === "high" ? T.secondary : T.primary}50` }} />
                <span className="flex-1 truncate" style={{ color: T.text }}>{t.title}</span>
                {t.due_at && <span className="text-[10px] mono shrink-0" style={{ color: T.muted }}>{fmtDate(t.due_at)}</span>}
              </motion.div>
            ))}
          </div>
        )}
      </NlCard>

      <NlCard delay={0.3}>
        <div className="flex items-center gap-2 mb-3">
          <CalIcon className="h-4 w-4" style={{ color: T.primary }} />
          <h2 className="font-semibold text-sm" style={{ color: T.text }}>Nächste Termine</h2>
          <Link to="/calendar" className="ml-auto text-[11px] flex items-center gap-0.5 transition-colors hover:underline" style={{ color: T.muted }}>SynCal <ArrowRight className="inline h-3 w-3" /></Link>
        </div>
        {events.length === 0 ? (
          <div className="text-xs" style={{ color: T.muted }}>Nichts geplant.</div>
        ) : (
          <div className="space-y-1.5">
            {events.map((e) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="flex items-center gap-2 p-2.5 rounded-xl text-xs" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <span className="mono shrink-0 w-24" style={{ color: T.muted }}>{fmtDate(e.starts_at)} {fmtTime(e.starts_at)}</span>
                <span className="flex-1 truncate" style={{ color: T.text }}>{e.title}</span>
              </motion.div>
            ))}
          </div>
        )}
      </NlCard>

      {roadmap.length > 0 && (
        <NlCard delay={0.4}>
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="h-4 w-4" style={{ color: T.accent }} />
            <h2 className="font-semibold text-sm" style={{ color: T.text }}>Wichtig auf der Roadmap</h2>
            <Link to="/news" className="ml-auto text-[11px] flex items-center gap-0.5 transition-colors hover:underline" style={{ color: T.muted }}>News <ArrowRight className="inline h-3 w-3" /></Link>
          </div>
          <div className="space-y-1.5">
            {roadmap.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="p-2.5 rounded-xl text-xs" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="font-medium truncate" style={{ color: T.text }}>{r.title}</div>
                {r.description && <div className="text-[11px] line-clamp-2 mt-0.5" style={{ color: T.muted }}>{r.description}</div>}
              </motion.div>
            ))}
          </div>
        </NlCard>
      )}
    </div>
  );
}

function QuickLoginSection({ slid }: { slid: string }) {
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
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
      className="p-4"
      style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4" style={{ color: T.primary }} />
        <h2 className="font-semibold text-sm" style={{ color: T.text }}>Mein Quick-Login</h2>
        <span className="ml-auto text-[10px] mono" style={{ color: T.muted }}>6-stelliger Einmal-Code &middot; 15 Min</span>
      </div>
      {code ? (
        <div className="text-center p-3 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold mono tracking-widest" style={{ color: T.primary, textShadow: `0 0 20px ${T.primary}40` }}>
            {code.code}
          </motion.div>
          <div className="text-[10px] mono mt-1" style={{ color: T.muted }}>gültig bis {new Date(code.expires_at).toLocaleTimeString()}</div>
          <LiquidButton variant="ghost" size="xs" onClick={() => setCode(null)} className="mt-2">Verbergen</LiquidButton>
        </div>
      ) : (
        <LiquidButton fullWidth size="sm" onClick={() => void issue()} disabled={busy}>
          {busy ? "Erzeuge…" : <><Zap className="h-3.5 w-3.5" /> Code auf Zweitgerät nutzen</>}
        </LiquidButton>
      )}
    </motion.section>
  );
}
