import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Calendar as CalIcon, X, Download, Upload, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { calList, calUpsert, calDelete, calExportIcs, calImportIcs } from "@/lib/calendar.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  component: CalendarPage,
});

type CalEv = {
  id: string; owner_slid: string; title: string; description: string|null; location: string|null;
  starts_at: string; ends_at: string; all_day: boolean; visibility: "private"|"team"|"all"; color: string|null;
};

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday start
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

function CalendarPage() {
  const session = getSession();
  const listFn = useServerFn(calList);
  const saveFn = useServerFn(calUpsert);
  const delFn = useServerFn(calDelete);
  const exportFn = useServerFn(calExportIcs);
  const importFn = useServerFn(calImportIcs);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalEv[]>([]);
  const [editing, setEditing] = useState<Partial<CalEv> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const from = new Date(cursor); from.setDate(-7);
    const to = new Date(cursor); to.setMonth(to.getMonth() + 1); to.setDate(to.getDate() + 7);
    const rows = await listFn({ data: { ...c, from: from.toISOString(), to: to.toISOString() } }) as CalEv[];
    setEvents(rows);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [cursor]);

  const cells = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const evByDay = useMemo(() => {
    const map = new Map<string, CalEv[]>();
    for (const e of events) {
      const k = new Date(e.starts_at).toISOString().slice(0,10);
      const arr = map.get(k) ?? []; arr.push(e); map.set(k, arr);
    }
    return map;
  }, [events]);

  async function save() {
    if (!editing?.title || !editing?.starts_at || !editing?.ends_at) return;
    const c = getCredentials(); if (!c) return;
    await saveFn({ data: {
      ...c, id: editing.id, title: editing.title!,
      description: editing.description || null, location: editing.location || null,
      starts_at: editing.starts_at!, ends_at: editing.ends_at!,
      all_day: !!editing.all_day, visibility: (editing.visibility || "team") as CalEv["visibility"], color: editing.color || null,
    } });
    setEditing(null); await reload();
  }

  async function doExport() {
    const c = getCredentials(); if (!c) return;
    const r = await exportFn({ data: c }) as { filename: string; content: string };
    const blob = new Blob([r.content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = r.filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(f: File) {
    const text = await f.text();
    const c = getCredentials(); if (!c) return;
    const r = await importFn({ data: { ...c, ics: text } }) as { inserted: number };
    alert(`${r.inserted} Termine importiert.`);
    await reload();
  }

  const monthLabel = cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center mb-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate"><CalIcon className="h-5 w-5 shrink-0" /> SynCal</h1>
          <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="syn-btn-ghost"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} className="syn-btn-ghost text-xs">Heute</button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="syn-btn-ghost"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={doExport} className="syn-btn-ghost"><Download className="h-3.5 w-3.5" /> ICS</button>
          <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} className="syn-btn-ghost"><Upload className="h-3.5 w-3.5" /> Import</button>
          <button onClick={() => {
            const now = new Date(); const end = new Date(now.getTime() + 60*60*1000);
            setEditing({ title: "", starts_at: toLocal(now), ends_at: toLocal(end), visibility: "team" });
          }} className="syn-btn"><Plus className="h-4 w-4" /> Termin</button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 text-[10px] mono uppercase text-muted-foreground mb-1">
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map((d) => <div key={d} className="px-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const k = d.toISOString().slice(0,10);
          const list = evByDay.get(k) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = k === today.toISOString().slice(0,10);
          return (
            <div key={i} className={`min-h-[68px] sm:min-h-[96px] rounded-xl border ${inMonth ? "border-border" : "border-border/30 opacity-50"} ${isToday ? "border-cyan-400/60" : ""} p-1 flex flex-col gap-0.5 bg-card/40`}>
              <div className="text-[10px] mono text-muted-foreground">{d.getDate()}</div>
              {list.slice(0,3).map((e) => (
                <button key={e.id} onClick={() => setEditing({ ...e, starts_at: toLocal(new Date(e.starts_at)), ends_at: toLocal(new Date(e.ends_at)) })}
                  className="text-[10px] text-left truncate rounded px-1 py-0.5 bg-cyan-500/15 text-cyan-200 border border-cyan-400/20">
                  {new Date(e.starts_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} {e.title}
                </button>
              ))}
              {list.length > 3 && <div className="text-[9px] text-muted-foreground">+{list.length - 3}</div>}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="syn-card w-full max-w-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? "Termin bearbeiten" : "Neuer Termin"}</h3>
              <button onClick={() => setEditing(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="Titel" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="syn-input" type="datetime-local" value={editing.starts_at as string || ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
              <input className="syn-input" type="datetime-local" value={editing.ends_at as string || ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
            </div>
            <input className="syn-input" placeholder="Ort" value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            <select className="syn-input" value={editing.visibility || "team"} onChange={(e) => setEditing({ ...editing, visibility: e.target.value as CalEv["visibility"] })}>
              <option value="private">Privat</option><option value="team">Team</option><option value="all">Alle</option>
            </select>
            <textarea className="syn-input" placeholder="Beschreibung" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <div className="flex gap-2">
              <button className="syn-btn flex-1" onClick={() => void save()}>Speichern</button>
              {editing.id && (editing.owner_slid === session?.slid || session?.isSuperuser) && (
                <button className="syn-btn-ghost" onClick={async () => {
                  if (!confirm("Termin löschen?")) return;
                  const c = getCredentials(); if (!c) return;
                  await delFn({ data: { ...c, id: editing.id! } });
                  setEditing(null); await reload();
                }}><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toLocal(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0,16);
}
