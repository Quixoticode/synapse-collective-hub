import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import { docsListAll, docsUpsert, docsDelete } from "@/lib/docs.functions";
import { myPermissions } from "@/lib/permissions.functions";
import { getSession, getCredentials } from "@/lib/syn-session";
import { useSync } from "@/lib/use-sync";
import { SyncSpinner } from "@/components/SyncSpinner";

export const Route = createFileRoute("/_authenticated/docs-admin")({
  ssr: false,
  component: DocsAdmin,
});

type Doc = { id: string; slug: string; title: string; summary: string; category: string; body_md: string; cover_url: string | null; sort_order: number; published: boolean };

function DocsAdmin() {
  const session = getSession();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [edit, setEdit] = useState<Partial<Doc> | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());
  const canEdit = !!session?.isSuperuser || allowedFeatures.has("docs.manage");
  const listFn = useServerFn(docsListAll);
  const saveFn = useServerFn(docsUpsert);
  const delFn = useServerFn(docsDelete);
  const permsFn = useServerFn(myPermissions);
  const { run, syncing, error } = useSync();

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const r = await run(listFn({ data: c }) as Promise<Doc[]>);
    if (r) setDocs(r);
    try { const feats = await permsFn({ data: c }) as { features: string[] }; setAllowedFeatures(new Set(feats.features)); } catch { /* not permitted */ }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  async function save() {
    if (!edit?.slug || !edit?.title) return;
    const c = getCredentials(); if (!c) return;
    await run(saveFn({ data: {
      ...c, id: edit.id, slug: edit.slug!, title: edit.title!,
      summary: edit.summary || "", category: (edit.category || "feature") as Doc["category"],
      body_md: edit.body_md || "", cover_url: edit.cover_url || null,
      sort_order: Number(edit.sort_order) || 0, published: !!edit.published,
    } }));
    setEdit(null); await reload();
  }

  async function remove(id: string) {
    if (!confirm("Doc wirklich löschen?")) return;
    const c = getCredentials(); if (!c) return;
    await run(delFn({ data: { ...c, id } }));
    await reload();
  }

  if (!canEdit) return <div className="p-8 text-sm text-muted-foreground">Keine Berechtigung.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-28 md:pb-8 space-y-4">
      <header className="flex items-center gap-3">
        <BookOpen className="h-6 w-6" style={{ color: "var(--synapse)" }} />
        <div className="flex-1"><h1 className="text-xl sm:text-2xl font-bold">Docs verwalten</h1></div>
        <button className="syn-btn" onClick={() => setEdit({ slug: "", title: "", summary: "", category: "feature", body_md: "", sort_order: 0, published: false })}>
          <Plus className="h-4 w-4" /> Neu
        </button>
      </header>
      {error && <div className="text-xs text-destructive mono">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map((d) => (
          <div key={d.id} className="syn-card p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] mono uppercase text-muted-foreground flex items-center gap-2">
                  {d.category} · #{d.sort_order}
                  {d.published ? <span className="text-emerald-300 flex items-center gap-0.5"><Eye className="h-3 w-3" /> live</span>
                               : <span className="text-amber-300 flex items-center gap-0.5"><EyeOff className="h-3 w-3" /> draft</span>}
                </div>
                <div className="font-semibold truncate">{d.title}</div>
                <div className="text-[10px] mono text-muted-foreground truncate">/{d.slug}</div>
              </div>
              <div className="flex flex-col gap-1">
                <button className="syn-btn-ghost text-xs" onClick={() => setEdit(d)}><Pencil className="h-3 w-3" /></button>
                <button className="syn-btn-ghost text-xs" onClick={() => void remove(d.id)}><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        ))}
        {docs.length === 0 && <div className="text-sm text-muted-foreground">Noch keine Docs.</div>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="syn-card w-full max-w-2xl p-5 space-y-3 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{edit.id ? "Doc bearbeiten" : "Neues Doc"}</h3>
              <button onClick={() => setEdit(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="syn-input" placeholder="slug-mit-bindestrich" value={edit.slug || ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} />
              <select className="syn-input" value={edit.category || "feature"} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                <option value="feature">Feature</option>
                <option value="customer">Kunden</option>
                <option value="employee">Mitarbeiter</option>
                <option value="partnership">Partner</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>
            <input className="syn-input" placeholder="Titel" value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <input className="syn-input" placeholder="Kurzbeschreibung" value={edit.summary || ""} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
            <input className="syn-input" placeholder="Cover-URL (optional)" value={edit.cover_url || ""} onChange={(e) => setEdit({ ...edit, cover_url: e.target.value })} />
            <textarea className="syn-input min-h-64" placeholder="Inhalt (Markdown) — # Überschriften, **fett**, - Listen, Bilder ![alt](url)" value={edit.body_md || ""} onChange={(e) => setEdit({ ...edit, body_md: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="syn-input" placeholder="Sortierung" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> veröffentlicht</label>
            </div>
            <button className="syn-btn w-full" onClick={() => void save()}>Speichern</button>
          </div>
        </div>
      )}
      {syncing && <SyncSpinner />}
    </div>
  );
}
