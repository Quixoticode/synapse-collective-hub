import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X, Trash2, Pencil, FileText, Search } from "lucide-react";
import { wsList, wsUpsert, wsDelete } from "@/lib/workspace.functions";
import { getSession, getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/workspace")({
  ssr: false,
  component: WorkspacePage,
});

type Doc = {
  id: string; title: string; content_md: string; tags: string[];
  visibility: "private" | "team" | "all"; owner_slid: string; updated_at: string;
};

function WorkspacePage() {
  const session = getSession();
  const listFn = useServerFn(wsList);
  const saveFn = useServerFn(wsUpsert);
  const delFn = useServerFn(wsDelete);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
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

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return docs.filter((d) =>
      !s || d.title.toLowerCase().includes(s) || d.content_md.toLowerCase().includes(s) || d.tags.some((t) => t.toLowerCase().includes(s)),
    );
  }, [docs, q]);

  async function save() {
    if (!editing?.title) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true);
    try {
      await saveFn({
        data: {
          ...c, id: editing.id, title: editing.title!, content_md: editing.content_md || "",
          tags: editing.tags || [], visibility: editing.visibility || "team",
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

  // Mobile: show list OR active doc, not both.
  const [mobileView, setMobileView] = useState<"list"|"doc">("list");

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-110px)] md:min-h-[100dvh] pb-28 md:pb-0">
      <div className={`${active && mobileView === "doc" ? "hidden md:flex" : "flex"} md:w-80 w-full md:border-r border-border flex-col`}>
        <div className="p-4 border-b border-border space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold flex items-center gap-2 min-w-0 truncate"><FileText className="h-4 w-4 shrink-0" /> Workspace</h2>
            <button className="syn-btn-ghost shrink-0" onClick={() => setEditing({ title: "", content_md: "", tags: [], visibility: "team" })}><Plus className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="syn-input pl-8" placeholder="Suchen…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => { setActive(d); setMobileView("doc"); }}
              className={`w-full text-left px-3 py-2 rounded-xl ${active?.id === d.id ? "syn-tab-active" : "hover:bg-accent"}`}>
              <div className="text-sm font-medium truncate">{d.title}</div>
              <div className="text-[10px] mono text-muted-foreground">{d.visibility} · {new Date(d.updated_at).toLocaleDateString()}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-xs text-muted-foreground p-3">Keine Dokumente.</div>}
        </div>
      </div>

      <div className={`${active && mobileView === "doc" ? "flex" : "hidden md:flex"} flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 flex-col`}>
        {active ? (
          <div className="max-w-3xl w-full">
            <button className="syn-btn-ghost md:hidden mb-3 text-xs" onClick={() => setMobileView("list")}>← Liste</button>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h1 className="text-xl sm:text-2xl font-bold min-w-0 truncate">{active.title}</h1>
              <div className="flex gap-1 shrink-0">
                {(active.owner_slid === session?.slid || session?.isSuperuser) && (
                  <>
                    <button className="syn-btn-ghost" onClick={() => setEditing(active)}><Pencil className="h-4 w-4" /></button>
                    <button className="syn-btn-ghost" onClick={() => void remove(active.id)}><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {active.tags.map((t) => <span key={t} className="syn-chip">{t}</span>)}
            </div>
            <pre className="syn-card p-4 sm:p-5 whitespace-pre-wrap font-sans text-sm leading-relaxed">{active.content_md}</pre>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">Wähle ein Dokument oder erstelle eines.</div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing.id ? "Dokument bearbeiten" : "Neues Dokument"}</h3>
              <button onClick={() => setEditing(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="Titel *" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <input className="syn-input" placeholder="Tags (kommagetrennt)" value={(editing.tags || []).join(", ")}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <select className="syn-input" value={editing.visibility || "team"}
              onChange={(e) => setEditing({ ...editing, visibility: e.target.value as Doc["visibility"] })}>
              <option value="private">Privat (nur ich)</option>
              <option value="team">Team (alle Mitglieder)</option>
              <option value="all">Alle eingeloggten</option>
            </select>
            <textarea className="syn-input min-h-72 font-mono text-xs" placeholder="Inhalt (Markdown)…"
              value={editing.content_md || ""} onChange={(e) => setEditing({ ...editing, content_md: e.target.value })} />
            <button className="syn-btn w-full" disabled={busy || !editing.title} onClick={() => void save()}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}
