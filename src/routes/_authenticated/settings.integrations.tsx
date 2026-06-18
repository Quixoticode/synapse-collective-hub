import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Plug, Save, Trash2, ExternalLink } from "lucide-react";
import { getCredentials, getSession } from "@/lib/syn-session";
import { externalList, externalUpsert, externalDelete } from "@/lib/syn-external.functions";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
});

type Row = {
  key: string;
  label: string;
  supabase_url: string;
  anon_key: string;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  service_key_set?: boolean;
};

function IntegrationsPage() {
  const list = useServerFn(externalList);
  const upsert = useServerFn(externalUpsert);
  const del = useServerFn(externalDelete);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const session = getSession();

  async function refresh() {
    const creds = getCredentials();
    if (!creds) return;
    try {
      const data = await list({ data: creds });
      setRows(data as Row[]);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session?.isSuperuser) {
    return (
      <div className="p-6">
        <div className="syn-card p-6">
          <h1 className="text-lg font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-2">Nur Superuser haben Zugriff.</p>
        </div>
      </div>
    );
  }

  async function save(row: Row, service_key: string) {
    const creds = getCredentials();
    if (!creds) return;
    setBusy(true);
    try {
      await upsert({
        data: {
          ...creds,
          key: row.key,
          label: row.label,
          supabase_url: row.supabase_url,
          anon_key: row.anon_key,
          service_key: service_key || null,
          notes: row.notes,
        },
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function remove(key: string) {
    const creds = getCredentials();
    if (!creds) return;
    if (!confirm(`Verbindung "${key}" löschen?`)) return;
    setBusy(true);
    try {
      await del({ data: { ...creds, key } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function addBlank() {
    setRows((r) => [
      ...r,
      {
        key: "",
        label: "",
        supabase_url: "",
        anon_key: "",
        notes: "",
        updated_by: null,
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Plug className="h-5 w-5" /> Integrations
          </h1>
          <p className="text-sm text-muted-foreground">Externe xSyna-Systeme (z.&nbsp;B. SynID Gateway).</p>
        </div>
        <button onClick={addBlank} className="syn-btn-ghost text-sm">+ Neue Verbindung</button>
      </div>

      {err && <div className="syn-card p-3 text-sm text-red-400">{err}</div>}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <ConfigCard
            key={`${row.key}-${idx}`}
            row={row}
            onChange={(next) => setRows((rs) => rs.map((r, i) => (i === idx ? next : r)))}
            onSave={(svc) => save(row, svc)}
            onDelete={() => row.key && remove(row.key)}
            busy={busy}
          />
        ))}
        {rows.length === 0 && (
          <div className="syn-card p-6 text-sm text-muted-foreground">Keine Verbindungen.</div>
        )}
      </div>
    </div>
  );
}

function ConfigCard({
  row,
  onChange,
  onSave,
  onDelete,
  busy,
}: {
  row: Row;
  onChange: (next: Row) => void;
  onSave: (service_key: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [serviceKey, setServiceKey] = useState("");
  return (
    <div className="syn-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            value={row.key}
            onChange={(e) => onChange({ ...row, key: e.target.value })}
            placeholder="key (z.B. synid)"
            className="syn-input w-40 mono text-xs"
          />
          <input
            value={row.label}
            onChange={(e) => onChange({ ...row, label: e.target.value })}
            placeholder="Label"
            className="syn-input"
          />
        </div>
        <div className="flex items-center gap-2">
          {row.service_key_set && (
            <span className="syn-chip text-[10px]">service key ✓</span>
          )}
          <button onClick={onDelete} disabled={busy || !row.key} className="syn-btn-ghost text-xs">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <label className="block text-xs text-muted-foreground">Supabase URL</label>
      <input
        value={row.supabase_url}
        onChange={(e) => onChange({ ...row, supabase_url: e.target.value })}
        placeholder="https://xxxx.supabase.co"
        className="syn-input mono text-xs w-full"
      />

      <label className="block text-xs text-muted-foreground">Anon / Publishable Key</label>
      <textarea
        value={row.anon_key}
        onChange={(e) => onChange({ ...row, anon_key: e.target.value })}
        placeholder="eyJ…"
        className="syn-input mono text-[10px] w-full h-20"
      />

      <label className="block text-xs text-muted-foreground">
        Service Role Key {row.service_key_set ? "(gesetzt — leer lassen, um nicht zu überschreiben)" : "(optional)"}
      </label>
      <textarea
        value={serviceKey}
        onChange={(e) => setServiceKey(e.target.value)}
        placeholder="eyJ… (nur server-seitig genutzt)"
        className="syn-input mono text-[10px] w-full h-20"
      />

      <label className="block text-xs text-muted-foreground">Notiz</label>
      <input
        value={row.notes ?? ""}
        onChange={(e) => onChange({ ...row, notes: e.target.value })}
        className="syn-input w-full"
      />

      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground mono">
          zuletzt: {row.updated_by ?? "—"} · {new Date(row.updated_at).toLocaleString()}
        </span>
        <button
          onClick={() => onSave(serviceKey)}
          disabled={busy || !row.key || !row.supabase_url || !row.anon_key}
          className="syn-btn-primary text-sm"
        >
          <Save className="h-4 w-4" /> Speichern
        </button>
      </div>

      {row.supabase_url && (
        <a
          href={row.supabase_url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" /> Endpoint öffnen
        </a>
      )}
    </div>
  );
}
