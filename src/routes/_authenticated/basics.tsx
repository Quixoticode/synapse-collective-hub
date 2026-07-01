import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus, X, Pin, Trash2, Pencil, Scale, FileSignature, Info } from "lucide-react";
import { basicsList, basicsUpsert, basicsDelete } from "@/lib/basics.functions";
import { getSession, getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/basics")({
  ssr: false,
  component: BasicsPage,
});

type Doc = {
  id: string; slug: string; title: string; kind: "rule" | "agb" | "contract" | "info";
  body_md: string; file_url: string | null; pinned: boolean; updated_at: string;
};

const KIND_ICON = { rule: Scale, agb: FileSignature, contract: FileSignature, info: Info };
const KIND_LABEL = { rule: "Regel", agb: "AGB", contract: "Vertrag", info: "Info" };

function BasicsPage() {
  const session = getSession();
  const canEdit = !!session && (session.isSuperuser || session.hl >= 5);
  const listFn = useServerFn(basicsList);
  const saveFn = useServerFn(basicsUpsert);
  const delFn = useServerFn(basicsDelete);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [editing, setEditing] = useState<Partial<Doc> | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const c = getCredentials();
    if (!c) return;
    const r = (await listFn({ data: c })) as Doc[];
    setDocs(r);
    if (!active && r.length) setActive(r[0]);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  async function save() {
    if (!editing?.title || !editing?.slug) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true);
    try {
      await saveFn({
        data: {
          ...c, id: editing.id, slug: editing.slug!, title: editing.title!,
          kind: editing.kind || "info", body_md: editing.body_md || "",
          file_url: editing.file_url ?? null, pinned: !!editing.pinned,
        },
      });
      setEditing(null);
      await reload();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Dokument löschen?")) return;
    const c = getCredentials();
    if (!c) return;
    await delFn({ data: { ...c, id } });
    setActive(null);
    await reload();
  }

  return (
    <div className="min-h-[calc(100dvh-110px)] md:h-screen flex flex-col md:flex-row pb-20 md:pb-0">
      <div className={`${active ? "hidden md:flex" : "flex"} md:w-80 w-full md:border-r border-border flex-col`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> xSyna Basics</h2>
          {canEdit && (
            <button className="syn-btn-ghost" onClick={() => setEditing({ kind: "info", pinned: false })}><Plus className="h-4 w-4" /></button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {docs.map((d) => {
            const Icon = KIND_ICON[d.kind];
            return (
              <button key={d.id} onClick={() => setActive(d)}
                className={`w-full text-left px-3 py-2 rounded-xl ${active?.id === d.id ? "syn-tab-active" : "hover:bg-accent"}`}>
                <div className="flex items-center gap-2">
                  {d.pinned && <Pin className="h-3 w-3" style={{ color: "var(--neural-pink)" }} />}
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium truncate">{d.title}</span>
                </div>
                <div className="text-[10px] mono text-muted-foreground ml-5">{KIND_LABEL[d.kind]}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${active ? "flex" : "hidden md:flex"} flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 flex-col`}>
        {active ? (
          <div className="max-w-3xl w-full">
            <button onClick={() => setActive(null)} className="syn-btn-ghost md:hidden text-xs mb-3">← Liste</button>
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate">{active.pinned && <Pin className="h-5 w-5 shrink-0" style={{ color: "var(--neural-pink)" }} />}<span className="truncate">{active.title}</span></h1>
                <div className="text-xs mono text-muted-foreground mt-1">{KIND_LABEL[active.kind]} · /{active.slug}</div>
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button className="syn-btn-ghost" onClick={() => setEditing(active)}><Pencil className="h-4 w-4" /></button>
                  <button className="syn-btn-ghost" onClick={() => void remove(active.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            {active.file_url && <a className="text-xs text-[var(--synapse)] block mb-3" href={active.file_url} target="_blank" rel="noreferrer">{active.file_url}</a>}
            <pre className="syn-card p-4 sm:p-5 whitespace-pre-wrap font-sans text-sm leading-relaxed">{active.body_md}</pre>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">Wähle ein Dokument.</div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? "Bearbeiten" : "Neues Dokument"}</h3>
              <button onClick={() => setEditing(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="syn-input" placeholder="Slug *" value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              <select className="syn-input" value={editing.kind || "info"} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Doc["kind"] })}>
                <option value="info">Info</option>
                <option value="rule">Regel</option>
                <option value="agb">AGB</option>
                <option value="contract">Vertrag</option>
              </select>
            </div>
            <input className="syn-input" placeholder="Titel *" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <input className="syn-input" placeholder="Datei-URL (optional)" value={editing.file_url || ""} onChange={(e) => setEditing({ ...editing, file_url: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.pinned} onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })} />
              Anpinnen
            </label>
            <textarea className="syn-input min-h-72 font-mono text-xs" placeholder="Inhalt (Markdown)…"
              value={editing.body_md || ""} onChange={(e) => setEditing({ ...editing, body_md: e.target.value })} />
            <button className="syn-btn w-full" disabled={busy || !editing.title || !editing.slug} onClick={() => void save()}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}
