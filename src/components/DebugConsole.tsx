import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Trash2, Wifi, Shield, ChevronDown,
  ChevronRight, Copy, Check, Bug, XCircle, AlertTriangle, Info
} from "lucide-react";
import { T } from "./nl/tokens";

/* ───────── Types ───────── */
type LogEntry = {
  id: string;
  type: "log" | "error" | "warn" | "info" | "debug";
  message: string;
  timestamp: string;
  source?: string;
};

type NetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
};

/* ───────── helpers ───────── */
const now = () => new Date().toLocaleTimeString("de-DE");

let _id = 0;
const uid = () => `dbg_${++_id}`;

/* ═══════════════════════════════════
   DebugConsole
   ═══════════════════════════════════ */
export function DebugConsole() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"console" | "network" | "session" | "env">("console");

  /* Console intercept */
  const [logs, setLogs] = useState<LogEntry[]>([]);
  useEffect(() => {
    const orig = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
    (Object.keys(orig) as (keyof typeof orig)[]).forEach((level) => {
      console[level] = (...args: any[]) => {
        orig[level](...args);
        setLogs((prev) => [
          ...prev,
          {
            id: uid(),
            type: level as LogEntry["type"],
            message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
            timestamp: now(),
          },
        ]);
      };
    });
    return () => {
      Object.assign(console, orig);
    };
  }, []);

  /* Network intercept */
  const [network, setNetwork] = useState<NetworkEntry[]>([]);
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (...args: any[]) => {
      const start = performance.now();
      const [url, init] = args;
      try {
        const res = await orig(...args);
        setNetwork((prev) => [
          ...prev,
          {
            id: uid(),
            method: init?.method || "GET",
            url: String(url),
            status: res.status,
            duration: Math.round(performance.now() - start),
            timestamp: now(),
          },
        ]);
        return res;
      } catch (e) {
        setNetwork((prev) => [
          ...prev,
          {
            id: uid(),
            method: init?.method || "GET",
            url: String(url),
            status: 0,
            duration: Math.round(performance.now() - start),
            timestamp: now(),
          },
        ]);
        throw e;
      }
    };
    return () => {
      window.fetch = orig;
    };
  }, []);

  /* Session read */
  const session = (() => {
    try {
      const raw = localStorage.getItem("syn.session.v1");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const clearLogs = useCallback(() => setLogs([]), []);
  const clearNetwork = useCallback(() => setNetwork([]), []);

  /* Tabs */
  const tabs = [
    { key: "console" as const, icon: Activity, label: "Console" },
    { key: "network" as const, icon: Wifi, label: "Network" },
    { key: "session" as const, icon: Shield, label: "Session" },
    { key: "env" as const, icon: Bug, label: "Env" },
  ];

  /* Scroll to bottom of log lists */
  const consoleEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && tab === "console") consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, open, tab]);

  const COLORS: Record<LogEntry["type"], string> = {
    log: T.text,
    info: T.primary,
    warn: T.secondary,
    error: T.error,
    debug: T.muted,
  };

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`,
            border: `2px solid ${T.primary}44`,
            boxShadow: `0 0 20px ${T.primary}33`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bug size={22} color="#fff" />
        </motion.button>
      )}

      {/* Main panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 9999,
              width: 520,
              maxWidth: "calc(100vw - 40px)",
              height: 420,
              background: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: T.text,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: `1px solid ${T.border}`,
                background: T.surface,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bug size={14} style={{ color: T.primary }} />
                <span style={{ fontWeight: 600, fontSize: 12 }}>Debug Console</span>
                <span
                  style={{
                    fontSize: 9,
                    color: T.muted,
                    background: T.bg,
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  {logs.length} logs
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <XCircle size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "4px 8px",
                borderBottom: `1px solid ${T.border}`,
                background: T.bg,
              }}
            >
              {tabs.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "4px 0",
                      borderRadius: 6,
                      border: "none",
                      background: active ? `${T.primary}22` : "transparent",
                      color: active ? T.primary : T.muted,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <t.icon size={11} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                {/* ── Console Tab ── */}
                {tab === "console" && (
                  <motion.div
                    key="console"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ height: "100%", display: "flex", flexDirection: "column" }}
                  >
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "6px 10px",
                        fontSize: 10,
                      }}
                    >
                      {logs.length === 0 && (
                        <div style={{ color: T.muted, textAlign: "center", paddingTop: 40 }}>
                          No logs yet.
                        </div>
                      )}
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            display: "flex",
                            gap: 8,
                            padding: "2px 0",
                            borderBottom: `1px solid ${T.border}44`,
                            color: COLORS[log.type],
                          }}
                        >
                          <span style={{ color: T.muted, flexShrink: 0 }}>[{log.timestamp}]</span>
                          <span
                            style={{
                              textTransform: "uppercase",
                              fontWeight: 700,
                              flexShrink: 0,
                              minWidth: 36,
                            }}
                          >
                            {log.type}
                          </span>
                          <span style={{ wordBreak: "break-all" }}>{log.message}</span>
                        </div>
                      ))}
                      <div ref={consoleEndRef} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "4px 10px",
                        borderTop: `1px solid ${T.border}`,
                        gap: 6,
                      }}
                    >
                      <button
                        onClick={clearLogs}
                        style={{
                          fontSize: 9,
                          color: T.muted,
                          background: "none",
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Network Tab ── */}
                {tab === "network" && (
                  <motion.div
                    key="network"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ height: "100%", display: "flex", flexDirection: "column" }}
                  >
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "6px 10px",
                        fontSize: 10,
                      }}
                    >
                      {network.length === 0 && (
                        <div style={{ color: T.muted, textAlign: "center", paddingTop: 40 }}>
                          No network requests yet.
                        </div>
                      )}
                      {network.map((req) => (
                        <div
                          key={req.id}
                          style={{
                            display: "flex",
                            gap: 8,
                            padding: "3px 0",
                            borderBottom: `1px solid ${T.border}44`,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color:
                                req.status >= 200 && req.status < 300
                                  ? T.success
                                  : req.status >= 400
                                    ? T.error
                                    : T.muted,
                              fontWeight: 700,
                              minWidth: 28,
                            }}
                          >
                            {req.status || "ERR"}
                          </span>
                          <span
                            style={{
                              color: T.primary,
                              fontWeight: 600,
                              minWidth: 40,
                              textTransform: "uppercase",
                            }}
                          >
                            {req.method}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {req.url}
                          </span>
                          <span style={{ color: T.muted }}>{req.duration}ms</span>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "4px 10px",
                        borderTop: `1px solid ${T.border}`,
                      }}
                    >
                      <button
                        onClick={clearNetwork}
                        style={{
                          fontSize: 9,
                          color: T.muted,
                          background: "none",
                          border: `1px solid ${T.border}`,
                          borderRadius: 4,
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Session Tab ── */}
                {tab === "session" && (
                  <motion.div
                    key="session"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      height: "100%",
                      overflowY: "auto",
                      padding: "10px 12px",
                      fontSize: 10,
                    }}
                  >
                    {session ? (
                      <>
                        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: T.primary, fontWeight: 600 }}>Session Data</span>
                          <CopyButton text={JSON.stringify(session, null, 2)} />
                        </div>
                        <pre
                          style={{
                            background: T.bg,
                            padding: 8,
                            borderRadius: 8,
                            border: `1px solid ${T.border}`,
                            overflow: "auto",
                            maxHeight: 280,
                            color: T.text,
                          }}
                        >
                          {JSON.stringify(session, null, 2)}
                        </pre>
                      </>
                    ) : (
                      <div style={{ color: T.muted, textAlign: "center", paddingTop: 40 }}>
                        No session found in localStorage.
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: T.primary, fontWeight: 600, marginBottom: 6 }}>Token</div>
                      <div
                        style={{
                          background: T.bg,
                          padding: 8,
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
                          wordBreak: "break-all",
                          color: T.muted,
                        }}
                      >
                        {session?.xsynaToken || "No xSyna token"}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Env Tab ── */}
                {tab === "env" && (
                  <motion.div
                    key="env"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      height: "100%",
                      overflowY: "auto",
                      padding: "10px 12px",
                      fontSize: 10,
                    }}
                  >
                    <EnvRow label="App" value="xSyna Central" />
                    <EnvRow label="Version" value="3.0.0" />
                    <EnvRow label="Build" value={new Date().toISOString()} />
                    <EnvRow label="User Agent" value={navigator.userAgent} />
                    <EnvRow label="Screen" value={`${window.screen.width}x${window.screen.height}`} />
                    <EnvRow label="Language" value={navigator.language} />
                    <EnvRow label="Platform" value={navigator.platform} />
                    <EnvRow label="Online" value={navigator.onLine ? "Yes" : "No"} />
                    <EnvRow label="Touch" value={"ontouchstart" in window ? "Yes" : "No"} />
                    <EnvRow
                      label="Color Scheme"
                      value={window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light"}
                    />
                    <EnvRow
                      label="Reduced Motion"
                      value={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "Yes" : "No"}
                    />
                    <EnvRow label="Viewport" value={`${window.innerWidth}x${window.innerHeight}`} />
                    <EnvRow label="Device Memory" value={(navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "Unknown"} />
                    <EnvRow label="CPU Cores" value={navigator.hardwareConcurrency?.toString() || "Unknown"} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────── Sub-components ───────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        background: "none",
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        padding: "2px 6px",
        color: T.muted,
        cursor: "pointer",
        fontSize: 9,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {copied ? <Check size={10} style={{ color: T.success }} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
        borderBottom: `1px solid ${T.border}44`,
      }}
    >
      <span style={{ color: T.muted }}>{label}</span>
      <span style={{ color: T.text, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
