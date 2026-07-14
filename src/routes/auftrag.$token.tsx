import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle, XCircle, Zap, User, Mail, Phone, Calendar,
  ClipboardList, ArrowLeft, Copy, Check
} from "lucide-react";
import { XSynaLogo, T } from "@/components/nl";
import { auftragByToken } from "@/lib/auftrag.functions";

export const Route = createFileRoute("/auftrag/$token")({
  component: AuftragSharePage,
});

type AuftragRow = {
  id: string;
  title: string;
  description: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  creator_slid: string;
  assigned_slid: string | null;
  share_token: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: "Ausstehend", color: T.secondary, icon: Clock },
  in_progress: { label: "In Bearbeitung", color: T.primary, icon: Zap },
  completed: { label: "Abgeschlossen", color: T.success, icon: CheckCircle },
  cancelled: { label: "Storniert", color: T.error, icon: XCircle },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: "Niedrig", color: T.muted },
  normal: { label: "Normal", color: T.primary },
  high: { label: "Hoch", color: T.secondary },
  urgent: { label: "Dringend", color: T.error },
};

function AuftragSharePage() {
  const { token } = Route.useParams();
  const fetchFn = useServerFn(auftragByToken);
  const [auftrag, setAuftrag] = useState<AuftragRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const row = await fetchFn({ data: { token } }) as AuftragRow;
        setAuftrag(row);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auftrag nicht gefunden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, fetchFn]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[
          { c: `${T.primary}1e`, s: 700, x: "8%", y: "10%", d: 22 },
          { c: `${T.accent}18`, s: 600, x: "90%", y: "60%", d: 28 },
          { c: `${T.secondary}12`, s: 500, x: "50%", y: "85%", d: 20 },
        ].map((b, i) => (
          <div key={i} style={{ position: "absolute", width: b.s, height: b.s, left: b.x, top: b.y, transform: "translate(-50%,-50%)", background: b.c, filter: `blur(${Math.round(b.s * 0.19)}px)`, animation: `blobMorph ${b.d}s ease-in-out infinite`, mixBlendMode: "screen" }} />
        ))}
      </div>

      <header style={{ position: "relative", zIndex: 1, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <XSynaLogo size={28} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "14px" }}>xSyna Central</span>
          </div>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: T.muted, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Zurück
          </a>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Clock size={32} style={{ color: T.primary }} />
                </motion.div>
                <span style={{ color: T.muted, fontSize: 13 }}>Lade Auftrag…</span>
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: T.bg2, border: `1px solid ${T.error}44`, borderRadius: "16px", padding: "32px", textAlign: "center" }}>
                <XCircle size={48} style={{ color: T.error, margin: "0 auto 16px" }} />
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "18px", marginBottom: "8px" }}>Auftrag nicht gefunden</h2>
                <p style={{ color: T.muted, fontSize: "13px" }}>{error}</p>
              </motion.div>
            ) : auftrag ? (
              <motion.div key="card" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <div style={{
                  background: `${STATUS_META[auftrag.status].color}15`,
                  border: `1px solid ${STATUS_META[auftrag.status].color}44`,
                  borderRadius: "16px",
                  padding: "20px 24px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}>
                  {(() => { const Icon = STATUS_META[auftrag.status].icon; return <Icon size={28} style={{ color: STATUS_META[auftrag.status].color, flexShrink: 0 }} />; })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Status</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "18px", color: STATUS_META[auftrag.status].color }}>
                      {STATUS_META[auftrag.status].label}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: T.muted }}>Priorität</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: PRIORITY_META[auftrag.priority].color }}>{PRIORITY_META[auftrag.priority].label}</div>
                  </div>
                </div>

                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${T.primary}12`, border: `1px solid ${T.primary}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ClipboardList size={18} style={{ color: T.primary }} />
                    </div>
                    <div>
                      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "16px" }}>{auftrag.title}</h1>
                      <div style={{ fontSize: "11px", color: T.muted }}>Token: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{auftrag.share_token}</span></div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", color: T.muted }}>
                      <span>Ausstehend</span><span>In Bearbeitung</span><span>Abgeschlossen</span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: T.border, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: auftrag.status === "pending" ? "33%" : auftrag.status === "in_progress" ? "66%" : auftrag.status === "completed" ? "100%" : "0%", height: "100%", borderRadius: "3px", background: `linear-gradient(90deg,${T.primary},${T.accent})`, transition: "width .5s ease" }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "12px" }}>
                    <InfoRow icon={User} label="Kunde" value={auftrag.customer_name} />
                    {auftrag.customer_email && <InfoRow icon={Mail} label="E-Mail" value={auftrag.customer_email} />}
                    {auftrag.customer_phone && <InfoRow icon={Phone} label="Telefon" value={auftrag.customer_phone} />}
                    <InfoRow icon={Calendar} label="Erstellt" value={new Date(auftrag.created_at).toLocaleString("de-DE")} />
                    {auftrag.description && (
                      <div style={{ padding: "12px", background: T.bg, borderRadius: "10px", border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: "10px", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>Beschreibung</div>
                        <div style={{ fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{auftrag.description}</div>
                      </div>
                    )}
                  </div>

                  {auftrag.notes && (
                    <div style={{ marginTop: "16px", padding: "12px", background: T.bg, borderRadius: "10px", border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: "10px", color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>Notizen</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono',monospace", color: T.muted }}>{auftrag.notes}</div>
                    </div>
                  )}

                  <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={copyLink}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "10px",
                        borderRadius: "10px",
                        border: `1px solid ${T.primary}44`,
                        background: `${T.primary}11`,
                        color: T.primary,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk',sans-serif",
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Kopiert!" : "Link kopieren"}
                    </button>
                  </div>
                </div>

                <p style={{ textAlign: "center", fontSize: "11px", color: T.muted, marginTop: "16px" }}>
                  Diese Seite ist öffentlich einsehbar. Speichern Sie den Link für den Zugriff.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} style={{ color: T.muted }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      </div>
    </div>
  );
}
