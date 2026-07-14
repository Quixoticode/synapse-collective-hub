import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, type ComponentType } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, Trash2, X, Clock, Zap, CheckCircle, XCircle, Copy, Check,
  Search, Clipboard, MessageSquare, Pencil, ChevronDown,
} from "lucide-react";
import { auftragList, auftragCreate, auftragUpdate, auftragDelete, auftragAddNote, type AuftragRow, type AuftragStatus, type AuftragPriority } from "@/lib/auftrag.functions";
import { getSession, getCredentials } from "@/lib/syn-session";
import { T, LiquidButton, LiquidInput, LoaderCard, TabBar } from "@/components/nl";

export const Route = createFileRoute("/_authenticated/auftrag")({ ssr: false, component: AuftragPage });

const STATUS_META: Record<AuftragStatus, { label: string; color: string; Icon: ComponentType<{ size?: number }> }> = {
  pending: { label: "Ausstehend", color: T.secondary, Icon: Clock },
  in_progress: { label: "In Bearbeitung", color: T.primary, Icon: Zap },
  completed: { label: "Abgeschlossen", color: T.success, Icon: CheckCircle },
  cancelled: { label: "Storniert", color: T.error, Icon: XCircle },
};
const PRIORITY_META: Record<AuftragPriority, { label: string; color: string }> = {
  low: { label: "Niedrig", color: T.muted }, normal: { label: "Normal", color: T.primary },
  high: { label: "Hoch", color: T.secondary }, urgent: { label: "Dringend", color: T.error },
};
const ALL_STATUSES: AuftragStatus[] = ["pending", "in_progress", "completed", "cancelled"];
const ALL_PRIORITIES: AuftragPriority[] = ["low", "normal", "high", "urgent"];

function AuftragPage() {
  const session = getSession();
  const listFn = useServerFn(auftragList), createFn = useServerFn(auftragCreate), updateFn = useServerFn(auftragUpdate);
  const deleteFn = useServerFn(auftragDelete), addNoteFn = useServerFn(auftragAddNote);
  const [tab, setTab] = useState(0), [items, setItems] = useState<AuftragRow[]>([]), [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""), [statusFilter, setStatusFilter] = useState<AuftragStatus | "all">("all");
  const [form, setForm] = useState({ title: "", customer_name: "", customer_email: "", customer_phone: "", description: "", priority: "normal" as AuftragPriority, assigned_slid: "" });
  const [formBusy, setFormBusy] = useState(false);
  const [detail, setDetail] = useState<AuftragRow | null>(null), [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); }, []);

  async function reload() { const c = getCredentials(); if (!c) return; try { const r = (await listFn({ data: c })) as AuftragRow[]; setItems(r); } catch (e) { showToast(e instanceof Error ? e.message : "Fehler."); } finally { setLoading(false); } }
  useEffect(() => { void reload(); /* eslint-disable */ }, []);

  const myItems = useMemo(() => { const s = session; if (!s) return []; return items.filter((i) => i.creator_slid === s.slid || i.assigned_slid === s.slid); }, [items, session]);
  const filtered = useMemo(() => { const s = search.toLowerCase(); const base = tab === 2 ? myItems : items; let list = base; if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter); if (s) list = list.filter((i) => i.title.toLowerCase().includes(s) || i.customer_name.toLowerCase().includes(s)); return list; }, [items, myItems, tab, search, statusFilter]);

  async function handleCreate() { if (!form.title.trim() || !form.customer_name.trim()) { showToast("Titel und Kundenname sind Pflicht."); return; } const c = getCredentials(); if (!c) return; setFormBusy(true); try { await createFn({ data: { ...c, title: form.title.trim(), customer_name: form.customer_name.trim(), customer_email: form.customer_email.trim() || null, customer_phone: form.customer_phone.trim() || null, description: form.description.trim() || null, priority: form.priority, assigned_slid: form.assigned_slid.trim() || null } }); showToast("Auftrag erstellt!"); setForm({ title: "", customer_name: "", customer_email: "", customer_phone: "", description: "", priority: "normal", assigned_slid: "" }); setTab(0); await reload(); } catch (e) { showToast(e instanceof Error ? e.message : "Fehler."); } finally { setFormBusy(false); } }
  async function handleStatusChange(id: string, status: AuftragStatus) { const c = getCredentials(); if (!c) return; try { await updateFn({ data: { ...c, id, status } }); showToast("Status aktualisiert."); await reload(); } catch (e) { showToast(e instanceof Error ? e.message : "Fehler."); } }
  async function handleDelete(id: string) { if (!confirm("Auftrag wirklich l\u00f6schen?")) return; const c = getCredentials(); if (!c) return; try { await deleteFn({ data: { ...c, id } }); showToast("Auftrag gel\u00f6scht."); setDetail(null); await reload(); } catch (e) { showToast(e instanceof Error ? e.message : "Fehler."); } }
  async function handleAddNote() { if (!detail || !noteText.trim()) return; const c = getCredentials(); if (!c) return; try { await addNoteFn({ data: { ...c, id: detail.id, note: noteText.trim() } }); showToast("Notiz hinzugef\u00fcgt."); setNoteText(""); await reload(); } catch (e) { showToast(e instanceof Error ? e.message : "Fehler."); } }
  const copyToken = useCallback(async (token: string) => { try { await navigator.clipboard.writeText(token); showToast("Token kopiert!"); } catch { showToast("Kopieren fehlgeschlagen."); } }, []);
  const copyShareUrl = useCallback(async (token: string) => { const url = `${window.location.origin}/auftrag/${token}`; try { await navigator.clipboard.writeText(url); showToast("Link kopiert!"); } catch { showToast("Kopieren fehlgeschlagen."); } }, []);

  const tabs = ["Alle Auftr\u00e4ge", "Neuer Auftrag", "Meine Auftr\u00e4ge"];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate"><ClipboardList className="h-5 w-5 shrink-0" style={{ color: T.primary }} />Auftr\u00e4ge</h1>
          <p className="text-xs mt-1" style={{ color: T.muted }}>{items.length} Auftr\u00e4ge gesamt{tab === 2 && ` \u00b7 ${myItems.length} meine`}</p>
        </div>
        <TabBar tabs={tabs} onChange={setTab} defaultActive={tab} />
      </header>

      {(tab === 0 || tab === 2) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1"><Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} /><input className="syn-input pl-8 w-full" placeholder="Suchen\u2026" value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: T.bg2, color: T.text }} /></div>
          <div className="flex gap-1 flex-wrap"><StatusFilterChip value="all" current={statusFilter} onChange={setStatusFilter} />{ALL_STATUSES.map((s) => <StatusFilterChip key={s} value={s} current={statusFilter} onChange={setStatusFilter} />)}</div>
        </div>
      )}

      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ background: T.surface, border: `1px solid ${T.primary}40`, color: T.primary, boxShadow: `0 8px 32px rgba(0,0,0,.5), 0 0 20px ${T.primary}20` }}><Check size={14} />{toast}</motion.div>)}</AnimatePresence>

      <AnimatePresence mode="wait">
        {loading ? (<motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoaderCard type="process" label="Auftr\u00e4ge laden\u2026" /></motion.div>) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {(tab === 0 || tab === 2) && (<div>{filtered.length === 0 ? (<div className="text-center py-16 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}><ClipboardList size={40} style={{ color: T.muted }} className="mx-auto mb-3" /><p className="text-sm" style={{ color: T.muted }}>{tab === 2 ? "Keine eigenen Auftr\u00e4ge." : "Keine Auftr\u00e4ge vorhanden."}</p></div>) : (<div className="grid gap-3">{filtered.map((item, idx) => (<AuftragCard key={item.id} item={item} index={idx} onStatusChange={handleStatusChange} onDelete={handleDelete} onCopyToken={copyToken} onCopyUrl={copyShareUrl} onOpenDetail={setDetail} canManage={session?.isSuperuser || item.creator_slid === session?.slid || item.assigned_slid === session?.slid} />))}</div>)}</div>)}
            {tab === 1 && (
              <div className="max-w-xl mx-auto rounded-2xl p-6 space-y-4" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Plus size={18} style={{ color: T.primary }} />Neuer Auftrag</h2>
                <LiquidInput label="Titel *" placeholder="z. B. Website-Redesign f\u00fcr Kunde" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
                <LiquidInput label="Kundenname *" placeholder="Max Mustermann" value={form.customer_name} onChange={(v) => setForm((p) => ({ ...p, customer_name: v }))} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LiquidInput label="E-Mail" type="email" placeholder="max@beispiel.de" value={form.customer_email} onChange={(v) => setForm((p) => ({ ...p, customer_email: v }))} /><LiquidInput label="Telefon" placeholder="+49 123 456789" value={form.customer_phone} onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))} /></div>
                <LiquidInput label="Beschreibung" placeholder="Details zum Auftrag\u2026" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
                <div><label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: "7px" }}>Priorit\u00e4t</label><PrioritySelect value={form.priority} onChange={(v) => setForm((p) => ({ ...p, priority: v }))} /></div>
                <LiquidButton variant="primary" fullWidth onClick={() => void handleCreate()} disabled={formBusy || !form.title.trim() || !form.customer_name.trim()}>{formBusy ? <SpinInline /> : <Plus size={16} />}Auftrag erstellen</LiquidButton>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setDetail(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={{ background: T.bg2, border: `1px solid ${T.border}`, boxShadow: `0 24px 60px rgba(0,0,0,.5)` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="text-lg font-bold truncate">{detail.title}</h3><p className="text-xs mt-0.5" style={{ color: T.muted }}>{detail.customer_name}{detail.customer_email && ` \u00b7 ${detail.customer_email}`}</p></div><button className="syn-btn-ghost shrink-0" onClick={() => setDetail(null)}><X size={16} /></button></div>
            <div className="flex flex-wrap gap-2"><StatusBadge status={detail.status} /><PriorityBadge priority={detail.priority} /><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold mono" style={{ background: T.bg, color: T.muted, border: `1px solid ${T.border}` }}><Clipboard size={10} />{detail.share_token}</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs"><InfoCell label="Erstellt" value={new Date(detail.created_at).toLocaleString("de-DE")} /><InfoCell label="Aktualisiert" value={new Date(detail.updated_at).toLocaleString("de-DE")} />{detail.customer_phone && <InfoCell label="Telefon" value={detail.customer_phone} />}</div>
            {detail.description && (<div className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: T.bg, border: `1px solid ${T.border}` }}>{detail.description}</div>)}
            <div className="flex items-center gap-2"><div className="flex-1 rounded-xl px-3 py-2 text-xs mono flex items-center gap-2" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.muted }}><Clipboard size={12} /><span className="flex-1 truncate">{detail.share_token}</span></div><LiquidButton variant="ghost" size="sm" onClick={() => copyToken(detail.share_token)}><Copy size={14} /></LiquidButton><LiquidButton variant="ghost" size="sm" onClick={() => copyShareUrl(detail.share_token)}><ClipboardList size={14} /></LiquidButton></div>
            <div><label style={{ display: "block", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: "7px" }}>Status \u00e4ndern</label><div className="flex gap-2 flex-wrap">{ALL_STATUSES.map((s) => (<button key={s} onClick={() => void handleStatusChange(detail.id, s)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: detail.status === s ? `${STATUS_META[s].color}18` : T.bg, border: `1.5px solid ${detail.status === s ? STATUS_META[s].color : T.border}`, color: detail.status === s ? STATUS_META[s].color : T.muted }}>{STATUS_META[s].label}</button>))}</div></div>
            {detail.notes && (<div className="rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto" style={{ background: T.bg, border: `1px solid ${T.border}` }}><h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.muted }}>Notizen</h4>{detail.notes.split("\n").map((line, i) => line.trim() ? <div key={i} className="text-xs" style={{ color: T.text }}>{line}</div> : null)}</div>)}
            <div className="flex gap-2"><input className="syn-input flex-1 text-xs" placeholder="Notiz hinzuf\u00fcgen\u2026" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) void handleAddNote(); }} style={{ background: T.bg }} /><LiquidButton variant="accent" size="sm" onClick={() => void handleAddNote()} disabled={!noteText.trim()}><MessageSquare size={14} /></LiquidButton></div>
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: T.border }}><LiquidButton variant="ghost" fullWidth onClick={() => setDetail(null)}>Schlie\u00dfen</LiquidButton>{(session?.isSuperuser || detail.creator_slid === session?.slid) && (<LiquidButton variant="danger" size="sm" onClick={() => void handleDelete(detail.id)}><Trash2 size={14} /></LiquidButton>)}</div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AuftragCard({ item, index, onStatusChange, onDelete, onCopyToken, onCopyUrl, onOpenDetail, canManage }: { item: AuftragRow; index: number; onStatusChange: (id: string, s: AuftragStatus) => void; onDelete: (id: string) => void; onCopyToken: (t: string) => void; onCopyUrl: (t: string) => void; onOpenDetail: (item: AuftragRow) => void; canManage: boolean }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const meta = STATUS_META[item.status], pri = PRIORITY_META[item.priority], StatusIcon = meta.Icon;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.22 }} className="rounded-2xl p-4 relative group" style={{ background: T.bg2, border: `1px solid ${T.border}` }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${T.primary}30`; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${meta.color}15` }}><StatusIcon size={18} style={{ color: meta.color }} /></div>
        <div className="flex-1 min-w-0" onClick={() => onOpenDetail(item)} style={{ cursor: "pointer" }}>
          <div className="flex items-center gap-2 flex-wrap"><h3 className="text-sm font-semibold truncate">{item.title}</h3><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /></div>
          <p className="text-xs mt-0.5 truncate" style={{ color: T.muted }}>{item.customer_name}{item.customer_email && ` \u00b7 ${item.customer_email}`}</p>
          <p className="text-[10px] mt-1 mono" style={{ color: T.muted }}>{new Date(item.created_at).toLocaleDateString("de-DE")}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button className="syn-btn-ghost !p-1.5" onClick={(e) => { e.stopPropagation(); onCopyToken(item.share_token); }} title="Token kopieren"><Copy size={13} style={{ color: T.muted }} /></button>
          {canManage && (<div className="relative"><button className="syn-btn-ghost !p-1.5" onClick={(e) => { e.stopPropagation(); setStatusOpen((v) => !v); }} title="Status \u00e4ndern"><ChevronDown size={13} style={{ color: T.muted }} /></button><AnimatePresence>{statusOpen && (<motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: `0 16px 40px rgba(0,0,0,.6)`, minWidth: 160 }} onClick={(e) => e.stopPropagation()}>{ALL_STATUSES.map((s) => (<button key={s} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2" style={{ background: item.status === s ? `${STATUS_META[s].color}10` : "transparent", color: item.status === s ? STATUS_META[s].color : T.text }} onClick={() => { onStatusChange(item.id, s); setStatusOpen(false); }}><div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}</button>))}</motion.div>)}</AnimatePresence></div>)}
          <button className="syn-btn-ghost !p-1.5" onClick={(e) => { e.stopPropagation(); onOpenDetail(item); }} title="Details"><Pencil size={13} style={{ color: T.muted }} /></button>
          {canManage && (<button className="syn-btn-ghost !p-1.5" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} title="L\u00f6schen"><Trash2 size={13} style={{ color: T.error }} /></button>)}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: AuftragStatus }) { const m = STATUS_META[status]; return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}30` }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />{m.label}</span>); }
function PriorityBadge({ priority }: { priority: AuftragPriority }) { const m = PRIORITY_META[priority]; return (<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: `${m.color}12`, color: m.color, border: `1px solid ${m.color}25` }}>{m.label}</span>); }
function StatusFilterChip({ value, current, onChange }: { value: AuftragStatus | "all"; current: AuftragStatus | "all"; onChange: (v: AuftragStatus | "all") => void }) { const active = value === current; const label = value === "all" ? "Alle" : STATUS_META[value].label; const color = value === "all" ? T.muted : STATUS_META[value].color; return (<button onClick={() => onChange(value)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all" style={{ background: active ? `${color}18` : "transparent", border: `1.5px solid ${active ? color : T.border}`, color: active ? color : T.muted }}>{label}</button>); }
function PrioritySelect({ value, onChange }: { value: AuftragPriority; onChange: (v: AuftragPriority) => void }) { const [open, setOpen] = useState(false); const m = PRIORITY_META[value]; return (<div className="relative"><button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: m.color }} />{m.label}</span><ChevronDown size={14} style={{ color: T.muted }} /></button><AnimatePresence>{open && (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: `0 16px 40px rgba(0,0,0,.6)` }}>{ALL_PRIORITIES.map((p) => { const pm = PRIORITY_META[p]; return (<button key={p} className="w-full text-left px-3 py-2 text-xs flex items-center gap-2" style={{ background: p === value ? `${pm.color}10` : "transparent", color: p === value ? pm.color : T.text }} onClick={() => { onChange(p); setOpen(false); }}><div className="w-2 h-2 rounded-full" style={{ background: pm.color }} />{pm.label}</button>); })}</motion.div>)}</AnimatePresence></div>); }
function InfoCell({ label, value }: { label: string; value: string }) { return (<div className="rounded-lg p-2" style={{ background: T.bg }}><div className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: T.muted }}>{label}</div><div className="text-xs truncate" style={{ color: T.text }}>{value}</div></div>); }
function SpinInline({ size = 14 }: { size?: number }) { return (<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${T.text}20`, borderTop: `2px solid ${T.primary}` }} />); }
