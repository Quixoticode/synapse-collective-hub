import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ArrowRight, BookOpen, Newspaper, Briefcase, Zap, Radio, Rocket } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Markdown } from "@/components/Markdown";
import { docsListPublic } from "@/lib/docs.functions";
import { versionsListPublic } from "@/lib/versions.functions";
import { applyPositionsPublic } from "@/lib/apply.functions";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "xSyna Central – Kollektiv, News & Docs" },
      { name: "description", content: "News, Leaks, offene Stellen und Dokumentation des xSyna Kollektivs." },
      { property: "og:title", content: "xSyna Central" },
      { property: "og:description", content: "News, Leaks, offene Stellen und Dokumentation des xSyna Kollektivs." },
    ],
  }),
  component: PublicLanding,
});

type Doc = { id: string; slug: string; title: string; summary: string; category: string; cover_url: string | null };
type NewsItem = { id: string; version: string; title: string; notes_md: string; kind: string; visibility: string; published_at: string | null; feature_ids: string[]; bugfix_ids: string[] };
type Position = { id: string; department: string; team: string | null; position: string; hl_max: number; description: string | null };

function PublicLanding() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tab, setTab] = useState<"all" | "release" | "leak" | "insider">("all");
  const docsFn = useServerFn(docsListPublic);
  const newsFn = useServerFn(versionsListPublic);
  const posFn = useServerFn(applyPositionsPublic);

  useEffect(() => {
    void (async () => {
      try {
        const [d, n, p] = await Promise.all([
          docsFn() as Promise<Doc[]>,
          newsFn() as Promise<NewsItem[]>,
          posFn() as Promise<Position[]>,
        ]);
        setDocs(d); setNews(n); setPositions(p);
      } catch { /* silent */ }
    })();
  }, [docsFn, newsFn, posFn]);

  const filteredNews = tab === "all" ? news : news.filter((n) => n.kind === tab);

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-70"
             style={{ background: "radial-gradient(circle at 30% 20%, rgba(0,163,255,0.25), transparent 55%), radial-gradient(circle at 70% 80%, rgba(123,97,255,0.25), transparent 55%)" }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-16 sm:pt-20 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border syn-card text-[11px] mono mb-6">
            <Sparkles className="h-3 w-3" style={{ color: "var(--synapse)" }} /> Neuromorphic Refresh · v2026.07.05
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            Das <span className="syn-gradient-text">Kollektiv</span> im Netz.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            News, Leaks und Insider aus dem xSyna-Kosmos. Öffentliche Dokumentation zu Features & Partnerschaften. Und die offenen Stellen für alle, die mitgestalten wollen.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/docs" className="syn-btn"><BookOpen className="h-4 w-4" /> Docs entdecken</Link>
            <Link to="/apply" className="syn-btn-ghost"><Briefcase className="h-4 w-4" /> Offene Stellen</Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-24 space-y-16">

        {/* News feed */}
        <section>
          <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="h-5 w-5" /> News-Stream</h2>
              <p className="text-sm text-muted-foreground">Releases, Leaks und Insider — direkt aus dem Kollektiv.</p>
            </div>
            <div className="flex gap-1 syn-card p-1 rounded-full">
              {([
                { k: "all", label: "Alle", Icon: Radio },
                { k: "release", label: "Releases", Icon: Rocket },
                { k: "leak", label: "Leaks", Icon: Zap },
                { k: "insider", label: "Insider", Icon: Sparkles },
              ] as const).map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 transition ${tab === t.k ? "syn-tab-active font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                  <t.Icon className="h-3 w-3" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          {filteredNews.length === 0 ? (
            <div className="syn-card p-8 text-center text-sm text-muted-foreground">Noch nichts veröffentlicht.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredNews.map((n) => (
                <article key={n.id} className="syn-card p-5">
                  <div className="flex items-center gap-2 mb-1 text-[10px] mono uppercase">
                    <span className="syn-chip">v{n.version}</span>
                    <KindBadge kind={n.kind} />
                    {n.published_at && <span className="text-muted-foreground">{new Date(n.published_at).toLocaleDateString()}</span>}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{n.title}</h3>
                  {n.notes_md && (
                    <div className="text-sm text-muted-foreground line-clamp-6">
                      <Markdown>{n.notes_md}</Markdown>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Docs preview */}
        <section>
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Docs</h2>
              <p className="text-sm text-muted-foreground">Erklärungen zu Features, Partnerschaften und wie xSyna tickt.</p>
            </div>
            <Link to="/docs" className="syn-btn-ghost text-xs">Alle Docs <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {docs.length === 0 ? (
            <div className="syn-card p-8 text-center text-sm text-muted-foreground">Noch keine Docs veröffentlicht.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.slice(0, 6).map((d) => (
                <Link key={d.id} to="/docs/$slug" params={{ slug: d.slug }} className="syn-card p-4 hover:border-cyan-400/40 transition group">
                  {d.cover_url && <img src={d.cover_url} alt="" className="w-full h-32 object-cover rounded-xl mb-3" loading="lazy" />}
                  <div className="text-[10px] mono uppercase text-muted-foreground mb-1">{d.category}</div>
                  <h3 className="font-semibold group-hover:text-cyan-300 transition">{d.title}</h3>
                  {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Positions */}
        <section>
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-5 w-5" /> Offene Stellen</h2>
              <p className="text-sm text-muted-foreground">Werde Teil des Kollektivs — bewirb dich direkt.</p>
            </div>
            <Link to="/apply" className="syn-btn text-xs">Bewerben <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {positions.length === 0 ? (
            <div className="syn-card p-8 text-center text-sm text-muted-foreground">Aktuell keine offenen Stellen.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.slice(0, 6).map((p) => (
                <Link key={p.id} to="/apply" className="syn-card p-4 hover:border-cyan-400/40 transition">
                  <div className="text-[10px] mono uppercase text-muted-foreground">{p.department}{p.team ? ` · ${p.team}` : ""}</div>
                  <h3 className="font-semibold mt-1">{p.position}</h3>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="mt-2 syn-chip">HL max {p.hl_max}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground">
          xSyna Central · Neuromorphic Refresh · <Link to="/auth" className="hover:text-foreground underline decoration-dotted">Login</Link>
        </footer>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const styles: Record<string, { label: string; bg: string; fg: string }> = {
    release: { label: "Release", bg: "rgba(52,211,153,0.15)", fg: "#5EEAD4" },
    leak:    { label: "Leak",    bg: "rgba(245,158,11,0.15)", fg: "#FCD34D" },
    insider: { label: "Insider", bg: "rgba(244,114,182,0.15)", fg: "#F472B6" },
  };
  const s = styles[kind] || styles.release;
  return <span className="px-2 py-0.5 rounded-full text-[10px] mono" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}
