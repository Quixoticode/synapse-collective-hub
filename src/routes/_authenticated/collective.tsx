import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Pencil, Trash2, X, ShieldAlert, Radio } from "lucide-react";
import { employeesList, employeeSave, employeeDelete } from "@/lib/syn.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/collective")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("syn.session.v1");
    if (!raw) throw redirect({ to: "/auth" });
    try {
      const s = JSON.parse(raw);
      if ((s?.hl ?? 0) < 5) throw redirect({ to: "/contacts" });
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: CollectivePage,
});

type MemberKind = "mitarbeiter" | "partner" | "kunde";

type Employee = {
  slid: string;
  hl: number;
  regid: string;
  name: string;
  kind: MemberKind;
  pik?: string;
  cip?: string;
  kwn: string | null;
  kwn_active: boolean;
  email: string | null;
  notes: string | null;
  created_at?: string;
};

const KIND_LABEL: Record<MemberKind, string> = {
  mitarbeiter: "Mitarbeiter",
  partner: "Partner",
  kunde: "Kunde",
};

function kindBadge(k: MemberKind) {
  return {
    mitarbeiter: "bg-[rgba(0,255,209,0.12)] text-[#7fffe0] border-[rgba(0,255,209,0.35)]",
    partner: "bg-[rgba(123,97,255,0.15)] text-[#c8bcff] border-[rgba(123,97,255,0.35)]",
    kunde: "bg-[rgba(0,163,255,0.15)] text-[#9ad8ff] border-[rgba(0,163,255,0.35)]",
  }[k];
}

function hlBadge(hl: number) {
  if (hl >= 6) return "bg-[rgba(255,60,172,0.15)] text-[#ffb1da] border-[rgba(255,60,172,0.35)]";
  if (hl >= 5) return "bg-[rgba(123,97,255,0.15)] text-[#c8bcff] border-[rgba(123,97,255,0.35)]";
  if (hl >= 3) return "bg-[rgba(0,163,255,0.15)] text-[#9ad8ff] border-[rgba(0,163,255,0.35)]";
  return "bg-[rgba(0,255,209,0.12)] text-[#7fffe0] border-[rgba(0,255,209,0.3)]";
}

function CollectivePage() {
  const list = useServerFn(employeesList);
  const save = useServerFn(employeeSave);
  const remove = useServerFn(employeeDelete);
  const session = getSession();

  const [rows, setRows] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | MemberKind>("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<Employee> & { original_slid?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const c = getCredentials();
    if (!c) return;
    setLoading(true);
    try {
      const data = (await list({ data: c })) as Employee[];
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((e) => {
      if (kindFilter !== "all" && (e.kind ?? "mitarbeiter") !== kindFilter) return false;
      if (!t) return true;
      return [e.name, e.slid, e.regid, e.kwn].some((v) => (v ?? "").toLowerCase().includes(t));
    });
  }, [rows, q, kindFilter]);

  async function doSave() {
    if (!editing) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true); setError(null);
    try {
      await save({
        data: {
          caller_slid: c.slid,
          caller_pik: c.pik,
          original_slid: editing.original_slid,
          target_slid: editing.slid ?? "",
          name: editing.name ?? "",
          hl: Number(editing.hl ?? 1),
          regid: editing.regid ?? "",
          pik: editing.pik ?? "",
          cip: editing.cip ?? "",
          kwn: editing.kwn ?? "",
          kwn_active: !!editing.kwn_active,
          email: editing.email ?? "",
          notes: editing.notes ?? "",
        },
      });
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function del(slid: string) {
    if (!confirm(`Mitarbeiter ${slid} entfernen?`)) return;
    const c = getCredentials();
    if (!c) return;
    try {
      await remove({ data: { caller_slid: c.slid, caller_pik: c.pik, target_slid: slid } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kollektiv</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5" style={{ color: "var(--neural-magenta)" }} />
            HL ≥ 5 – Mitarbeiterverwaltung, SLIDs & KWN-Aktivierung.
          </p>
        </div>
        <button
          onClick={() => setEditing({ hl: 1, kwn_active: false })}
          className="syn-btn"
        >
          <Plus className="h-4 w-4" /> Neuer Mitarbeiter
        </button>
      </header>

      <div className="syn-card p-3 md:p-4 mb-5">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach SLID, Name, REGID, KWN…"
            className="syn-input pl-9"
          />
        </div>
      </div>

      {error && <div className="mb-4 text-xs text-destructive mono">{error}</div>}

      <div className="grid gap-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Lade Kollektiv…</div>
        ) : filtered.length === 0 ? (
          <div className="syn-card p-8 text-center text-sm text-muted-foreground">Keine Mitarbeiter.</div>
        ) : (
          filtered.map((e) => (
            <div key={e.slid} className="syn-card p-4 flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{e.name}</h3>
                  <span className={`syn-chip border ${hlBadge(e.hl)}`}>HL {e.hl}</span>
                  {e.kwn && (
                    <span className={`syn-chip ${e.kwn_active ? "border-[rgba(0,255,209,0.4)] text-[#7fffe0]" : "opacity-60"}`}>
                      <Radio className="h-3 w-3" /> {e.kwn}
                    </span>
                  )}
                  {e.slid === session?.slid && <span className="syn-chip">du</span>}
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs mono text-muted-foreground">
                  <span>SLID: <span className="text-foreground">{e.slid}</span></span>
                  <span>REGID: <span className="text-foreground">{e.regid}</span></span>
                  {e.email && <span className="truncate">✉ {e.email}</span>}
                </div>
                {e.notes && <p className="mt-2 text-xs text-muted-foreground">{e.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing({ ...e, original_slid: e.slid, pik: "", cip: e.cip ?? "" })}
                  className="syn-btn-ghost text-xs"
                  title="PIK leer lassen, um nicht zu ändern? — Pflicht beim Speichern."
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {e.slid !== session?.slid && (
                  <button onClick={() => del(e.slid)} className="syn-btn-ghost text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <EmployeeModal
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={doSave}
          busy={busy}
        />
      )}
    </div>
  );
}

function EmployeeModal({
  value, onChange, onClose, onSave, busy,
}: {
  value: Partial<Employee> & { original_slid?: string };
  onChange: (v: Partial<Employee> & { original_slid?: string }) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="syn-card syn-gradient-border w-full max-w-xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 syn-btn-ghost p-2"><X className="h-4 w-4" /></button>
        <h2 className="text-lg font-semibold mb-1">{value.original_slid ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}</h2>
        <p className="text-xs text-muted-foreground mb-4">PIK muss als sha256-Hex bereitgestellt werden.</p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SLID" value={value.slid} onChange={(v) => onChange({ ...value, slid: v })} />
          <Field label="HL (1-7)" type="number" value={String(value.hl ?? "")} onChange={(v) => onChange({ ...value, hl: Number(v) })} />
          <Field label="Name" wide value={value.name} onChange={(v) => onChange({ ...value, name: v })} />
          <Field label="REGID" value={value.regid} onChange={(v) => onChange({ ...value, regid: v })} />
          <Field label="CIP" value={value.cip} onChange={(v) => onChange({ ...value, cip: v })} />
          <Field label="PIK (sha256)" wide value={value.pik} onChange={(v) => onChange({ ...value, pik: v })} />
          <Field label="KWN" value={value.kwn} onChange={(v) => onChange({ ...value, kwn: v })} />
          <div className="flex items-center gap-2 mt-6">
            <input
              id="kwn_active"
              type="checkbox"
              checked={!!value.kwn_active}
              onChange={(e) => onChange({ ...value, kwn_active: e.target.checked })}
              className="h-4 w-4 accent-[color:var(--synapse)]"
            />
            <label htmlFor="kwn_active" className="text-sm">KWN aktiv</label>
          </div>
          <Field label="E-Mail" wide value={value.email} onChange={(v) => onChange({ ...value, email: v })} />
          <div className="col-span-2">
            <label className="text-[11px] mono uppercase tracking-wider text-muted-foreground">Notizen</label>
            <textarea
              className="syn-input mt-1 min-h-[80px]"
              value={value.notes ?? ""}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="syn-btn-ghost">Abbrechen</button>
          <button onClick={onSave} disabled={busy || !value.slid || !value.name || !value.pik || !value.cip || !value.regid} className="syn-btn">
            {busy ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", wide = false,
}: { label: string; value?: string | null; onChange: (v: string) => void; type?: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="text-[11px] mono uppercase tracking-wider text-muted-foreground">{label}</label>
      <input type={type} className="syn-input mt-1" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
