import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, Send, X, Plus, Trash2, ArrowLeft, Briefcase, Users, Check, Ban, RotateCcw } from "lucide-react";
import {
  applyPositionsPublic, applyPositionsAll, applyPositionUpsert, applyPositionDelete,
  applySubmitAnon, applyApplicationsList, applyHire, applyApplicationSetStatus,
} from "@/lib/apply.functions";
import { getSession, getCredentials } from "@/lib/syn-session";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/apply")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Applyance – xSyna Central" },
      { name: "description", content: "Bewerbe dich beim xSyna-Kollektiv oder verwalte offene Stellen." },
    ],
  }),
  component: ApplyPage,
});

type Position = { id: string; department: string; team: string | null; position: string; hl_max: number; description: string | null; open: boolean };
type Application = { id: string; position_id: string | null; applicant_name: string; contact: string | null; wish: string | null; note: string | null; status: string; source: string; created_at: string };

function ApplyPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const publicListFn = useServerFn(applyPositionsPublic);
  const allListFn = useServerFn(applyPositionsAll);
  const submitFn = useServerFn(applySubmitAnon);
  const upsertFn = useServerFn(applyPositionUpsert);
  const delFn = useServerFn(applyPositionDelete);
  const appsListFn = useServerFn(applyApplicationsList);
  const hireFn = useServerFn(applyHire);

  const [positions, setPositions] = useState<Position[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [edit, setEdit] = useState<Partial<Position> | null>(null);
  const [hire, setHire] = useState<{ position?: Position; app?: Application } | null>(null);
  const [form, setForm] = useState({ applicant_name: "", contact: "", wish: "", note: "", position_id: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"apply" | "manage" | "hire">("apply");

  const isLeitung = session ? (session.isSuperuser || session.hl >= 5 || session.kind === "service") : false;
  const canHire = session ? (session.isSuperuser || session.hl >= 2) : false;

  async function reload() {
    try {
      if (session) {
        const c = getCredentials()!;
        const [p, a] = await Promise.all([
          allListFn({ data: c }) as Promise<Position[]>,
          appsListFn({ data: c }) as Promise<Application[]>,
        ]);
        setPositions(p); setApps(a);
      } else {
        setPositions((await publicListFn()) as Position[]);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  async function submit() {
    setErr(null);
    try {
      await submitFn({ data: { ...form, position_id: form.position_id || null } });
      setSent(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  async function savePosition() {
    if (!edit?.department || !edit?.position) return;
    const c = getCredentials(); if (!c) return;
    await upsertFn({ data: {
      ...c, id: edit.id, department: edit.department!, team: edit.team || null,
      position: edit.position!, hl_max: Number(edit.hl_max) || 3,
      description: edit.description || null, open: edit.open ?? true,
    }});
    setEdit(null); await reload();
  }

  async function deletePosition(id: string) {
    if (!confirm("Stelle löschen?")) return;
    const c = getCredentials(); if (!c) return;
    await delFn({ data: { ...c, id } });
    await reload();
  }

  return (
    <div className="min-h-[100dvh] p-4 sm:p-6 max-w-4xl mx-auto pb-32">
      <header className="mb-5 flex items-center gap-3">
        <UserPlus className="h-6 w-6" style={{ color: "var(--neural-mint)" }} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Applyance</h1>
          <p className="text-xs text-muted-foreground">Bewerbungen & offene Stellen im xSyna Kollektiv.</p>
        </div>
        {session ? (
          <Link to="/apps" className="syn-btn-ghost text-xs shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Apps</Link>
        ) : (
          <Link to="/auth" className="syn-btn-ghost text-xs shrink-0">SynID Login</Link>
        )}
      </header>

      {session && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <button onClick={() => setTab("apply")} className={`px-3 py-2 rounded-2xl ${tab === "apply" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>Bewerben</button>
          {canHire && <button onClick={() => setTab("hire")} className={`px-3 py-2 rounded-2xl ${tab === "hire" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>Einstellen</button>}
          {isLeitung && <button onClick={() => setTab("manage")} className={`px-3 py-2 rounded-2xl ${tab === "manage" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>Stellen verwalten</button>}
        </div>
      )}

      {err && <div className="mb-3 text-xs text-destructive mono">{err}</div>}

      {(tab === "apply" || !session) && (
        <div className="space-y-4">
          <section className="syn-card p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Offene Stellen</h2>
            <div className="space-y-2">
              {positions.filter((p) => p.open).length === 0 && <div className="text-xs text-muted-foreground">Keine offenen Stellen.</div>}
              {positions.filter((p) => p.open).map((p) => (
                <button key={p.id} onClick={() => setForm({ ...form, position_id: p.id, wish: `${p.department} · ${p.position}` })}
                  className={`w-full text-left p-3 rounded-2xl border transition-colors ${form.position_id === p.id ? "border-cyan-400/60 bg-cyan-500/5" : "border-border hover:border-white/20"}`}>
                  <div className="text-sm font-semibold">{p.department}{p.team && ` · ${p.team}`}</div>
                  <div className="text-xs text-cyan-300 mono">{p.position} · HL ≤ {p.hl_max}</div>
                  {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                </button>
              ))}
            </div>
          </section>

          {sent ? (
            <div className="syn-card p-6 text-center space-y-2">
              <div className="text-lg font-semibold" style={{ color: "var(--neural-mint)" }}>Danke!</div>
              <p className="text-sm text-muted-foreground">Deine Bewerbung ist eingegangen. Die Leitung meldet sich zeitnah.</p>
              <button onClick={() => { setSent(false); setForm({ applicant_name: "", contact: "", wish: "", note: "", position_id: "" }); }} className="syn-btn-ghost text-xs">Neue Bewerbung</button>
            </div>
          ) : (
            <section className="syn-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Bewerbung senden</h2>
              <input className="syn-input" placeholder="Dein Name" value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} />
              <input className="syn-input" placeholder="Kontakt (E-Mail, Telefon, …)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              <input className="syn-input" placeholder="Gewünschte Stelle / Bereich" value={form.wish} onChange={(e) => setForm({ ...form, wish: e.target.value })} />
              <textarea className="syn-input min-h-24" placeholder="Notiz / Motivation" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button onClick={() => void submit()} disabled={!form.applicant_name.trim()} className="syn-btn w-full">
                <Send className="h-4 w-4" /> Bewerbung absenden
              </button>
            </section>
          )}
        </div>
      )}

      {session && tab === "manage" && isLeitung && (
        <div className="space-y-3">
          <button onClick={() => setEdit({ department: "", position: "", hl_max: 3, open: true })} className="syn-btn"><Plus className="h-4 w-4" /> Neue Stelle</button>
          {positions.map((p) => (
            <div key={p.id} className="syn-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.department}{p.team && ` · ${p.team}`}</div>
                <div className="text-xs mono text-muted-foreground truncate">{p.position} · HL ≤ {p.hl_max} · {p.open ? "offen" : "geschlossen"}</div>
              </div>
              <button onClick={() => setEdit(p)} className="syn-btn-ghost text-xs">Edit</button>
              <button onClick={() => void deletePosition(p.id)} className="syn-btn-ghost"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {session && tab === "hire" && canHire && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Du siehst Bewerbungen — stelle direkt ein (HL &lt; deins).</div>
          {apps.length === 0 && <div className="text-sm text-muted-foreground">Keine Bewerbungen.</div>}
          {apps.map((a) => {
            const pos = positions.find((p) => p.id === a.position_id);
            return (
              <div key={a.id} className="syn-card p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{a.applicant_name}</div>
                    <div className="text-xs mono text-muted-foreground">{a.contact} · {new Date(a.created_at).toLocaleDateString()} · <span className="syn-chip text-[10px]">{a.status}</span></div>
                    {a.wish && <div className="text-xs mt-1">Wunsch: {a.wish}</div>}
                    {a.note && <div className="text-xs text-muted-foreground mt-1">{a.note}</div>}
                  </div>
                </div>
                <button onClick={() => setHire({ position: pos, app: a })} className="syn-btn w-full text-xs" disabled={a.status === "hired"}>
                  {a.status === "hired" ? "Bereits eingestellt" : "Einstellen"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? "Stelle bearbeiten" : "Neue Stelle"} onClose={() => setEdit(null)}>
          <input className="syn-input" placeholder="Abteilung" value={edit.department || ""} onChange={(e) => setEdit({ ...edit, department: e.target.value })} />
          <input className="syn-input" placeholder="Team (optional)" value={edit.team || ""} onChange={(e) => setEdit({ ...edit, team: e.target.value })} />
          <input className="syn-input" placeholder="Position" value={edit.position || ""} onChange={(e) => setEdit({ ...edit, position: e.target.value })} />
          <input className="syn-input" type="number" min={1} max={9} placeholder="HL max" value={String(edit.hl_max ?? 3)} onChange={(e) => setEdit({ ...edit, hl_max: Number(e.target.value) })} />
          <textarea className="syn-input min-h-20" placeholder="Beschreibung" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={edit.open ?? true} onChange={(e) => setEdit({ ...edit, open: e.target.checked })} /> Offen</label>
          <button className="syn-btn w-full" onClick={() => void savePosition()}>Speichern</button>
        </Modal>
      )}

      {hire && (
        <HireModal
          initial={hire}
          maxHl={(session?.hl ?? 1) - 1}
          onClose={() => setHire(null)}
          onSubmit={async (payload) => {
            const c = getCredentials(); if (!c) return;
            const r = await hireFn({ data: { ...c, application_id: hire.app?.id, ...payload } });
            alert(`Angelegt: ${r.employee.name}\nSLID: ${r.credentials.slid}\nCIP: ${r.credentials.cip}\nPIK: ${r.credentials.pik}\n\nBitte übergib diese Daten sicher.`);
            setHire(null); await reload();
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className="syn-card w-full max-w-md p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><button onClick={onClose} className="syn-btn-ghost"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>
  );
}

function HireModal({ initial, maxHl, onClose, onSubmit }: {
  initial: { position?: { department: string; position: string; hl_max: number } | undefined; app?: { applicant_name: string; contact: string | null } | undefined };
  maxHl: number;
  onClose: () => void;
  onSubmit: (p: { name: string; email: string | null; department: string; position: string; hl: number; kind: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.app?.applicant_name || "");
  const [email, setEmail] = useState(initial.app?.contact || "");
  const [department, setDepartment] = useState(initial.position?.department || "");
  const [position, setPosition] = useState(initial.position?.position || "");
  const [hl, setHl] = useState(Math.min(initial.position?.hl_max ?? 1, maxHl));
  const [kind, setKind] = useState("member");
  return (
    <Modal title="Person einstellen" onClose={onClose}>
      <input className="syn-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="syn-input" placeholder="E-Mail (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="syn-input" placeholder="Abteilung" value={department} onChange={(e) => setDepartment(e.target.value)} />
      <input className="syn-input" placeholder="Position" value={position} onChange={(e) => setPosition(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="syn-input" type="number" min={1} max={maxHl} placeholder="HL" value={String(hl)} onChange={(e) => setHl(Number(e.target.value))} />
        <select className="syn-input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="member">Member</option><option value="service">Service</option>
        </select>
      </div>
      <button className="syn-btn w-full" disabled={!name.trim() || !department.trim() || !position.trim() || hl < 1 || hl > maxHl}
        onClick={() => void onSubmit({ name, email: email || null, department, position, hl, kind })}>Einstellen</button>
      <p className="text-[11px] text-muted-foreground">Es werden SLID, PIK und CIP automatisch generiert und dir angezeigt.</p>
    </Modal>
  );
}
