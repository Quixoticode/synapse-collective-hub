import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { docsListPublic } from "@/lib/docs.functions";

export const Route = createFileRoute("/docs/")({
  ssr: false,
  component: DocsIndex,
});

type Doc = { id: string; slug: string; title: string; summary: string; category: string; cover_url: string | null };

const CATS: { key: string; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "feature", label: "Features" },
  { key: "customer", label: "Kunden" },
  { key: "employee", label: "Mitarbeiter" },
  { key: "partnership", label: "Partner" },
  { key: "other", label: "Sonstiges" },
];

function DocsIndex() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cat, setCat] = useState("all");
  const listFn = useServerFn(docsListPublic);

  useEffect(() => {
    void (async () => { try { setDocs((await listFn()) as Doc[]); } catch { /* silent */ } })();
  }, [listFn]);

  const filtered = cat === "all" ? docs : docs.filter((d) => d.category === cat);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3"><BookOpen className="h-8 w-8" style={{ color: "var(--synapse)" }} /> Docs</h1>
        <p className="text-sm text-muted-foreground mt-2">Alle öffentlichen Dokumentationen des xSyna Kollektivs.</p>
      </header>

      <div className="flex flex-wrap gap-1 mb-6">
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${cat === c.key ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="syn-card p-10 text-center text-sm text-muted-foreground">Keine Docs in dieser Kategorie.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Link key={d.id} to="/docs/$slug" params={{ slug: d.slug }} className="syn-card p-4 hover:border-cyan-400/40 transition group">
              {d.cover_url && <img src={d.cover_url} alt="" className="w-full h-36 object-cover rounded-xl mb-3" loading="lazy" />}
              <div className="text-[10px] mono uppercase text-muted-foreground mb-1">{d.category}</div>
              <h3 className="font-semibold group-hover:text-cyan-300 transition">{d.title}</h3>
              {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{d.summary}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
