import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckSquare, Calendar as CalIcon, Newspaper, Clock, ArrowRight,
  Play, Square, Zap, User, Shield, Building2, Hash, Timer,
  ClipboardList, Mail,
} from "lucide-react";
import { LiquidButton, T, Spin } from "@/components/nl";
import { PageLoader, InlineLoader, SkeletonCard } from "@/components/NeuLoader";
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

/* ──────────── Types ──────────── */
type Task = { id: string; title: string; status: string; priority: string; due_at: string | null; assignee_slid: string };
type Event = { id: string; title: string; start: string; all_day: boolean };
type RoadmapItem = { id: string; title: string; status: string; eta?: string };

/* ──────────── Stagger Animation ──────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 18, stiffness: 200 } },
};

/* ──────────── Home Page ──────────── */
function HomePage() {
  const session = getSession();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerLoading, setTimerLoading] = useState(false);
  const [hoursToday, setHoursToday] = useState("0.0");
  const [shifts, setShifts] = useState<any[]>([]);
  const [showQuickCode, setShowQuickCode] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [unreadCount] = useState(0);

  const tasksListFn = useServerFn(tasksList);
  const calListFn = useServerFn(calList);
  const roadmapListFn = useServerFn(roadmapList);
  const wtShiftsFn = useServerFn(wtShiftsList);
  const wtActiveFn = useServerFn(wtSessionActive);
  const wtStartFn = useServerFn(wtSessionStart);
  const wtStopFn = useServerFn(wtSessionStop);
  const quickLoginFn = useServerFn(quickLoginIssue);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const c = getCredentials();
      const today = new Date().toISOString().split("T")[0];
      const [t, e, r, s, a] = await Promise.all([
        tasksListFn({ data: { limit: 5 } }).catch(() => []),
        calListFn({ data: { from: today, to: today, limit: 5 } }).catch(() => []),
        roadmapListFn().catch(() => []),
        wtShiftsFn({ data: { from: today, to: today } }).catch(() => []),
        c ? wtActiveFn({ data: c }).catch(() => ({ active: false })) : { active: false },
      ]);
      setTasks((t as Task[]) || []);
      setEvents((e as Event[]) || []);
      setRoadmap((r as RoadmapItem[]) || []);
      setShifts((s as any[]) || []);
      setTimerRunning((a as { active: boolean }).active);

      // Calculate hours today
      const totalMs = (s as any[])?.reduce((acc: number, shift: any) => {
        if (shift.duration_ms) return acc + shift.duration_ms;
        if (shift.start_time && shift.end_time) {
          return acc + (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime());
        }
        return acc;
      }, 0) || 0;
      setHoursToday((totalMs / 3600000).toFixed(1));
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function toggleTimer() {
    setTimerLoading(true);
    try {
      const c = getCredentials();
      if (!c) return;
      if (timerRunning) {
        await wtStopFn({ data: c });
        setTimerRunning(false);
      } else {
        await wtStartFn({ data: c });
        setTimerRunning(true);
      }
      // Refresh shifts
      const today = new Date().toISOString().split("T")[0];
      const s = await wtShiftsFn({ data: { from: today, to: today } }).catch(() => []);
      setShifts((s as any[]) || []);
      const totalMs = (s as any[])?.reduce((acc: number, shift: any) => {
        if (shift.duration_ms) return acc + shift.duration_ms;
        if (shift.start_time && shift.end_time) {
          return acc + (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime());
        }
        return acc;
      }, 0) || 0;
      setHoursToday((totalMs / 3600000).toFixed(1));
    } catch { /* ignore */ }
    setTimerLoading(false);
  }

  async function generateQuickCode() {
    try {
      const c = getCredentials();
      if (!c) return;
      const result = await quickLoginFn({ data: c }) as { code: string };
      setQuickCode(result.code);
      setShowQuickCode(true);
      setTimeout(() => setShowQuickCode(false), 30000);
    } catch { /* ignore */ }
  }

  if (loading) {
    return <PageLoader type="sync" label="Dashboard wird geladen…" />;
  }

  const openTasks = tasks.filter((t) => t.status !== "done").length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Card */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border p-6" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${T.primary}20, ${T.accent}20)` }}>
            <User className="h-7 w-7" style={{ color: T.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }}>
              {session?.name || "xSyna Mitglied"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs mono px-2 py-0.5 rounded-lg" style={{ background: "rgba(0,229,255,0.1)", color: T.primary }}>
                <Hash className="h-3 w-3 inline mr-1" />
                {session?.slid}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: T.muted }}>
                {session?.kind || "Account"}
              </span>
              {session?.hl && (
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "rgba(0,255,136,0.1)", color: T.success }}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  HL
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <LiquidButton variant="primary" size="sm" onClick={toggleTimer} disabled={timerLoading}>
              {timerLoading ? <Spin size={14} /> : timerRunning ? <><Square className="h-4 w-4 mr-1" /> Stop</> : <><Play className="h-4 w-4 mr-1" /> Start</>}
            </LiquidButton>
            <LiquidButton variant="ghost" size="sm" onClick={generateQuickCode}>
              <Zap className="h-4 w-4 mr-1" /> Quick
            </LiquidButton>
          </div>
        </div>

        {/* Quick Code */}
        <AnimatePresence>
          {showQuickCode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 p-3 rounded-xl text-center" style={{ background: "rgba(0,229,255,0.05)", border: `1px solid ${T.primary}20` }}>
              <span className="text-xs" style={{ color: T.muted }}>Quick-Login Code</span>
              <div className="text-2xl font-bold tracking-[0.3em] mt-1" style={{ color: T.primary, fontFamily: "'JetBrains Mono', monospace" }}>{quickCode}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Stunden heute", value: `${hoursToday}h`, icon: Clock, color: T.primary },
          { label: "Aufgaben offen", value: String(openTasks), icon: CheckSquare, color: T.secondary },
          { label: "Termine heute", value: String(events.length), icon: CalIcon, color: T.accent },
          { label: "Nachrichten", value: String(unreadCount), icon: Mail, color: T.success },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}>
            <stat.icon className="h-5 w-5 mx-auto mb-2" style={{ color: stat.color }} />
            <div className="text-xl font-bold" style={{ color: T.text, fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
            <div className="text-[10px] mt-1" style={{ color: T.muted }}>{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks Card */}
        <motion.div variants={itemVariants} className="rounded-3xl border p-5" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" style={{ color: T.secondary }} />
              <h3 className="font-semibold text-sm" style={{ color: T.text }}>Aufgaben</h3>
            </div>
            <Link to="/tasks" className="text-xs flex items-center gap-1 hover:underline" style={{ color: T.primary }}>
              Alle <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 4).map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{
                  background: task.priority === "high" ? T.error : task.priority === "medium" ? T.secondary : T.success,
                }} />
                <span className="text-sm flex-1 truncate" style={{ color: T.text }}>{task.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{
                  background: task.status === "done" ? `${T.success}15` : `${T.secondary}15`,
                  color: task.status === "done" ? T.success : T.secondary,
                }}>
                  {task.status === "done" ? "Erledigt" : "Offen"}
                </span>
              </motion.div>
            ))}
            {tasks.length === 0 && <p className="text-xs text-center py-4" style={{ color: T.muted }}>Keine Aufgaben</p>}
          </div>
        </motion.div>

        {/* Calendar Card */}
        <motion.div variants={itemVariants} className="rounded-3xl border p-5" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalIcon className="h-5 w-5" style={{ color: T.accent }} />
              <h3 className="font-semibold text-sm" style={{ color: T.text }}>Heutige Termine</h3>
            </div>
            <Link to="/calendar" className="text-xs flex items-center gap-1 hover:underline" style={{ color: T.primary }}>
              Kalender <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {events.slice(0, 4).map((evt, i) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${T.accent}15` }}>
                  <CalIcon className="h-4 w-4" style={{ color: T.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block" style={{ color: T.text }}>{evt.title}</span>
                  <span className="text-[10px]" style={{ color: T.muted }}>
                    {evt.all_day ? "Ganztägig" : new Date(evt.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            ))}
            {events.length === 0 && <p className="text-xs text-center py-4" style={{ color: T.muted }}>Keine Termine heute</p>}
          </div>
        </motion.div>

        {/* Roadmap Card */}
        <motion.div variants={itemVariants} className="rounded-3xl border p-5 lg:col-span-2" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5" style={{ color: T.primary }} />
            <h3 className="font-semibold text-sm" style={{ color: T.text }}>Roadmap</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {roadmap.slice(0, 6).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0 w-40 p-3 rounded-2xl border"
                style={{
                  background: item.status === "done" ? `${T.success}08` : item.status === "in_progress" ? `${T.primary}08` : "rgba(255,255,255,0.02)",
                  borderColor: item.status === "done" ? `${T.success}20` : item.status === "in_progress" ? `${T.primary}20` : "rgba(255,255,255,0.06)",
                }}
              >
                <div className="h-1.5 w-full rounded-full mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{
                    width: item.status === "done" ? "100%" : item.status === "in_progress" ? "60%" : "20%",
                    background: item.status === "done" ? T.success : item.status === "in_progress" ? T.primary : T.muted,
                  }} />
                </div>
                <p className="text-xs font-medium truncate" style={{ color: T.text }}>{item.title}</p>
                {item.eta && <p className="text-[10px] mt-1" style={{ color: T.muted }}>{item.eta}</p>}
              </motion.div>
            ))}
            {roadmap.length === 0 && <p className="text-xs py-4" style={{ color: T.muted }}>Keine Roadmap-Einträge</p>}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
