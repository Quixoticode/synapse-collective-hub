import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Send, X, Users } from "lucide-react";
import { notifList, notifMarkRead, notifSend } from "@/lib/notify.functions";
import { tasksPeople } from "@/lib/tasks.functions";
import { getSession, getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/notify")({
  ssr: false,
  component: NotifyPage,
});

type Notif = { id: string; title: string; body: string | null; url: string | null; source: string; sender_slid: string | null; read_at: string | null; created_at: string };
type Person = { slid: string; name: string; hl: number; kind: string };

function NotifyPage() {
  const s = getSession();
  const listFn = useServerFn(notifList);
  const markFn = useServerFn(notifMarkRead);
  const sendFn = useServerFn(notifSend);
  const peopleFn = useServerFn(tasksPeople);

  const [items, setItems] = useState<Notif[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const canSend = !!s && (s.hl >= 5 || s.isSuperuser);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    setItems(await listFn({ data: c }) as Notif[]);
    if (canSend) setPeople(await peopleFn({ data: c }) as Person[]);
  }
  useEffect(() => { void reload(); const t = setInterval(reload, 30000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);

  async function markAll() {
    const c = getCredentials(); if (!c) return;
    const unread = items.filter(i => !i.read_at).map(i => i.id);
    if (!unread.length) return;
    await markFn({ data: { ...c, ids: unread } });
    await reload();
  }
  async function send() {
    if (!title.trim() || !picked.length) return;
    const c = getCredentials(); if (!c) return;
    setBusy(true);
    try {
      await sendFn({ data: { ...c, recipients: picked, title: title.trim(), body: body.trim() || undefined, url: url.trim() || undefined } });
      setComposeOpen(false); setTitle(""); setBody(""); setUrl(""); setPicked([]);
      await reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto pb-28 md:pb-8 space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notify
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Benachrichtigungen von Chat, Kalender, Tasks & Broadcasts.</p>
        </div>
        {canSend && (
          <button onClick={() => setComposeOpen(true)} className="syn-btn shrink-0">
            <Send className="h-4 w-4" /><span className="hidden sm:inline">Senden</span>
          </button>
        )}
      </header>

      <div className="flex justify-end">
        <button onClick={() => void markAll()} className="syn-btn-ghost text-xs">Alle als gelesen</button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <div className="syn-card p-8 text-center text-sm text-muted-foreground">Keine Benachrichtigungen.</div>}
        {items.map((n) => (
          <div key={n.id} className={`syn-card p-4 ${!n.read_at ? "syn-gradient-border" : "opacity-70"}`}>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl grid place-items-center shrink-0" style={{ background: "var(--gradient-neural-soft)" }}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className="syn-chip text-[10px]">{n.source}</span>
                </div>
                {n.body && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>}
                <div className="text-[10px] mono text-muted-foreground mt-2">
                  {new Date(n.created_at).toLocaleString()} {n.sender_slid && `· von ${n.sender_slid}`}
                </div>
                {n.url && <a href={n.url} className="text-xs text-[var(--synapse)] mono">→ öffnen</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="syn-card syn-gradient-border w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Benachrichtigung senden</h2>
              <button onClick={() => setComposeOpen(false)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <input className="syn-input" placeholder="Titel *" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className="syn-input min-h-24" placeholder="Nachricht" value={body} onChange={(e) => setBody(e.target.value)} />
              <input className="syn-input" placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
              <div>
                <div className="text-xs mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Empfänger ({picked.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-56 overflow-y-auto">
                  {people.map((p) => {
                    const on = picked.includes(p.slid);
                    return (
                      <label key={p.slid} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer ${on ? "syn-tab-active" : "hover:bg-accent"}`}>
                        <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter(x => x !== p.slid) : [...picked, p.slid])} />
                        <span className="text-xs truncate flex-1">{p.name}</span>
                        <span className="text-[10px] mono text-muted-foreground">HL{p.hl}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border bg-card/95 backdrop-blur sticky bottom-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
              <button onClick={() => void send()} disabled={busy || !title.trim() || !picked.length} className="syn-btn w-full">
                {busy ? "Sende…" : `An ${picked.length} senden`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
