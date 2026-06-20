import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Wallet, Trash2, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  finAccountsList, finAccountUpsert, finAccountDelete,
  finTxList, finTxUpsert, finTxDelete,
} from "@/lib/finances.functions";
import { getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/finances")({
  ssr: false,
  component: FinancesPage,
});

type Account = { id: string; name: string; iban: string|null; currency: string; opening_balance: number; archived: boolean; notes: string|null };
type Tx = {
  id: string; account_id: string; direction: "in"|"out"; amount: number; currency: string;
  booking_date: string; purpose: string; description: string|null; counterparty: string|null;
  counterparty_iban: string|null; receipt_no: string|null; category: string|null;
  status: "planned"|"booked"|"cancelled";
};

function FinancesPage() {
  const listAccFn = useServerFn(finAccountsList);
  const saveAccFn = useServerFn(finAccountUpsert);
  const delAccFn = useServerFn(finAccountDelete);
  const listTxFn = useServerFn(finTxList);
  const saveTxFn = useServerFn(finTxUpsert);
  const delTxFn = useServerFn(finTxDelete);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [activeAcc, setActiveAcc] = useState<string | "all">("all");
  const [filter, setFilter] = useState<"all"|"planned"|"booked">("all");
  const [editAcc, setEditAcc] = useState<Partial<Account> | null>(null);
  const [editTx, setEditTx] = useState<Partial<Tx> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    try {
      const [a, t] = await Promise.all([
        listAccFn({ data: c }) as Promise<Account[]>,
        listTxFn({ data: { ...c, account_id: activeAcc !== "all" ? activeAcc : undefined } }) as Promise<Tx[]>,
      ]);
      setAccounts(a); setTxs(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [activeAcc]);

  const filtered = useMemo(() => filter === "all" ? txs : txs.filter((t) => t.status === filter), [txs, filter]);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) map.set(a.id, Number(a.opening_balance) || 0);
    for (const t of txs) {
      if (t.status !== "booked") continue;
      const cur = map.get(t.account_id) ?? 0;
      map.set(t.account_id, cur + (t.direction === "in" ? Number(t.amount) : -Number(t.amount)));
    }
    return map;
  }, [accounts, txs]);

  const totalBalance = useMemo(() => Array.from(balances.values()).reduce((a, b) => a + b, 0), [balances]);

  async function saveAcc() {
    if (!editAcc?.name) return;
    const c = getCredentials(); if (!c) return;
    await saveAccFn({ data: {
      ...c, id: editAcc.id, name: editAcc.name!,
      iban: editAcc.iban || null, bic: null,
      currency: editAcc.currency || "EUR",
      opening_balance: Number(editAcc.opening_balance) || 0,
      notes: editAcc.notes || null, archived: !!editAcc.archived,
    } });
    setEditAcc(null); await reload();
  }

  async function saveTx() {
    if (!editTx?.account_id || !editTx?.amount) return;
    const c = getCredentials(); if (!c) return;
    await saveTxFn({ data: {
      ...c, id: editTx.id, account_id: editTx.account_id!,
      direction: (editTx.direction || "in") as "in"|"out",
      amount: Number(editTx.amount), currency: editTx.currency || "EUR",
      booking_date: editTx.booking_date || new Date().toISOString().slice(0,10),
      purpose: editTx.purpose || "",
      description: editTx.description || null, counterparty: editTx.counterparty || null,
      counterparty_iban: editTx.counterparty_iban || null, receipt_no: editTx.receipt_no || null,
      category: editTx.category || null, status: (editTx.status || "booked") as Tx["status"],
    } });
    setEditTx(null); await reload();
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate"><Wallet className="h-5 w-5 shrink-0" /> Finanzen</h1>
          <p className="text-xs text-muted-foreground mt-1">Gesamt-Saldo: <span className="text-foreground font-semibold mono">{totalBalance.toFixed(2)} €</span></p>
        </div>
        <button className="syn-btn shrink-0" onClick={() => setEditTx({ direction: "in", amount: 0, status: "booked", booking_date: new Date().toISOString().slice(0,10), account_id: accounts[0]?.id })}>
          <Plus className="h-4 w-4" /> Buchung
        </button>
      </header>

      {error && <div className="mb-4 text-xs text-destructive mono">{error}</div>}

      {/* Accounts row */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
        <button onClick={() => setActiveAcc("all")} className={`syn-card p-3 min-w-[180px] text-left ${activeAcc === "all" ? "syn-gradient-border" : ""}`}>
          <div className="text-[10px] mono uppercase text-muted-foreground">Alle Konten</div>
          <div className="text-lg font-bold mono">{totalBalance.toFixed(2)} €</div>
        </button>
        {accounts.map((a) => (
          <button key={a.id} onClick={() => setActiveAcc(a.id)} className={`syn-card p-3 min-w-[180px] text-left ${activeAcc === a.id ? "syn-gradient-border" : ""}`}>
            <div className="text-[10px] mono uppercase text-muted-foreground truncate">{a.iban || "Konto"}</div>
            <div className="text-sm font-semibold truncate">{a.name}</div>
            <div className="text-lg font-bold mono">{(balances.get(a.id) ?? 0).toFixed(2)} {a.currency}</div>
          </button>
        ))}
        <button onClick={() => setEditAcc({ currency: "EUR", opening_balance: 0 })} className="syn-card p-3 min-w-[140px] grid place-items-center text-xs text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4 mb-1" /> Konto
        </button>
      </div>

      <div className="flex gap-2 mb-3 text-xs">
        {(["all","booked","planned"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`syn-chip ${filter === f ? "syn-tab-active" : ""}`}>
            {f === "all" ? "Alle" : f === "booked" ? "Erledigt" : "Geplant"}
          </button>
        ))}
      </div>

      <div className="syn-card overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Keine Buchungen.</div>}
          {filtered.map((t) => {
            const acc = accounts.find((a) => a.id === t.account_id);
            return (
              <button key={t.id} onClick={() => setEditTx(t)} className="w-full text-left border-b border-border/60 last:border-0 p-3 hover:bg-accent/40 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl grid place-items-center shrink-0 ${t.direction === "in" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                  {t.direction === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.purpose || "(Ohne Verwendungszweck)"}</div>
                  <div className="text-[11px] mono text-muted-foreground truncate">
                    {acc?.name} · {t.booking_date}
                    {t.receipt_no && ` · Beleg ${t.receipt_no}`}
                    {t.status === "planned" && " · geplant"}
                  </div>
                </div>
                <div className={`font-bold mono ${t.direction === "in" ? "text-emerald-300" : "text-rose-300"}`}>
                  {t.direction === "in" ? "+" : "−"}{Number(t.amount).toFixed(2)} {t.currency}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account modal */}
      {editAcc && (
        <Modal title={editAcc.id ? "Konto bearbeiten" : "Neues Konto"} onClose={() => setEditAcc(null)}>
          <input className="syn-input" placeholder="Bezeichnung" value={editAcc.name || ""} onChange={(e) => setEditAcc({ ...editAcc, name: e.target.value })} />
          <input className="syn-input" placeholder="IBAN" value={editAcc.iban || ""} onChange={(e) => setEditAcc({ ...editAcc, iban: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="syn-input" placeholder="Währung" value={editAcc.currency || "EUR"} onChange={(e) => setEditAcc({ ...editAcc, currency: e.target.value })} />
            <input className="syn-input" type="number" step="0.01" placeholder="Anfangssaldo" value={String(editAcc.opening_balance ?? 0)} onChange={(e) => setEditAcc({ ...editAcc, opening_balance: Number(e.target.value) })} />
          </div>
          <textarea className="syn-input" placeholder="Notizen" value={editAcc.notes || ""} onChange={(e) => setEditAcc({ ...editAcc, notes: e.target.value })} />
          <div className="flex gap-2">
            <button className="syn-btn flex-1" onClick={saveAcc}>Speichern</button>
            {editAcc.id && <button className="syn-btn-ghost" onClick={async () => {
              if (!confirm("Konto löschen? Alle Buchungen gehen mit verloren.")) return;
              const c = getCredentials(); if (!c) return;
              await delAccFn({ data: { ...c, id: editAcc.id! } });
              setEditAcc(null); await reload();
            }}><Trash2 className="h-4 w-4" /></button>}
          </div>
        </Modal>
      )}

      {/* Tx modal */}
      {editTx && (
        <Modal title={editTx.id ? "Buchung bearbeiten" : "Neue Buchung"} onClose={() => setEditTx(null)}>
          <select className="syn-input" value={editTx.account_id || ""} onChange={(e) => setEditTx({ ...editTx, account_id: e.target.value })}>
            <option value="">Konto wählen…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className="syn-input" value={editTx.direction || "in"} onChange={(e) => setEditTx({ ...editTx, direction: e.target.value as "in"|"out" })}>
              <option value="in">Eingang</option><option value="out">Ausgang</option>
            </select>
            <select className="syn-input" value={editTx.status || "booked"} onChange={(e) => setEditTx({ ...editTx, status: e.target.value as Tx["status"] })}>
              <option value="booked">Erledigt</option><option value="planned">Geplant</option><option value="cancelled">Storniert</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="syn-input" type="number" step="0.01" placeholder="Betrag" value={String(editTx.amount ?? "")} onChange={(e) => setEditTx({ ...editTx, amount: Number(e.target.value) })} />
            <input className="syn-input" type="date" value={editTx.booking_date || new Date().toISOString().slice(0,10)} onChange={(e) => setEditTx({ ...editTx, booking_date: e.target.value })} />
          </div>
          <input className="syn-input" placeholder="Verwendungszweck" value={editTx.purpose || ""} onChange={(e) => setEditTx({ ...editTx, purpose: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="syn-input" placeholder="Gegenpartei" value={editTx.counterparty || ""} onChange={(e) => setEditTx({ ...editTx, counterparty: e.target.value })} />
            <input className="syn-input" placeholder="IBAN Gegenpartei" value={editTx.counterparty_iban || ""} onChange={(e) => setEditTx({ ...editTx, counterparty_iban: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="syn-input" placeholder="Belegnummer" value={editTx.receipt_no || ""} onChange={(e) => setEditTx({ ...editTx, receipt_no: e.target.value })} />
            <input className="syn-input" placeholder="Kategorie" value={editTx.category || ""} onChange={(e) => setEditTx({ ...editTx, category: e.target.value })} />
          </div>
          <textarea className="syn-input" placeholder="Beschreibung" value={editTx.description || ""} onChange={(e) => setEditTx({ ...editTx, description: e.target.value })} />
          <div className="flex gap-2">
            <button className="syn-btn flex-1" onClick={saveTx}>Speichern</button>
            {editTx.id && <button className="syn-btn-ghost" onClick={async () => {
              if (!confirm("Buchung löschen?")) return;
              const c = getCredentials(); if (!c) return;
              await delTxFn({ data: { ...c, id: editTx.id! } });
              setEditTx(null); await reload();
            }}><Trash2 className="h-4 w-4" /></button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="syn-card w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
