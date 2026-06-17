import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X, Mail, Inbox, Send as SendIcon, Loader2 } from "lucide-react";
import { mailAccounts, mailAccountCreate, mailMessages, mailSend, mailMarkRead } from "@/lib/mail.functions";
import { getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/mail")({
  ssr: false,
  component: MailPage,
});

type Acct = { id: string; slid: string; address: string; display_name: string | null };
type Msg = {
  id: string; account_id: string; direction: "in" | "out"; from_addr: string;
  to_addrs: string[]; cc_addrs: string[]; subject: string | null; body_text: string | null;
  body_html: string | null; received_at: string | null; sent_at: string | null; read_at: string | null; created_at: string;
};

function MailPage() {
  const accFn = useServerFn(mailAccounts);
  const accCreate = useServerFn(mailAccountCreate);
  const msgsFn = useServerFn(mailMessages);
  const sendFn = useServerFn(mailSend);
  const readFn = useServerFn(mailMarkRead);

  const [accts, setAccts] = useState<Acct[]>([]);
  const [activeAcct, setActiveAcct] = useState<string | null>(null);
  const [folder, setFolder] = useState<"in" | "out">("in");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [open, setOpen] = useState<Msg | null>(null);
  const [compose, setCompose] = useState<{ to: string; cc: string; subject: string; body: string } | null>(null);
  const [newAcct, setNewAcct] = useState<{ address: string; display_name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function reloadAccts() {
    const c = getCredentials();
    if (!c) return;
    const a = (await accFn({ data: c })) as Acct[];
    setAccts(a);
    if (!activeAcct && a.length) setActiveAcct(a[0].id);
  }
  async function reloadMsgs() {
    const c = getCredentials();
    if (!c || !activeAcct) return;
    const m = (await msgsFn({ data: { ...c, account_id: activeAcct, folder } })) as Msg[];
    setMsgs(m);
  }

  useEffect(() => { void reloadAccts(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { void reloadMsgs(); /* eslint-disable-next-line */ }, [activeAcct, folder]);

  async function send() {
    if (!compose || !activeAcct) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true); setInfo(null);
    try {
      await sendFn({
        data: {
          ...c, account_id: activeAcct,
          to: compose.to.split(",").map((s) => s.trim()).filter(Boolean),
          cc: compose.cc ? compose.cc.split(",").map((s) => s.trim()).filter(Boolean) : [],
          subject: compose.subject, body_text: compose.body, body_html: "",
        },
      });
      setCompose(null);
      setFolder("out");
      await reloadMsgs();
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Versand fehlgeschlagen");
    } finally { setBusy(false); }
  }

  async function createAcct() {
    if (!newAcct?.address) return;
    const c = getCredentials();
    if (!c) return;
    setBusy(true);
    try {
      await accCreate({ data: { ...c, address: newAcct.address, display_name: newAcct.display_name || null } });
      setNewAcct(null);
      await reloadAccts();
    } finally { setBusy(false); }
  }

  return (
    <div className="h-screen flex">
      <div className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> SynMail</h2>
          <button className="syn-btn-ghost" onClick={() => setNewAcct({ address: "", display_name: "" })}><Plus className="h-4 w-4" /></button>
        </div>
        <div className="p-2 space-y-1">
          {accts.map((a) => (
            <button key={a.id} onClick={() => setActiveAcct(a.id)}
              className={`w-full text-left px-3 py-2 rounded-xl ${activeAcct === a.id ? "syn-tab-active" : "hover:bg-accent"}`}>
              <div className="text-sm font-medium truncate">{a.display_name || a.address}</div>
              <div className="text-[10px] mono text-muted-foreground truncate">{a.address}</div>
            </button>
          ))}
          {accts.length === 0 && <div className="text-xs text-muted-foreground p-3">Kein Postfach – erstelle eines.</div>}
        </div>
        <div className="mt-auto p-3 border-t border-border space-y-1">
          <button onClick={() => setFolder("in")} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${folder === "in" ? "syn-tab-active" : "hover:bg-accent"}`}>
            <Inbox className="h-4 w-4" /> Eingang
          </button>
          <button onClick={() => setFolder("out")} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${folder === "out" ? "syn-tab-active" : "hover:bg-accent"}`}>
            <SendIcon className="h-4 w-4" /> Gesendet
          </button>
          <button onClick={() => setCompose({ to: "", cc: "", subject: "", body: "" })} className="syn-btn w-full mt-2" disabled={!activeAcct}>
            <Plus className="h-4 w-4" /> Neue Mail
          </button>
        </div>
      </div>

      <div className="w-96 border-r border-border overflow-y-auto">
        {msgs.map((m) => (
          <button key={m.id} onClick={async () => {
            setOpen(m);
            if (!m.read_at && m.direction === "in") {
              const c = getCredentials();
              if (c) await readFn({ data: { ...c, id: m.id } });
              void reloadMsgs();
            }
          }}
            className={`w-full text-left p-3 border-b border-border hover:bg-accent ${open?.id === m.id ? "bg-accent" : ""}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${!m.read_at && m.direction === "in" ? "font-semibold" : ""}`}>
                {m.direction === "in" ? m.from_addr : m.to_addrs.join(", ")}
              </span>
              <span className="text-[10px] mono text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-xs truncate">{m.subject || "(kein Betreff)"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{m.body_text?.slice(0, 80)}</div>
          </button>
        ))}
        {msgs.length === 0 && <div className="text-xs text-muted-foreground p-4 text-center">Keine Mails.</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {open ? (
          <div className="max-w-3xl">
            <h1 className="text-xl font-semibold mb-2">{open.subject || "(kein Betreff)"}</h1>
            <div className="text-xs mono text-muted-foreground mb-4">
              {open.direction === "in" ? "Von" : "An"}: {open.direction === "in" ? open.from_addr : open.to_addrs.join(", ")} · {new Date(open.created_at).toLocaleString()}
            </div>
            <div className="syn-card p-4 whitespace-pre-wrap text-sm">{open.body_text || (open.body_html ? <div dangerouslySetInnerHTML={{ __html: open.body_html }} /> : "")}</div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">Wähle eine Mail.</div>
        )}
      </div>

      {compose && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Neue Mail</h3>
              <button onClick={() => setCompose(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="An (kommagetrennt)" value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} />
            <input className="syn-input" placeholder="Cc (optional)" value={compose.cc} onChange={(e) => setCompose({ ...compose, cc: e.target.value })} />
            <input className="syn-input" placeholder="Betreff" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
            <textarea className="syn-input min-h-48" placeholder="Nachricht…" value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
            {info && <div className="text-xs text-destructive">{info}</div>}
            <button className="syn-btn w-full" disabled={busy || !compose.to || !compose.subject} onClick={() => void send()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />} Senden
            </button>
            <p className="text-[10px] text-muted-foreground">Versand via Brevo (Connector). Empfang via Cloudflare Email Routing → Webhook.</p>
          </div>
        </div>
      )}

      {newAcct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card w-full max-w-md p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Postfach anlegen</h3>
              <button onClick={() => setNewAcct(null)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <input className="syn-input" placeholder="E-Mail-Adresse" value={newAcct.address} onChange={(e) => setNewAcct({ ...newAcct, address: e.target.value })} />
            <input className="syn-input" placeholder="Anzeigename" value={newAcct.display_name} onChange={(e) => setNewAcct({ ...newAcct, display_name: e.target.value })} />
            <button className="syn-btn w-full" disabled={busy || !newAcct.address} onClick={() => void createAcct()}>Anlegen</button>
          </div>
        </div>
      )}
    </div>
  );
}
