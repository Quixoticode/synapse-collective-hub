import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Download,
  CheckCircle,
  CircleDot,
} from "lucide-react";

// ─── Theme constants (match the Neuromorphic design system) ─────────
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

export type LoaderType =
  | "think"
  | "sync"
  | "send"
  | "load"
  | "bootup"
  | "process"
  | "download"
  | "connect";

// ─── Size scale map ────────────────────────────────────────────────
const sizeMap = {
  sm: { scale: 0.65, gap: 8 },
  md: { scale: 1, gap: 12 },
  lg: { scale: 1.4, gap: 16 },
};

// ═══════════════════════════════════════════════════════════════════
//  1. THINK — 3 bouncing dots with y-axis animation + opacity cycling
// ═══════════════════════════════════════════════════════════════════
function ThinkLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const dots = [0, 1, 2];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8 * scale,
      }}
    >
      {dots.map((i) => (
        <motion.div
          key={i}
          style={{
            width: 10 * scale,
            height: 10 * scale,
            borderRadius: "50%",
            backgroundColor: T.primary,
          }}
          animate={{
            y: [0, -12 * scale, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  2. SYNC — Dual counter-rotating rings + centre dot
// ═══════════════════════════════════════════════════════════════════
function SyncLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const s = 48 * scale;

  return (
    <div
      style={{
        position: "relative",
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* outer ring  */}
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2.5px solid ${T.primary}`,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
      {/* inner ring  */}
      <motion.div
        style={{
          position: "absolute",
          inset: 8 * scale,
          borderRadius: "50%",
          border: `2px solid ${T.secondary}`,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      {/* centre dot */}
      <motion.div
        style={{
          width: 6 * scale,
          height: 6 * scale,
          borderRadius: "50%",
          backgroundColor: T.primary,
        }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  3. SEND — Send icon flying right with trail effect
// ═══════════════════════════════════════════════════════════════════
function SendLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const iconSize = 24 * scale;

  return (
    <div
      style={{
        position: "relative",
        width: 80 * scale,
        height: 40 * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* trail dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: 3 * scale,
            height: 3 * scale,
            borderRadius: "50%",
            backgroundColor: T.primary,
          }}
          initial={{ x: -24 * scale, opacity: 0 }}
          animate={{
            x: [8 * scale, 30 * scale],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeOut",
          }}
        />
      ))}
      {/* flying send icon */}
      <motion.div
        animate={{
          x: [-16 * scale, 20 * scale],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Send size={iconSize} color={T.primary} style={{ transform: "rotate(-45deg)" }} />
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  4. LOAD — Progress bar with percentage counter (0 → 100)
// ═══════════════════════════════════════════════════════════════════
function LoadLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 3200;

    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { start = null; raf = requestAnimationFrame(tick); }, 600);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const barW = 160 * scale;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * scale }}>
      <div
        style={{
          width: barW,
          height: 4 * scale,
          borderRadius: 4 * scale,
          backgroundColor: T.bg2,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
        }}
      >
        <motion.div
          style={{
            height: "100%",
            borderRadius: 4 * scale,
            background: `linear-gradient(90deg, ${T.primary}, ${T.accent})`,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.15, ease: "linear" }}
        />
      </div>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11 * scale,
          color: T.muted,
          letterSpacing: "0.08em",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  5. BOOTUP — Terminal-style typing lines
// ═══════════════════════════════════════════════════════════════════
const BOOT_LINES = [
  "INIT NEURAL CORE v3.2",
  "LOADING LIQUID SHADERS",
  "SYNC CORTEX LAYERS",
  "BINDING AXON MESH",
  "READY ✓",
];

function BootupLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const [phase, setPhase] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [cursorVisible, setCursorVisible] = useState(true);

  const resetBootup = useCallback(() => {
    setDisplayedLines([]);
    setPhase(0);
  }, []);

  useEffect(() => {
    if (phase >= BOOT_LINES.length) {
      const t = setTimeout(resetBootup, 1800);
      return () => clearTimeout(t);
    }
    const fullText = BOOT_LINES[phase];
    let idx = 0;
    const typeInterval = setInterval(() => {
      idx++;
      setDisplayedLines((prev) => {
        const copy = [...prev];
        copy[phase] = fullText.slice(0, idx);
        return copy;
      });
      if (idx >= fullText.length) {
        clearInterval(typeInterval);
        setTimeout(() => setPhase((p) => p + 1), 350);
      }
    }, 40);
    return () => clearInterval(typeInterval);
  }, [phase, resetBootup]);

  /* blinking cursor */ useEffect(() => {
    const iv = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4 * scale,
        fontFamily: "monospace",
        fontSize: 11 * scale,
        color: T.text,
        minWidth: 220 * scale,
      }}
    >
      <AnimatePresence initial={false}>
        {BOOT_LINES.map((line, i) => {
          const isReady = line.startsWith("READY");
          const text = displayedLines[i] ?? "";
          if (!text && i > 0 && !displayedLines[i - 1]) return null;

          return (
            <motion.div
              key={`${line}-${phase}`}
              initial={{ opacity: 0, x: -12 * scale }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6 * scale,
                color: isReady ? T.success : i === phase ? T.primary : T.muted,
              }}
            >
              <span style={{ color: T.muted, fontSize: 9 * scale }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                {isReady && text === line ? (
                  <>
                    <CheckCircle
                      size={11 * scale}
                      color={T.success}
                      style={{ display: "inline", marginRight: 6 * scale, verticalAlign: "middle" }}
                    />
                    {text}
                  </>
                ) : (
                  <>
                    {">"} {text}
                    {i === phase && (
                      <span style={{ opacity: cursorVisible ? 1 : 0, marginLeft: 1 }}>
                        {"_"}
                      </span>
                    )}
                  </>
                )}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  6. PROCESS — 8 pulsing dots in a circle + rotating inner ring
// ═══════════════════════════════════════════════════════════════════
function ProcessLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const radius = 28 * scale;
  const dotCount = 8;

  return (
    <div
      style={{
        position: "relative",
        width: radius * 2 + 12 * scale,
        height: radius * 2 + 12 * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* pulsing dots on a circle */}
      {Array.from({ length: dotCount }).map((_, i) => {
        const angle = (i / dotCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <motion.div
            key={i}
            style={{
              position: "absolute",
              width: 5 * scale,
              height: 5 * scale,
              borderRadius: "50%",
              backgroundColor: T.primary,
              left: "50%",
              top: "50%",
              marginLeft: -2.5 * scale,
              marginTop: -2.5 * scale,
            }}
            animate={{
              x: [0, x, x, 0],
              y: [0, y, y, 0],
              scale: [0.6, 1.3, 1.3, 0.6],
              opacity: [0.3, 1, 1, 0.3],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: (i / dotCount) * 2.4,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* rotating inner ring */}
      <motion.div
        style={{
          position: "absolute",
          width: radius * 1.3,
          height: radius * 1.3,
          borderRadius: "50%",
          border: `1.5px dashed ${T.accent}`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* centre dot */}
      <motion.div
        style={{
          width: 6 * scale,
          height: 6 * scale,
          borderRadius: "50%",
          backgroundColor: T.secondary,
          zIndex: 1,
        }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  7. DOWNLOAD — Download icon bouncing vertically + progress bar
// ═══════════════════════════════════════════════════════════════════
function DownloadLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 2800;

    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { start = null; raf = requestAnimationFrame(tick); }, 800);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const barW = 100 * scale;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * scale }}>
      <motion.div
        animate={{ y: [0, 8 * scale, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Download size={22 * scale} color={T.primary} />
      </motion.div>
      <div
        style={{
          width: barW,
          height: 3 * scale,
          borderRadius: 3 * scale,
          backgroundColor: T.bg2,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
        }}
      >
        <motion.div
          style={{
            height: "100%",
            borderRadius: 3 * scale,
            backgroundColor: T.primary,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.12, ease: "linear" }}
        />
      </div>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 9 * scale,
          color: T.muted,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  8. CONNECT — Pulsing green dot + audio-wave style bars
// ═══════════════════════════════════════════════════════════════════
function ConnectLoader({ size }: { size: "sm" | "md" | "lg" }) {
  const { scale } = sizeMap[size];
  const barCount = 7;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10 * scale,
      }}
    >
      {/* pulsing green dot */}
      <div style={{ position: "relative", width: 14 * scale, height: 14 * scale }}>
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            backgroundColor: T.success,
          }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 3 * scale,
            borderRadius: "50%",
            backgroundColor: T.success,
            zIndex: 1,
          }}
        />
      </div>

      {/* audio-wave bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 3 * scale, height: 24 * scale }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const mid = (barCount - 1) / 2;
          const dist = Math.abs(i - mid);
          const maxH = 20 * scale;
          const minH = 4 * scale;
          return (
            <motion.div
              key={i}
              style={{
                width: 3 * scale,
                borderRadius: 2 * scale,
                backgroundColor: T.success,
              }}
              animate={{
                height: [minH + dist * 2 * scale, maxH - dist * 3 * scale, minH + dist * 2 * scale],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.7 + dist * 0.1,
                repeat: Infinity,
                delay: i * 0.06,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DISPATCHER — maps type → loader component
// ═══════════════════════════════════════════════════════════════════
function LoaderByType({ type, size }: { type: LoaderType; size: "sm" | "md" | "lg" }) {
  switch (type) {
    case "think":
      return <ThinkLoader size={size} />;
    case "sync":
      return <SyncLoader size={size} />;
    case "send":
      return <SendLoader size={size} />;
    case "load":
      return <LoadLoader size={size} />;
    case "bootup":
      return <BootupLoader size={size} />;
    case "process":
      return <ProcessLoader size={size} />;
    case "download":
      return <DownloadLoader size={size} />;
    case "connect":
      return <ConnectLoader size={size} />;
    default:
      return <SyncLoader size={size} />;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INLINE LOADER — just the animation, no card wrapper
// ═══════════════════════════════════════════════════════════════════
interface InlineLoaderProps {
  type?: LoaderType;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function InlineLoader({
  type = "sync",
  size = "md",
  label,
  className = "",
}: InlineLoaderProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      style={{ fontFamily: "monospace" }}
    >
      <LoaderByType type={type} size={size} />
      {label && (
        <span style={{ color: T.muted, fontSize: 12, letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LOADING OVERLAY — full-screen dark overlay with centred loader
// ═══════════════════════════════════════════════════════════════════
interface LoadingOverlayProps {
  type?: LoaderType;
  label?: string;
  visible: boolean;
  size?: "sm" | "md" | "lg";
}

export function LoadingOverlay({
  type = "sync",
  label,
  visible,
  size = "md",
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(2,4,7,0.92)",
            backdropFilter: "blur(6px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: "32px 40px",
              borderRadius: 16,
              backgroundColor: T.surface,
              border: `1px solid ${T.border}`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <LoaderByType type={type} size={size} />
            {label && (
              <span
                style={{
                  color: T.muted,
                  fontFamily: "monospace",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DEFAULT EXPORT — a card-wrapped loader (convenience)
// ═══════════════════════════════════════════════════════════════════
interface NeuLoaderProps {
  type?: LoaderType;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export default function NeuLoader({
  type = "sync",
  size = "md",
  label,
  className = "",
}: NeuLoaderProps) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-4 p-6 rounded-2xl ${className}`}
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        fontFamily: "monospace",
      }}
    >
      <LoaderByType type={type} size={size} />
      {label && (
        <span style={{ color: T.muted, fontSize: 11, letterSpacing: "0.06em" }}>
          {label}
        </span>
      )}
    </div>
  );
}

// Re-export type for convenience
export { T as NeuLoaderTheme };
