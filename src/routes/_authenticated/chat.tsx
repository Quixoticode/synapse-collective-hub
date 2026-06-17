import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Plus, X, Users, MessageSquare, Loader2 } from "lucide-react";
import { chatThreadsList, chatThreadCreate, chatMessages, chatSend, chatPeople } from "@/lib/chat.functions";
import { getSession, getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/chat")({
  ssr: false,
  component: ChatPage,
});

type Thread = { id: string; title: string | null; is_group: boolean; created_by: string; updated_at: string; members: string[] };
type Msg = { id: string; thread_id: string; sender_slid: string; body: string; created_at: string };
type Person = { slid: string; name: string; kind: string; hl: number };

function ChatPage() {
  const session = getSession();
  const listFn = useServerFn(chatThreadsList);
  const createFn = useServerFn(chatThreadCreate);
  const msgsFn = useServerFn(chatMessages);
  const sendFn = useServerFn(chatSend);
  const peopleFn = useServerFn(chatPeople);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function reload() {
    const c = getCredentials();
    if (!c) return;
    const [t, p] = await Promise.all([listFn({ data: c }), peopleFn({ data: c })]);
    setThreads(t as Thread[]);
    setPeople(p as Person[]);
    if (!activeId && t.length) setActiveId((t[0] as Thread).id);
  }
  async function loadMsgs(id: string) {
    const c = getCredentials();
    if (!c) return;
    const m = await msgsFn({ data: { ...c, thread_id: id } });
    setMsgs(m as Msg[]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9 }), 50);
  }

  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (activeId) void loadMsgs(activeId); /* eslint-disable-next-line */ }, [activeId]);

  // poll every 4s
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(() => void loadMsgs(activeId), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [activeId]);

  async function handleSend() {
    if (!draft.trim() || !activeId) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true);
    try {
      await sendFn({ data: { ...c, thread_id: activeId, body: draft.trim() } });
      setDraft("");
      await loadMsgs(activeId);
    } finally {
      setBusy(false);
    }
  }
  async function handleCreate() {
    if (!picked.length) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true);
    try {
      const t = await createFn({ data: { ...c, title: title || null, member_slids: picked, is_group: picked.length > 1 } });
      setNewOpen(false); setPicked([]); setTitle("");
      await reload();
      setActiveId((t as Thread).id);
    } finally { setBusy(false); }
  }

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.slid, p])), [people]);
  const activeThread = threads.find((t) => t.id === activeId);

  function threadLabel(t: Thread) {
    if (t.title) return t.title;
    const others = t.members.filter((s) => s !== session?.slid);
    return others.map((s) => peopleMap.get(s)?.name || s).join(", ") || "Thread";
  }

  return (
    <div className="h-[calc(100vh-0px)] md:h-screen flex">
      <div className="w-72 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Chats</h2>
            <p className="text-xs text-muted-foreground">{threads.length} Threads</p>
          </div>
          <button className="syn-btn-ghost" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-3 py-2 rounded-xl transition ${activeId === t.id ? "syn-tab-active" : "hover:bg-accent"}`}>
              <div className="flex items-center gap-2">
                {t.is_group ? <Users className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                <span className="text-sm font-medium truncate">{threadLabel(t)}</span>
              </div>
              <div className="text-[10px] mono text-muted-foreground">{new Date(t.updated_at).toLocaleString()}</div>
            </button>
          ))}
          {threads.length === 0 && <div className="text-xs text-muted-foreground p-4">Noch keine Chats. Starte einen neuen.</div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-4 border-b border-border">
          <h1 className="text-lg font-semibold">{activeThread ? threadLabel(activeThread) : "Chat"}</h1>
          {activeThread && <p className="text-xs text-muted-foreground mono">{activeThread.members.length} Teilnehmer</p>}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {msgs.map((m) => {
            const own = m.sender_slid === session?.slid;
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${own ? "syn-tab-active" : "bg-card border border-border"}`}>
                  {!own && <div className="text-[10px] text-muted-foreground mono mb-0.5">{peopleMap.get(m.sender_slid)?.name || m.sender_slid}</div>}
                  <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[9px] mono text-muted-foreground mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              </div>
            );
          })}
          {activeId && msgs.length === 0 && <div className="text-xs text-muted-foreground text-center mt-8">Keine Nachrichten. Schreib die erste.</div>}
        </div>
        {activeId && (
          <div className="p-3 border-t border-border flex gap-2">
            <input className="syn-input flex-1" value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
              placeholder="Nachricht…" />
            <button className="syn-btn" onClick={() => void handleSend()} disabled={busy || !draft.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Neuer Chat</h3>
              <button onClick={() => setNewOpen(false)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input mb-3" placeholder="Titel (optional, für Gruppen)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="max-h-64 overflow-y-auto space-y-1 mb-4">
              {people.map((p) => {
                const on = picked.includes(p.slid);
                return (
                  <label key={p.slid} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${on ? "syn-tab-active" : "hover:bg-accent"}`}>
                    <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((s) => s !== p.slid) : [...picked, p.slid])} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-[10px] mono text-muted-foreground">{p.slid} · {p.kind} · HL {p.hl}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <button className="syn-btn w-full" onClick={() => void handleCreate()} disabled={!picked.length || busy}>
              <Plus className="h-4 w-4" /> Chat starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
