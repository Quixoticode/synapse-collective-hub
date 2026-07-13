import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, X, CheckSquare, Clock, Flag, User } from "lucide-react";
import { tasksList, tasksUpsert, tasksDelete, tasksPeople } from "@/lib/tasks.functions";
import { myPermissions } from "@/lib/permissions.functions";
import { getSession, getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/tasks")({
  ssr: false,
  component: TasksPage,
});

type Task = {
  id: string; title: string; description: string | null;
  assignee_slid: string; creator_slid: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "done";
  due_at: string | null; created_at: string;
};
type Person = { slid: string; name: string; hl: number; kind: string };

const STATUS_LABEL = { open: "Offen", in_progress: "In Arbeit", done: "Erledigt" };
const PRIO_COLOR = { low: "opacity-70", normal: "", high: "text-amber-300", urgent: "text-rose-300" };

function TasksPage() {
  const s = getSession();
  const listFn = useServerFn(tasksList);
  const saveFn = useServerFn(tasksUpsert);
  const delFn = useServerFn(tasksDelete);
  const peopleFn = useServerFn(tasksPeople);
  const permsFn = useServerFn(myPermissions);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState<"assigned"|"created"|"all">("assigned");
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());
  const canManageAll = !!s?.isSuperuser || allowedFeatures.has("tasks.manage");

  async function reload() {
    const c = getCredentials(); if (!c) return;
    try {
      const [t, p, feats] = await Promise.all([listFn({ data: c }), peopleFn({ data: c }), permsFn({ data: c }) as Promise<{ features: string[] }>]);
      setTasks(t as Task[]); setPeople(p as Person[]);
      setAllowedFeatures(new Set(feats.features));
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => tasks.filter((t) => {
    if (!s) return false;
    if (filter === "assigned") return t.assignee_slid === s.slid;
    if (filter === "created") return t.creator_slid === s.slid;
    return true;
  }), [tasks, filter, s]);

  async function save() {
    if (!editing?.title || !editing?.assignee_slid) return;
    const c = getCredentials(); if (!c) return;
    setBusy(true); setErr(null);
    try {
      await saveFn({ data: {
        ...c, id: editing.id, title: editing.title!, description: editing.description || null,
        assignee_slid: editing.assignee_slid!, priority: (editing.priority ?? "normal"),
        status: (editing.status ?? "open"), due_at: editing.due_at || null,
      }});
      setEditing(null);
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Aufgabe löschen?")) return;
    const c = getCredentials(); if (!c) return;
    await delFn({ data: { ...c, id } });
    await reload();
  }

  async function toggleDone(t: Task) {
    const c = getCredentials(); if (!c) return;
    await saveFn({ data: { ...c, id: t.id, title: t.title, description: t.description, assignee_slid: t.assignee_slid, priority: t.priority, status: t.status === "done" ? "open" : "done", due_at: t.due_at }});
    await reload();
  }

  const nameOf = (slid: string) => people.find(p => p.slid === slid)?.name ?? slid;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto pb-28 md:pb-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">Tasks</h1>
          <p className="text-xs text-muted-foreground mt-1">Aufgaben zuweisen und tracken.</p>
        </div>
        <button onClick={() => setEditing({ priority: "normal", status: "open", assignee_slid: s?.slid })} className="syn-btn shrink-0">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Neue Aufgabe</span>
        </button>
      </header>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["assigned","created","all"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-2 rounded-2xl text-xs whitespace-nowrap ${filter===k ? "syn-tab-active font-semibold":"syn-btn-ghost"}`}>
            {k === "assigned" ? "Mir zugewiesen" : k === "created" ? "Von mir" : "Alle sichtbar"}
          </button>
        ))}
      </div>

      {err && <div className="mb-3 text-xs text-destructive mono">{err}</div>}

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <div className="syn-card p-8 text-center text-sm text-muted-foreground">Keine Aufgaben.</div>
        ) : filtered.map((t) => (
          <div key={t.id} className={`syn-card p-4 flex items-start gap-3 ${t.status === "done" ? "opacity-60" : ""}`}>
            <button onClick={() => void toggleDone(t)} className="mt-0.5 shrink-0">
              <CheckSquare className={`h-5 w-5 ${t.status === "done" ? "text-emerald-400" : "text-muted-foreground"}`} />
            </button>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${t.status === "done" ? "line-through" : ""}`}>{t.title}</div>
              {t.description && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</div>}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] mono text-muted-foreground">
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {nameOf(t.assignee_slid)}</span>
                <span className={`inline-flex items-center gap-1 ${PRIO_COLOR[t.priority]}`}><Flag className="h-3 w-3" /> {t.priority}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {STATUS_LABEL[t.status]}</span>
                {t.due_at && <span>fällig: {new Date(t.due_at).toLocaleDateString("de-DE")}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setEditing(t)} className="syn-btn-ghost text-xs">Bearb.</button>
              {(t.creator_slid === s?.slid || canManageAll) && (
                <button onClick={() => void remove(t.id)} className="syn-btn-ghost text-xs"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="syn-card syn-gradient-border w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{editing.id ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</h2>
              <button onClick={() => setEditing(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <input className="syn-input" placeholder="Titel *" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <textarea className="syn-input min-h-24" placeholder="Beschreibung" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="syn-input" value={editing.assignee_slid || s?.slid} onChange={(e) => setEditing({ ...editing, assignee_slid: e.target.value })}>
                  {people.map(p => <option key={p.slid} value={p.slid}>{p.name} ({p.slid})</option>)}
                </select>
                <select className="syn-input" value={editing.priority || "normal"} onChange={(e) => setEditing({ ...editing, priority: e.target.value as Task["priority"] })}>
                  <option value="low">Priorität: Niedrig</option>
                  <option value="normal">Normal</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
                <select className="syn-input" value={editing.status || "open"} onChange={(e) => setEditing({ ...editing, status: e.target.value as Task["status"] })}>
                  <option value="open">Offen</option>
                  <option value="in_progress">In Arbeit</option>
                  <option value="done">Erledigt</option>
                </select>
                <input className="syn-input" type="date" value={editing.due_at?.slice(0,10) || ""} onChange={(e) => setEditing({ ...editing, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>
            <div className="p-5 border-t border-border bg-card/95 backdrop-blur sticky bottom-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
              <button onClick={() => void save()} disabled={busy || !editing.title || !editing.assignee_slid} className="syn-btn w-full">
                {busy ? "Speichere…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
