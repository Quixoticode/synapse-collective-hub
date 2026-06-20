import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Send, LifeBuoy, X } from "lucide-react";
import {
  supportTicketsList, supportTicketCreate, supportMessagesList, supportMessageSend, supportTicketSetStatus,
} from "@/lib/support.functions";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/support")({
  ssr: false,
  component: SupportPage,
});

type Ticket = {
  id: string; opener_slid: string; subject: string;
  status: "open"|"pending"|"resolved"|"closed";
  priority: "low"|"normal"|"high"|"urgent";
  created_at: string; updated_at: string;
};
type Msg = { id: string; ticket_id: string; author_slid: string; author_role: "user"|"staff"|"system"; body: string; created_at: string };

function SupportPage() {
  const session = getSession();
  const isStaff = !!session && (session.isSuperuser || session.hl >= 3);
  const listFn = useServerFn(supportTicketsList);
  const createFn = useServerFn(supportTicketCreate);
  const msgsFn = useServerFn(supportMessagesList);
  const sendFn = useServerFn(supportMessageSend);
  const statusFn = useServerFn(supportTicketSetStatus);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubj, setNewSubj] = useState("");
  const [newBody, setNewBody] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const t = (await listFn({ data: c })) as Ticket[];
    setTickets(t);
    if (!active && t.length) setActive(t[0]);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (!active) return;
    const c = getCredentials(); if (!c) return;
    void msgsFn({ data: { ...c, ticket_id: active.id } }).then((r) => {
      setMsgs(r as Msg[]);
      setTimeout(() => scrollerRef.current?.scrollTo({ top: 1e9 }), 50);
    });
  }, [active?.id, msgsFn]);

  async function send() {
    if (!draft.trim() || !active) return;
    const c = getCredentials(); if (!c) return;
    await sendFn({ data: { ...c, ticket_id: active.id, body: draft } });
    setDraft("");
    const r = (await msgsFn({ data: { ...c, ticket_id: active.id } })) as Msg[];
    setMsgs(r);
    setTimeout(() => scrollerRef.current?.scrollTo({ top: 1e9 }), 50);
  }

  async function createTicket() {
    if (!newSubj.trim() || !newBody.trim()) return;
    const c = getCredentials(); if (!c) return;
    const t = (await createFn({ data: { ...c, subject: newSubj, body: newBody, priority: "normal" } })) as Ticket;
    setNewOpen(false); setNewSubj(""); setNewBody("");
    await reload();
    setActive(t);
  }

  async function setStatus(s: Ticket["status"]) {
    if (!active) return;
    const c = getCredentials(); if (!c) return;
    await statusFn({ data: { ...c, ticket_id: active.id, status: s } });
    await reload();
  }

  const sorted = useMemo(() => [...tickets].sort((a,b) => +new Date(b.updated_at) - +new Date(a.updated_at)), [tickets]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-110px)] md:min-h-[100dvh]">
      <aside className="w-full md:w-80 md:border-r border-border flex flex-col md:max-h-screen">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> Support</h2>
          <button onClick={() => setNewOpen(true)} className="syn-btn-ghost"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-72 md:max-h-none">
          {sorted.length === 0 && <div className="text-xs text-muted-foreground p-3">Keine Tickets.</div>}
          {sorted.map((t) => (
            <button key={t.id} onClick={() => setActive(t)}
              className={`w-full text-left px-3 py-2 rounded-xl ${active?.id === t.id ? "syn-tab-active" : "hover:bg-accent"}`}>
              <div className="text-sm font-medium truncate">{t.subject}</div>
              <div className="text-[10px] mono text-muted-foreground flex justify-between">
                <span>{t.status}</span><span>{new Date(t.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col pb-28 md:pb-0">
        {active ? (
          <>
            <header className="p-4 border-b border-border flex flex-wrap gap-2 items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] mono uppercase text-muted-foreground">#{active.id.slice(0,8)} · {active.opener_slid}</div>
                <h1 className="font-semibold truncate">{active.subject}</h1>
              </div>
              {isStaff && (
                <select value={active.status} onChange={(e) => void setStatus(e.target.value as Ticket["status"])} className="syn-input w-auto text-xs">
                  <option value="open">open</option>
                  <option value="pending">pending</option>
                  <option value="resolved">resolved</option>
                  <option value="closed">closed</option>
                </select>
              )}
            </header>
            <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.author_role === "staff" ? "ml-auto bg-cyan-500/15 border border-cyan-400/30" : "bg-card border border-border"}`}>
                  <div className="text-[10px] mono text-muted-foreground mb-0.5">{m.author_slid} · {m.author_role}</div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input className="syn-input" placeholder="Antwort…" value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()} />
              <button onClick={send} className="syn-btn"><Send className="h-4 w-4" /></button>
            </div>
          </>
        ) : (
          <div className="grid place-items-center flex-1 text-muted-foreground text-sm p-8 text-center">
            Wähle ein Ticket oder erstelle eines.
          </div>
        )}
      </main>

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="syn-card w-full max-w-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Neues Ticket</h3>
              <button onClick={() => setNewOpen(false)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="Betreff" value={newSubj} onChange={(e) => setNewSubj(e.target.value)} />
            <textarea className="syn-input min-h-32" placeholder="Beschreibe dein Problem…" value={newBody} onChange={(e) => setNewBody(e.target.value)} />
            <button className="syn-btn w-full" onClick={createTicket}>Ticket erstellen</button>
          </div>
        </div>
      )}
    </div>
  );
}
