import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature, ArrowLeft, Plus, Trash2, X, Eye } from "lucide-react";
import { pdfTemplatesList, pdfTemplateUpsert, pdfTemplateDelete } from "@/lib/pdf-templates.functions";
import { getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/settings/pdf")({
  ssr: false,
  component: PdfTemplatesPage,
});

type Tpl = { id: string; name: string; kind: "contract"|"invoice"|"offer"|"confirmation"|"generic"; html: string; css: string|null; is_default: boolean };

const DEFAULT_HTML = `<header><h1>{{title}}</h1><p class="meta">Datum: {{today}}</p></header>
<section>
  <p>Hallo {{recipient}},</p>
  <p>{{body}}</p>
</section>
<footer>xSyna Central · {{today}}</footer>`;
const DEFAULT_CSS = `body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:22mm 20mm;}
h1{color:#00A3FF;margin:0 0 4mm;}
.meta{color:#666;font-size:10pt;margin-bottom:8mm;}
footer{margin-top:20mm;font-size:8pt;color:#888;border-top:1px solid #eee;padding-top:4mm;}`;

function PdfTemplatesPage() {
  const listFn = useServerFn(pdfTemplatesList);
  const saveFn = useServerFn(pdfTemplateUpsert);
  const delFn = useServerFn(pdfTemplateDelete);
  const [items, setItems] = useState<Tpl[]>([]);
  const [edit, setEdit] = useState<Partial<Tpl> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    try { setItems(await listFn({ data: c }) as Tpl[]); } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const preview = edit ? renderPreview(edit) : "";

  async function save() {
    if (!edit?.name || !edit?.kind || !edit?.html) return;
    const c = getCredentials(); if (!c) return;
    try {
      await saveFn({ data: { ...c, id: edit.id, name: edit.name!, kind: edit.kind as Tpl["kind"], html: edit.html!, css: edit.css || null, is_default: !!edit.is_default } });
      setEdit(null); await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 md:pb-8">
      <header className="mb-4 flex items-center gap-3">
        <FileSignature className="h-6 w-6" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">PDF-Vorlagen</h1>
          <p className="text-xs text-muted-foreground">Eigene Druckvorlagen mit Platzhaltern <code className="mono">{"{{title}}"}</code>, <code className="mono">{"{{recipient}}"}</code>, <code className="mono">{"{{body}}"}</code>, <code className="mono">{"{{today}}"}</code>.</p>
        </div>
        <Link to="/settings" className="syn-btn-ghost text-xs shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Einstellungen</Link>
      </header>

      <button onClick={() => setEdit({ name: "Neue Vorlage", kind: "contract", html: DEFAULT_HTML, css: DEFAULT_CSS, is_default: false })} className="syn-btn mb-4">
        <Plus className="h-4 w-4" /> Neue Vorlage
      </button>

      {err && <div className="mb-3 text-xs text-destructive mono">{err}</div>}

      <div className="grid gap-2">
        {items.length === 0 && <div className="text-sm text-muted-foreground">Noch keine Vorlagen. Bis dahin wird die Standardvorlage verwendet.</div>}
        {items.map((t) => (
          <div key={t.id} className="syn-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{t.name} {t.is_default && <span className="syn-chip text-[10px] ml-1">Standard</span>}</div>
              <div className="text-[11px] mono text-muted-foreground">{t.kind}</div>
            </div>
            <button onClick={() => setEdit(t)} className="syn-btn-ghost text-xs">Edit</button>
            <button onClick={async () => { if (!confirm("Löschen?")) return; const c = getCredentials(); if (!c) return; await delFn({ data: { ...c, id: t.id } }); await reload(); }} className="syn-btn-ghost text-xs">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 grid place-items-center">
          <div className="syn-card w-full max-w-5xl h-[85dvh] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input className="syn-input flex-1" placeholder="Name" value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <select className="syn-input max-w-[180px]" value={edit.kind || "contract"} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Tpl["kind"] })}>
                <option value="contract">Vertrag</option>
                <option value="invoice">Rechnung</option>
                <option value="offer">Angebot</option>
                <option value="confirmation">Bestätigung</option>
                <option value="generic">Sonstige</option>
              </select>
              <label className="text-xs flex items-center gap-1 shrink-0"><input type="checkbox" checked={!!edit.is_default} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} /> Standard</label>
              <button onClick={() => setEdit(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
              <div className="flex flex-col gap-2 min-h-0">
                <label className="text-xs mono uppercase text-muted-foreground">HTML</label>
                <textarea className="syn-input flex-1 min-h-[30vh]" value={edit.html || ""} onChange={(e) => setEdit({ ...edit, html: e.target.value })} />
                <label className="text-xs mono uppercase text-muted-foreground">CSS</label>
                <textarea className="syn-input flex-1 min-h-[20vh]" value={edit.css || ""} onChange={(e) => setEdit({ ...edit, css: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 min-h-0">
                <label className="text-xs mono uppercase text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Vorschau</label>
                <iframe title="Vorschau" srcDoc={preview} className="flex-1 bg-white rounded-2xl border border-border" />
              </div>
            </div>
            <button className="syn-btn" onClick={() => void save()}>Speichern</button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderPreview(t: Partial<Tpl>) {
  const html = (t.html || "").replace(/\{\{(\w+)\}\}/g, (_m, k) => ({
    title: "Muster-Titel", recipient: "Max Mustermann", body: "Dies ist ein Beispieltext.",
    today: new Date().toLocaleDateString("de-DE"),
  }[k as string] ?? ""));
  return `<!doctype html><html><head><meta charset="utf-8"><style>${t.css || ""}</style></head><body>${html}</body></html>`;
}
