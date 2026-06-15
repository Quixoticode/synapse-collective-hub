import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Pencil, Trash2, X, Mail, Phone, Building2 } from "lucide-react";
import { crmList, crmUpsert, crmDelete } from "@/lib/syn.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type Contact = {
  id: string;
  owner_slid: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "lead" | "active" | "won" | "lost";
  tags: string[] | null;
  notes: string | null;
  created_at: string;
};

const STATUSES: Contact["status"][] = ["lead", "active", "won", "lost"];

function statusColor(s: string) {
  return {
    lead: "bg-[rgba(0,163,255,0.15)] text-[#9ad8ff] border-[rgba(0,163,255,0.3)]",
    active: "bg-[rgba(0,255,209,0.12)] text-[#7fffe0] border-[rgba(0,255,209,0.3)]",
    won: "bg-[rgba(123,97,255,0.15)] text-[#c8bcff] border-[rgba(123,97,255,0.35)]",
    lost: "bg-[rgba(255,60,172,0.12)] text-[#ffb1da] border-[rgba(255,60,172,0.3)]",
  }[s] ?? "";
}

function ContactsPage() {
  const list = useServerFn(crmList);
  const upsert = useServerFn(crmUpsert);
  const remove = useServerFn(crmDelete);

  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = getSession();

  async function refresh() {
    const c = getCredentials();
    if (!c) return;
    setLoading(true);
    try {
      const rows = (await list({ data: c })) as Contact[];
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!term) return true;
      return [c.name, c.company, c.email, c.phone].some((v) => (v ?? "").toLowerCase().includes(term));
    });
  }, [items, q, statusFilter]);

  async function save() {
    if (!editing) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true); setError(null);
    try {
      await upsert({
        data: {
          ...c,
          id: editing.id,
          name: editing.name ?? "",
          company: editing.company ?? "",
          email: editing.email ?? "",
          phone: editing.phone ?? "",
          status: (editing.status ?? "lead") as Contact["status"],
          tags: editing.tags ?? [],
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

  async function del(id: string) {
    if (!confirm("Kontakt wirklich löschen?")) return;
    const c = getCredentials();
    if (!c) return;
    try {
      await remove({ data: { ...c, id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kontakte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session && session.hl >= 5 ? "Vollzugriff (HL ≥ 5) – alle Kollektiv-Kontakte." : "Deine persönlichen CRM-Kontakte."}
          </p>
        </div>
        <button onClick={() => setEditing({ status: "lead", tags: [] })} className="syn-btn">
          <Plus className="h-4 w-4" /> Neuer Kontakt
        </button>
      </header>

      <div className="syn-card p-3 md:p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche nach Name, Firma, E-Mail…"
            className="syn-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="syn-input md:w-44"
        >
          <option value="all">Alle Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 text-xs text-destructive mono">{error}</div>}

      <div className="grid gap-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Lade Kontakte…</div>
        ) : filtered.length === 0 ? (
          <div className="syn-card p-8 text-center text-sm text-muted-foreground">
            Keine Kontakte gefunden.
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="syn-card p-4 flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{c.name}</h3>
                  <span className={`syn-chip border ${statusColor(c.status)}`}>{c.status}</span>
                  {(c.tags ?? []).map((t) => <span key={t} className="syn-chip">#{t}</span>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mono">
                  {c.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company}</span>}
                  {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                </div>
                {c.notes && <p className="mt-2 text-xs text-muted-foreground">{c.notes}</p>}
                <div className="mt-2 text-[10px] text-muted-foreground mono">SLID: {c.owner_slid}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="syn-btn-ghost text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del(c.id)} className="syn-btn-ghost text-xs"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ContactModal
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      )}
    </div>
  );
}

function ContactModal({
  value, onChange, onClose, onSave, busy,
}: {
  value: Partial<Contact>;
  onChange: (v: Partial<Contact>) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="syn-card syn-gradient-border w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 syn-btn-ghost p-2"><X className="h-4 w-4" /></button>
        <h2 className="text-lg font-semibold mb-4">{value.id ? "Kontakt bearbeiten" : "Neuer Kontakt"}</h2>
        <div className="space-y-3">
          {(["name","company","email","phone"] as const).map((f) => (
            <div key={f}>
              <label className="text-[11px] mono uppercase tracking-wider text-muted-foreground">{f}</label>
              <input
                className="syn-input mt-1"
                value={(value[f] as string) ?? ""}
                onChange={(e) => onChange({ ...value, [f]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="text-[11px] mono uppercase tracking-wider text-muted-foreground">Status</label>
            <select
              className="syn-input mt-1"
              value={(value.status as string) ?? "lead"}
              onChange={(e) => onChange({ ...value, status: e.target.value as Contact["status"] })}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] mono uppercase tracking-wider text-muted-foreground">Tags (Komma-getrennt)</label>
            <input
              className="syn-input mt-1"
              value={(value.tags ?? []).join(", ")}
              onChange={(e) => onChange({ ...value, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            />
          </div>
          <div>
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
          <button onClick={onSave} disabled={busy || !value.name} className="syn-btn">
            {busy ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
