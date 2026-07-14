/**
 * NeuLoader — Neuromorphic Loading Animation System
 * 8 loader types with unique SVG animations + 4 loader components
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  RefreshCw,
  Zap,
  Loader2,
  Power,
  Cpu,
  Download,
  Wifi,
} from "lucide-react";
import { T } from "@/components/nl";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export type LoaderType =
  | "think"
  | "sync"
  | "send"
  | "load"
  | "bootup"
  | "process"
  | "download"
  | "connect";

/* ═══════════════════════════════════════════
   COLOR MAP — each loader type has a unique color
   ═══════════════════════════════════════════ */
const COLOR_MAP: Record<LoaderType, string> = {
  think: T.accent,
  sync: T.primary,
  send: T.secondary,
  load: T.primary,
  bootup: T.success,
  process: T.accent,
  download: T.secondary,
  connect: T.success,
};

const LABEL_MAP: Record<LoaderType, string> = {
  think: "Denke nach…",
  sync: "Synchronisiere…",
  send: "Sende…",
  load: "Lade…",
  bootup: "Starte…",
  process: "Verarbeite…",
  download: "Lade herunter…",
  connect: "Verbinde…",
};

/* ═══════════════════════════════════════════
   ICON MAP — lucide-react icons
   ═══════════════════════════════════════════ */
const ICON_MAP: Record<LoaderType, React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>> = {
  think: Brain,
  sync: RefreshCw,
  send: Zap,
  load: Loader2,
  bootup: Power,
  process: Cpu,
  download: Download,
  connect: Wifi,
};

/* ═══════════════════════════════════════════
   ANIMATED ICON — unique animation per type
   ═══════════════════════════════════════════ */
function AnimatedIcon({ type, size = 28 }: { type: LoaderType; size?: number }) {
  const Icon = ICON_MAP[type];
  const color = COLOR_MAP[type];

  switch (type) {
    case "think":
      return (
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "sync":
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "send":
      return (
        <motion.div
          animate={{ x: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "load":
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "bootup":
      return (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ color, filter: `drop-shadow(0 0 10px ${color}80)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "process":
      return (
        <motion.div
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "download":
      return (
        <motion.div
          animate={{ y: [0, 4, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    case "connect":
      return (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      );

    default:
      return <Icon size={size} strokeWidth={1.5} style={{ color }} />;
  }
}

/* ═══════════════════════════════════════════
   SVG GEAR — animated gear for maintenance/boot
   ═══════════════════════════════════════════ */
export function AnimatedGear({ size = 40, color = T.muted }: { size?: number; color?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4m0 14v4m4.22-17.22-2.83 2.83m-2.83 2.83-2.83 2.83m14.14-2.83-2.83-2.83m-2.83-2.83L9.88 2.98M23 12h-4m-14 0H1m17.22 4.22-2.83-2.83m-2.83-2.83L9.88 9.88" />
    </motion.svg>
  );
}

/* ═══════════════════════════════════════════
   1. NeuLoader — main component with icon + label
   ═══════════════════════════════════════════ */
export function NeuLoader({ type, label }: { type: LoaderType; label?: string }) {
  const color = COLOR_MAP[type];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center gap-3"
      style={{ minHeight: 80, justifyContent: "center" }}
    >
      <AnimatedIcon type={type} size={32} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: T.muted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label || LABEL_MAP[type]}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   2. LoadingOverlay — fullscreen dark overlay
   ═══════════════════════════════════════════ */
export function LoadingOverlay({
  type = "sync",
  label,
  visible,
}: {
  type?: LoaderType;
  label?: string;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: `${T.bg}ee`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Ambient glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLOR_MAP[type]}20 0%, transparent 70%)`,
              filter: "blur(40px)",
            }}
          />

          <AnimatedIcon type={type} size={48} />
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: T.muted,
              letterSpacing: "0.04em",
            }}
          >
            {label || LABEL_MAP[type]}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   3. InlineLoader — small inline for buttons/cards
   ═══════════════════════════════════════════ */
export function InlineLoader({
  type = "sync",
  size = "md",
  label,
}: {
  type?: LoaderType;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const s = size === "sm" ? 18 : size === "md" ? 28 : 44;
  return (
    <div className="inline-flex items-center gap-2">
      <AnimatedIcon type={type} size={s} />
      {label && (
        <span style={{ fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk',sans-serif" }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   4. PageLoader — page-level loader
   ═══════════════════════════════════════════ */
export function PageLoader({ type = "sync", label }: { type?: LoaderType; label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 280,
        gap: 16,
        flexDirection: "column",
      }}
    >
      <AnimatedIcon type={type} size={52} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          color: T.muted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label || LABEL_MAP[type]}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   5. SkeletonPulse — animated skeleton placeholder
   ═══════════════════════════════════════════ */
export function SkeletonPulse({
  width = "100%",
  height = 16,
  radius = 8,
  className = "",
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        opacity: [0.35, 0.6, 0.35],
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
      }}
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${T.surface} 25%, ${T.border} 50%, ${T.surface} 75%)`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}

/* ═══════════════════════════════════════════
   6. SkeletonCard — multi-line skeleton card
   ═══════════════════════════════════════════ */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4" style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 16 }}>
      <SkeletonPulse width="60%" height={16} radius={6} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse key={i} width={i === lines - 1 ? "40%" : "100%"} height={12} radius={4} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   7. BootupSequence — animated boot text
   ═══════════════════════════════════════════ */
const BOOT_LINES = [
  "> INIT NEURAL CORE v3.2",
  "> LOADING LIQUID SHADERS",
  "> SYNC CORTEX LAYERS",
  "> BINDING AXON MESH",
  "> READY ✓",
];

export function BootupSequence({ onComplete }: { onComplete?: () => void }) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const addLine = () => {
      if (i < BOOT_LINES.length) {
        setLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
        setTimeout(addLine, 500);
      } else {
        setTimeout(() => onComplete?.(), 800);
      }
    };
    const t = setTimeout(addLine, 300);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        lineHeight: 1.8,
        color: T.primary,
      }}
    >
      <AnimatePresence>
        {lines.map((line, i) => (
          <motion.div
            key={`${line}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              color: line.includes("READY") ? T.success : T.primary,
              textShadow: line.includes("READY") ? `0 0 8px ${T.success}60` : `0 0 6px ${T.primary}40`,
            }}
          >
            {line}
          </motion.div>
        ))}
      </AnimatePresence>
      {lines.length < BOOT_LINES.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ color: T.primary }}
        >
          _
        </motion.span>
      )}
    </div>
  );
}
