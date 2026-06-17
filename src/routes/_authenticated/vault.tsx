import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X, Trash2, Eye, EyeOff, Copy, KeyRound, Pencil } from "lucide-react";
import { vaultList, vaultUpsert, vaultDelete } from "@/lib/vault.functions";
import { getSession, getCredentials, vaultEncrypt, vaultDecrypt } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/vault")({
  ssr: false,
  component: VaultPage,
});

type Entry = {
  id: string; owner_slid: string; label: string; url: string | null; username: string | null;
  secret_enc: string; secret_iv: string; notes: string | null; created_at: string; updated_at: string;
};

function VaultPage() {
  const session = getSession();
  const listFn = useServerFn(vaultList);
  const saveFn = useServerFn(vaultUpsert);
  const delFn = useServerFn(vaultDelete);

  const [rows, setRows] = useState<Entry[]>([]);
  const [shown, setShown] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Partial<Entry> & { secret?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const c = getCredentials();
    if (!c) return;
    const r = await listFn({ data: c });
    setRows(r as Entry[]);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  async function reveal(e: Entry) {
    if (shown[e.id]) { const x = { ...shown }; delete x[e.id]; setShown(x); return; }
    const pt = await vaultDecrypt(e.secret_enc, e.secret_iv, session?.pik || "");
    setShown({ ...shown, [e.id]: pt ?? "[Fehler: PIK passt nicht]" });
  }

  async function save() {
    if (!editing || !editing.label || !editing.secret) return;
    const c = getCredentials();
    if (!c || !session) return;
    setBusy(true);
    try {
      const { secret_enc, secret_iv } = await vaultEncrypt(editing.secret, session.pik);
      await saveFn({
        data: {
          ...c, id: editing.id, label: editing.label, url: editing.url ?? null,
          username: editing.username ?? null, notes: editing.notes ?? null,
          secret_enc, secret_iv,
        },
      });
      setEditing(null);
      await reload();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Eintrag löschen?")) return;
    const c = getCredentials();
    if (!c) return;
    await delFn({ data: { ...c, id } });
    await reload();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6" style={{ color: "var(--neural-mint)" }} /> Passwort-Tresor</h1>
          <p className="text-sm text-muted-foreground">Verschlüsselt mit deinem PIK. Der Server sieht nur Ciphertext.</p>
        </div>
        <button className="syn-btn" onClick={() => setEditing({ label: "", secret: "" })}><Plus className="h-4 w-4" /> Neuer Eintrag</button>
      </div>

      <div className="grid gap-3">
        {rows.map((e) => (
          <div key={e.id} className="syn-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{e.label}</div>
                {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--synapse)] truncate block">{e.url}</a>}
                {e.username && <div className="text-xs mono text-muted-foreground mt-1">{e.username}</div>}
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs mono bg-black/30 px-2 py-1 rounded-md flex-1 truncate">
                    {shown[e.id] ?? "••••••••••••"}
                  </code>
                  <button className="syn-btn-ghost" onClick={() => void reveal(e)}>
                    {shown[e.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {shown[e.id] && (
                    <button className="syn-btn-ghost" onClick={() => navigator.clipboard.writeText(shown[e.id])}>
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {e.notes && <div className="text-xs text-muted-foreground mt-2">{e.notes}</div>}
              </div>
              <div className="flex gap-1">
                <button className="syn-btn-ghost" onClick={async () => {
                  const pt = await vaultDecrypt(e.secret_enc, e.secret_iv, session?.pik || "");
                  setEditing({ ...e, secret: pt ?? "" });
                }}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="syn-btn-ghost" onClick={() => void remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="syn-card p-8 text-center text-muted-foreground">Tresor leer.</div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h3>
              <button onClick={() => setEditing(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="Bezeichnung *" value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            <input className="syn-input" placeholder="URL" value={editing.url || ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />
            <input className="syn-input" placeholder="Benutzername" value={editing.username || ""} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
            <input className="syn-input" type="text" placeholder="Passwort / Secret *" value={editing.secret || ""} onChange={(e) => setEditing({ ...editing, secret: e.target.value })} />
            <textarea className="syn-input min-h-24" placeholder="Notizen" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <button className="syn-btn w-full" disabled={busy || !editing.label || !editing.secret} onClick={() => void save()}>
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
