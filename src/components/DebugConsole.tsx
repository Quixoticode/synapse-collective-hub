import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal, Globe, User, Monitor, Trash2, Download } from "lucide-react";
import { getXsynaSession } from "@/lib/xsyna-session";

const T = {
  bg: "#020407",
  bg2: "#07101a",
  surface: "#0c1624",
  border: "rgba(255,255,255,0.07)",
  primary: "#00E5FF",
  secondary: "#FFB300",
  accent: "#7B4FFF",
  success: "#00FF88",
  error: "#FF4060",
  text: "#E8F4FF",
  muted: "#4A6080",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LogEntry = {
  id: string;
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: string;
  source?: string;
};

export type NetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
};

type TabKey = "console" | "network" | "session" | "env";

let globalId = 0;
const nextId = () => `dbg_${++globalId}_${Date.now().toString(36)}`;

const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * DebugConsole — Terminal-style debug panel for xSyna Central.
 *
 * Captures console output (log / warn / error / info) and network
 * requests, displays session data, and shows environment info.
 *
 * Tabs: Console | Network | Session | Env
 */
export function DebugConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>("console");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  /* -- intercept console ------------------------------------------------ */
  useEffect(() => {
    const originals = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    const makeHandler =
      (type: LogEntry["type"]) =>
      (...args: unknown[]) => {
        originals[type](...args);
        const message = args
          .map((a) =>
            typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)
          )
          .join(" ");
        setLogs((prev) => [
          ...prev,
          {
            id: nextId(),
            type,
            message,
            timestamp: ts(),
            source: captureStack(),
          },
        ]);
      };

    console.log = makeHandler("log");
    console.warn = makeHandler("warn");
    console.error = makeHandler("error");
    console.info = makeHandler("info");

    return () => {
      console.log = originals.log;
      console.warn = originals.warn;
      console.error = originals.error;
      console.info = originals.info;
    };
  }, []);

  /* -- intercept fetch -------------------------------------------------- */
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const start = performance.now();
      const [input, init] = args;
      const url = typeof input === "string" ? input : input.url;
      const method = init?.method ?? "GET";

      try {
        const response = await origFetch(...args);
        const duration = Math.round(performance.now() - start);
        setNetworkLogs((prev) => [
          ...prev,
          {
            id: nextId(),
            method,
            url: url.slice(0, 200),
            status: response.status,
            duration,
            timestamp: ts(),
          },
        ]);
        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        setNetworkLogs((prev) => [
          ...prev,
          {
            id: nextId(),
            method,
            url: url.slice(0, 200),
            status: 0,
            duration,
            timestamp: ts(),
          },
        ]);
        throw err;
      }
    };

    return () => {
      window.fetch = origFetch;
    };
  }, []);

  /* -- auto-scroll console --------------------------------------------- */
  useEffect(() => {
    if (activeTab === "console" && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  /* -- actions ---------------------------------------------------------- */
  const clearAll = useCallback(() => {
    setLogs([]);
    setNetworkLogs([]);
  }, []);

  const exportAll = useCallback(() => {
    const session = getXsynaSession();
    const payload = {
      exportedAt: new Date().toISOString(),
      console: logs,
      network: networkLogs,
      session,
      environment: getEnvInfo(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xsyna-debug_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, networkLogs]);

  /* -- tab config ------------------------------------------------------- */
  const tabs: { key: TabKey; label: string; icon: typeof Terminal }[] = [
    { key: "console", label: "Console", icon: Terminal },
    { key: "network", label: "Network", icon: Globe },
    { key: "session", label: "Session", icon: User },
    { key: "env", label: "Env", icon: Monitor },
  ];

  const logCounts = {
    log: logs.filter((l) => l.type === "log").length,
    warn: logs.filter((l) => l.type === "warn").length,
    error: logs.filter((l) => l.type === "error").length,
    info: logs.filter((l) => l.type === "info").length,
  };

  return (
    <div
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 12,
        color: T.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        minHeight: 320,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: T.bg2,
          borderBottom: `1px solid ${T.border}`,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Terminal size={14} style={{ color: T.primary }} />
          <span style={{ fontWeight: 600, fontSize: 11, letterSpacing: 1 }}>
            xSYNA DEBUG CONSOLE
          </span>
          <span
            style={{
              fontSize: 10,
              color: T.muted,
              marginLeft: 4,
              background: T.surface,
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {logs.length + networkLogs.length} entries
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={clearAll}
            title="Clear all logs"
            style={iconButtonStyle}
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={exportAll}
            title="Export as JSON"
            style={iconButtonStyle}
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "7px 8px",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: 0.5,
                color: isActive ? T.primary : T.muted,
                background: isActive ? `${T.primary}10` : "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${T.primary}`
                  : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              <Icon size={12} />
              <span style={{ display: "inline" }}>{t.label}</span>
              {t.key === "console" && logs.length > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "0 4px",
                    borderRadius: 6,
                    background: T.bg2,
                    color: T.muted,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {logs.length}
                </span>
              )}
              {t.key === "network" && networkLogs.length > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "0 4px",
                    borderRadius: 6,
                    background: T.bg2,
                    color: T.muted,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {networkLogs.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 8,
        }}
      >
        {activeTab === "console" && (
          <ConsoleTab logs={logs} counts={logCounts} endRef={consoleEndRef} />
        )}
        {activeTab === "network" && <NetworkTab entries={networkLogs} />}
        {activeTab === "session" && <SessionTab />}
        {activeTab === "env" && <EnvTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Console Tab                                                        */
/* ------------------------------------------------------------------ */

function ConsoleTab({
  logs,
  counts,
  endRef,
}: {
  logs: LogEntry[];
  counts: Record<string, number>;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (logs.length === 0) {
    return <EmptyState message="No console logs captured yet." />;
  }

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 8,
          fontSize: 10,
          color: T.muted,
        }}
      >
        <span style={{ color: T.text }}>{counts.log} log</span>
        <span style={{ color: T.secondary }}>{counts.warn} warn</span>
        <span style={{ color: T.error }}>{counts.error} error</span>
        <span style={{ color: T.primary }}>{counts.info} info</span>
      </div>

      {logs.map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: "4px 6px",
            borderRadius: 4,
            marginBottom: 2,
            fontSize: 11,
            lineHeight: 1.5,
            wordBreak: "break-word",
            background:
              entry.type === "error"
                ? `${T.error}08`
                : entry.type === "warn"
                  ? `${T.secondary}08`
                  : "transparent",
          }}
        >
          <span style={{ color: T.muted, fontSize: 10, marginRight: 8 }}>
            {entry.timestamp.split(" ")[1]}
          </span>
          <span
            style={{
              color:
                entry.type === "error"
                  ? T.error
                  : entry.type === "warn"
                    ? T.secondary
                    : entry.type === "info"
                      ? T.primary
                      : T.text,
              fontWeight: entry.type === "error" ? 600 : 400,
            }}
          >
            {entry.type === "error" && "[ERR] "}
            {entry.type === "warn" && "[WRN] "}
            {entry.type === "info" && "[INF] "}
            {entry.type === "log" && "[LOG] "}
          </span>
          <span style={{ color: T.text, whiteSpace: "pre-wrap" }}>
            {entry.message}
          </span>
          {entry.source && (
            <div
              style={{
                color: T.muted,
                fontSize: 9,
                marginLeft: 74,
                marginTop: 1,
              }}
            >
              {entry.source}
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Network Tab                                                        */
/* ------------------------------------------------------------------ */

function NetworkTab({ entries }: { entries: NetworkEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState message="No network requests captured yet." />;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ color: T.muted, fontSize: 10, textAlign: "left" }}>
            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Time</th>
            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Method</th>
            <th style={{ padding: "4px 6px", fontWeight: 600 }}>URL</th>
            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Status</th>
            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              style={{
                borderTop: `1px solid ${T.border}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={(ev) =>
                (ev.currentTarget.style.background = `${T.primary}06`)
              }
              onMouseLeave={(ev) =>
                (ev.currentTarget.style.background = "transparent")
              }
            >
              <td style={{ padding: "4px 6px", color: T.muted, whiteSpace: "nowrap" }}>
                {e.timestamp.split(" ")[1]}
              </td>
              <td style={{ padding: "4px 6px" }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: `${T.accent}18`,
                    color: T.accent,
                    letterSpacing: 0.5,
                  }}
                >
                  {e.method}
                </span>
              </td>
              <td
                style={{
                  padding: "4px 6px",
                  color: T.text,
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={e.url}
              >
                {e.url}
              </td>
              <td style={{ padding: "4px 6px" }}>
                <StatusBadge status={e.status} />
              </td>
              <td
                style={{
                  padding: "4px 6px",
                  color: e.duration > 1000 ? T.error : T.success,
                  whiteSpace: "nowrap",
                }}
              >
                {e.duration}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  let color = T.muted;
  if (status === 0) color = T.error;
  else if (status >= 200 && status < 300) color = T.success;
  else if (status >= 300 && status < 400) color = T.primary;
  else if (status >= 400) color = T.error;

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "1px 5px",
        borderRadius: 3,
        background: `${color}15`,
        color,
      }}
    >
      {status === 0 ? "ERR" : status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Session Tab                                                        */
/* ------------------------------------------------------------------ */

function SessionTab() {
  const [session, setSession] = useState<ReturnType<typeof getXsynaSession>>(null);

  useEffect(() => {
    setSession(getXsynaSession());
    const handler = () => setSession(getXsynaSession());
    window.addEventListener("xsyna-session-change", handler);
    return () => window.removeEventListener("xsyna-session-change", handler);
  }, []);

  if (!session) {
    return <EmptyState message="No active xSyna session found." />;
  }

  const display = {
    slid: session.slid,
    name:
      session.profile?.first_name && session.profile?.last_name
        ? `${session.profile.first_name} ${session.profile.last_name}`
        : session.profile?.first_name ?? "—",
    email: session.profile?.email ?? "—",
    expires_at: session.expires_at,
    token_preview: `${session.token.slice(0, 16)}…${session.token.slice(-8)}`,
    token_length: session.token.length,
    expired: new Date(session.expires_at) < new Date(),
  };

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: T.muted,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Current xSyna Session
      </div>
      <pre
        style={{
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: 10,
          fontSize: 11,
          lineHeight: 1.6,
          overflow: "auto",
          color: T.text,
        }}
      >
        {JSON.stringify(display, null, 2)}
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Environment Tab                                                    */
/* ------------------------------------------------------------------ */

function EnvTab() {
  const env = getEnvInfo();

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: T.muted,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Browser &amp; System Environment
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          gap: "1px",
          background: T.border,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          overflow: "hidden",
          fontSize: 11,
        }}
      >
        {Object.entries(env).map(([key, value]) => (
          <div key={key} style={{ display: "contents" }}>
            <div
              style={{
                background: T.bg2,
                padding: "5px 8px",
                color: T.muted,
                fontWeight: 500,
              }}
            >
              {key}
            </div>
            <div
              style={{
                background: T.surface,
                padding: "5px 8px",
                color: T.text,
                wordBreak: "break-word",
              }}
            >
              {String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 120,
        color: T.muted,
        fontSize: 11,
        textAlign: "center",
        padding: 20,
      }}
    >
      {message}
    </div>
  );
}

function getEnvInfo(): Record<string, string> {
  const nav = navigator as Record<string, unknown>;
  return {
    "User Agent": navigator.userAgent,
    Platform: navigator.platform,
    Language: navigator.language,
    Languages: navigator.languages.join(", "),
    "Screen Size": `${window.screen.width}x${window.screen.height}`,
    "Window Size": `${window.innerWidth}x${window.innerHeight}`,
    "Device Pixel Ratio": String(window.devicePixelRatio),
    "Color Depth": `${window.screen.colorDepth}-bit`,
    "Online": navigator.onLine ? "Yes" : "No",
    "Touch Support":
      "ontouchstart" in window || nav.maxTouchPoints
        ? `Yes (${nav.maxTouchPoints ?? 1} points)`
        : "No",
    URL: window.location.href,
    Origin: window.location.origin,
    Pathname: window.location.pathname,
    "Memory (GB)": nav.deviceMemory ? String(nav.deviceMemory) : "—",
    Cores: nav.hardwareConcurrency
      ? String(nav.hardwareConcurrency)
      : "—",
    CookieEnabled: navigator.cookieEnabled ? "Yes" : "No",
    "Referrer": document.referrer || "—",
  };
}

function captureStack(): string | undefined {
  try {
    throw new Error("_");
  } catch (e) {
    const stack = (e as Error).stack;
    if (!stack) return undefined;
    const lines = stack.split("\n").slice(3);
    const first = lines.find((l) => l.includes("at ") && !l.includes("DebugConsole"));
    if (first) {
      const match = first.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
      if (match) {
        const [, fn, file, line] = match;
        const shortFile = file?.split("/").pop() ?? file;
        return `${fn ?? "anonymous"} @ ${shortFile}:${line}`;
      }
    }
    return undefined;
  }
}

const iconButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 5,
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.muted,
  cursor: "pointer",
  transition: "all 0.15s",
};
