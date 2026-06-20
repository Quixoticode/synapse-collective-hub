import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Newspaper, Pencil, Trash2, X, Sparkles, Wrench, Map } from "lucide-react";
import { versionsList, versionsUpsert, versionsDelete, roadmapList, roadmapUpsert, roadmapDelete } from "@/lib/versions.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/news")({
  ssr: false,
  component: NewsPage,
});

type Version = { id: string; version: string; title: string; notes_md: string; bugfix_ids: string[]; feature_ids: string[]; published: boolean; published_at: string|null; created_at: string };
type Roadmap = { id: string; title: string; description: string; status: "planned"|"in_progress"|"done"|"cancelled"; target_quarter: string|null; sort_order: number };

function NewsPage() {
  const session = getSession();
  const canEdit = !!session?.isSuperuser;
  const canEditRoadmap = canEdit || (session && session.hl >= 5);

  const listV = useServerFn(versionsList);
  const saveV = useServerFn(versionsUpsert);
  const delV = useServerFn(versionsDelete);
  const listR = useServerFn(roadmapList);
  const saveR = useServerFn(roadmapUpsert);
  const delR = useServerFn(roadmapDelete);

  const [versions, setVersions] = useState<Version[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap[]>([]);
  const [editV, setEditV] = useState<Partial<Version> & { _bugfixCsv?: string; _featureCsv?: string } | null>(null);
  const [editR, setEditR] = useState<Partial<Roadmap> | null>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const [v, r] = await Promise.all([listV({ data: c }) as Promise<Version[]>, listR({ data: c }) as Promise<Roadmap[]>]);
    setVersions(v); setRoadmap(r);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  async function saveVersion() {
    if (!editV?.version || !editV?.title) return;
    const c = getCredentials(); if (!c) return;
    await saveV({ data: {
      ...c, id: editV.id, version: editV.version!, title: editV.title!, notes_md: editV.notes_md || "",
      bugfix_ids: (editV._bugfixCsv ?? editV.bugfix_ids?.join(",") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      feature_ids: (editV._featureCsv ?? editV.feature_ids?.join(",") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      published: !!editV.published,
    } });
    setEditV(null); await reload();
  }

  async function saveRoadmap() {
    if (!editR?.title) return;
    const c = getCredentials(); if (!c) return;
    await saveR({ data: {
      ...c, id: editR.id, title: editR.title!, description: editR.description || "",
      status: (editR.status || "planned") as Roadmap["status"],
      target_quarter: editR.target_quarter || null, sort_order: Number(editR.sort_order) || 0,
    } });
    setEditR(null); await reload();
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-28 md:pb-8 space-y-8">
      <section>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center mb-3">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate"><Newspaper className="h-5 w-5 shrink-0" /> News &amp; Updates</h1>
          {canEdit && <button className="syn-btn shrink-0" onClick={() => setEditV({ version: "", title: "", notes_md: "", bugfix_ids: [], feature_ids: [], published: true })}><Plus className="h-4 w-4" /> Version</button>}
        </div>
        <div className="space-y-3">
          {versions.filter((v) => v.published || canEdit).map((v) => (
            <div key={v.id} className="syn-card p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[10px] mono uppercase text-cyan-300">v{v.version}{!v.published && " · DRAFT"}</div>
                  <h3 className="font-semibold">{v.title}</h3>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button className="syn-btn-ghost" onClick={() => setEditV({ ...v, _bugfixCsv: v.bugfix_ids.join(", "), _featureCsv: v.feature_ids.join(", ") })}><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="syn-btn-ghost" onClick={async () => { if (!confirm("Löschen?")) return; const c = getCredentials(); if (!c) return; await delV({ data: { ...c, id: v.id } }); await reload(); }}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
              {v.notes_md && <p className="text-sm whitespace-pre-wrap mt-2 text-muted-foreground">{v.notes_md}</p>}
              {(v.bugfix_ids.length > 0 || v.feature_ids.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.bugfix_ids.map((id) => <span key={id} className="syn-chip"><Wrench className="h-2.5 w-2.5" /> {id}</span>)}
                  {v.feature_ids.map((id) => <span key={id} className="syn-chip"><Sparkles className="h-2.5 w-2.5" /> {id}</span>)}
                </div>
              )}
            </div>
          ))}
          {versions.length === 0 && <div className="text-sm text-muted-foreground">Noch keine Versionen.</div>}
        </div>
      </section>

      <section>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 truncate"><Map className="h-4 w-4 shrink-0" /> Roadmap</h2>
          {canEditRoadmap && <button className="syn-btn-ghost shrink-0" onClick={() => setEditR({ title: "", description: "", status: "planned", sort_order: 0 })}><Plus className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["planned","in_progress","done"] as const).map((col) => (
            <div key={col} className="syn-card p-3">
              <div className="text-[10px] mono uppercase text-muted-foreground mb-2">
                {col === "planned" ? "Geplant" : col === "in_progress" ? "In Arbeit" : "Fertig"}
              </div>
              <div className="space-y-2">
                {roadmap.filter((r) => r.status === col).map((r) => (
                  <button key={r.id} onClick={() => canEditRoadmap && setEditR(r)} className="w-full text-left rounded-xl p-2 border border-border hover:border-cyan-400/40">
                    <div className="text-sm font-medium">{r.title}</div>
                    {r.target_quarter && <div className="text-[10px] mono text-muted-foreground">{r.target_quarter}</div>}
                    {r.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</div>}
                  </button>
                ))}
                {roadmap.filter((r) => r.status === col).length === 0 && <div className="text-[11px] text-muted-foreground">—</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {editV && (
        <Modal title={editV.id ? "Version bearbeiten" : "Neue Version"} onClose={() => setEditV(null)}>
          <div className="grid grid-cols-2 gap-2">
            <input className="syn-input" placeholder="Version (z.B. 2026.06.20)" value={editV.version || ""} onChange={(e) => setEditV({ ...editV, version: e.target.value })} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!editV.published} onChange={(e) => setEditV({ ...editV, published: e.target.checked })} /> veröffentlicht</label>
          </div>
          <input className="syn-input" placeholder="Titel" value={editV.title || ""} onChange={(e) => setEditV({ ...editV, title: e.target.value })} />
          <textarea className="syn-input min-h-32" placeholder="Release Notes (Markdown)" value={editV.notes_md || ""} onChange={(e) => setEditV({ ...editV, notes_md: e.target.value })} />
          <input className="syn-input" placeholder="Bugfix-IDs (kommagetrennt, z.B. A-20062601, A-20062602)" value={editV._bugfixCsv ?? editV.bugfix_ids?.join(", ") ?? ""} onChange={(e) => setEditV({ ...editV, _bugfixCsv: e.target.value })} />
          <input className="syn-input" placeholder="Feature-IDs (kommagetrennt, z.B. I-20062601)" value={editV._featureCsv ?? editV.feature_ids?.join(", ") ?? ""} onChange={(e) => setEditV({ ...editV, _featureCsv: e.target.value })} />
          <button className="syn-btn w-full" onClick={saveVersion}>Speichern</button>
        </Modal>
      )}
      {editR && (
        <Modal title={editR.id ? "Roadmap-Eintrag" : "Neuer Eintrag"} onClose={() => setEditR(null)}>
          <input className="syn-input" placeholder="Titel" value={editR.title || ""} onChange={(e) => setEditR({ ...editR, title: e.target.value })} />
          <textarea className="syn-input" placeholder="Beschreibung" value={editR.description || ""} onChange={(e) => setEditR({ ...editR, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="syn-input" value={editR.status || "planned"} onChange={(e) => setEditR({ ...editR, status: e.target.value as Roadmap["status"] })}>
              <option value="planned">Geplant</option><option value="in_progress">In Arbeit</option><option value="done">Fertig</option><option value="cancelled">Verworfen</option>
            </select>
            <input className="syn-input" placeholder="Quartal (z.B. Q3/26)" value={editR.target_quarter || ""} onChange={(e) => setEditR({ ...editR, target_quarter: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className="syn-btn flex-1" onClick={saveRoadmap}>Speichern</button>
            {editR.id && <button className="syn-btn-ghost" onClick={async () => { if (!confirm("Löschen?")) return; const c = getCredentials(); if (!c) return; await delR({ data: { ...c, id: editR.id! } }); setEditR(null); await reload(); }}><Trash2 className="h-4 w-4" /></button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="syn-card w-full max-w-xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
