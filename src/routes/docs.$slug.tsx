import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { docsGetPublic } from "@/lib/docs.functions";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/docs/$slug")({
  ssr: false,
  component: DocDetail,
});

type Doc = { id: string; slug: string; title: string; summary: string; category: string; cover_url: string | null; body_md: string; updated_at: string };

function DocDetail() {
  const { slug } = Route.useParams();
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined);
  const getFn = useServerFn(docsGetPublic);

  useEffect(() => {
    void (async () => { try { setDoc(((await getFn({ data: { slug } })) as Doc) ?? null); } catch { setDoc(null); } })();
  }, [slug, getFn]);

  if (doc === undefined) return <div className="max-w-3xl mx-auto p-10 text-sm text-muted-foreground">Lade…</div>;
  if (doc === null) return (
    <div className="max-w-3xl mx-auto p-10 text-center">
      <h1 className="text-2xl font-bold">Doc nicht gefunden</h1>
      <Link to="/docs" className="syn-btn-ghost mt-4 inline-flex"><ArrowLeft className="h-3.5 w-3.5" /> Zurück</Link>
    </div>
  );

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/docs" className="syn-btn-ghost text-xs mb-6"><ArrowLeft className="h-3.5 w-3.5" /> Alle Docs</Link>
      {doc.cover_url && <img src={doc.cover_url} alt="" className="w-full max-h-80 object-cover rounded-2xl mb-6" />}
      <div className="text-[11px] mono uppercase text-muted-foreground mb-2">{doc.category}</div>
      <h1 className="text-3xl sm:text-4xl font-bold">{doc.title}</h1>
      {doc.summary && <p className="text-lg text-muted-foreground mt-3">{doc.summary}</p>}
      <div className="text-[11px] mono text-muted-foreground mt-2">Aktualisiert: {new Date(doc.updated_at).toLocaleDateString()}</div>
      <div className="mt-8">
        <Markdown>{doc.body_md}</Markdown>
      </div>
    </article>
  );
}
