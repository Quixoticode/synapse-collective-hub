import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, XCircle, Clock, ArrowRight,
  Brain, Zap, Shield, RefreshCw, Download, Wifi, Server,
  Layers, CircleDot, Orbit, Hexagon, Boxes, Lightbulb,
  CircuitBoard, Radio, Triangle, Diamond
} from "lucide-react";

/* ──────────────────────────────
   T  –  minimal local token set
   ────────────────────────────── */
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
} as const;

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
   ICON MAP
   ═══════════════════════════════════════════ */
const ICON_MAP: Record<LoaderType, React.ComponentType<any>> = {
  think: Brain,
  sync: RefreshCw,
  send: Zap,
  load: Loader2,
  bootup: Server,
  process: CircuitBoard,
  download: Download,
  connect: Wifi,
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
   Full-screen overlay
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
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: `${T.bg}ee`,
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <InlineLoader type={type} size="lg" />
      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: T.muted,
          letterSpacing: "0.02em",
        }}
      >
        {label || LABEL_MAP[type]}
      </motion.span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Inline spinner
   ═══════════════════════════════════════════ */
export function InlineLoader({
  type = "sync",
  size = "md",
}: {
  type?: LoaderType;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICON_MAP[type];
  const s = size === "sm" ? 18 : size === "md" ? 28 : 44;

  return (
    <motion.div
      animate={
        type === "load"
          ? { rotate: 360 }
          : type === "sync" || type === "bootup" || type === "process"
            ? { rotate: [0, 360] }
            : type === "think"
              ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }
              : type === "send"
                ? { x: [0, 4, 0] }
                : type === "connect"
                  ? { scale: [1, 1.15, 1] }
                  : { y: [0, 3, 0] }
      }
      transition={
        type === "think"
          ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          : type === "send"
            ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 1.2, repeat: Infinity, ease: "linear" }
      }
      style={{
        display: "inline-flex",
        color: T.primary,
        filter: `drop-shadow(0 0 6px ${T.primary}44)`,
      }}
    >
      <Icon size={s} strokeWidth={1.5} />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Page-level loader
   ═══════════════════════════════════════════ */
export function PageLoader({ type = "sync" }: { type?: LoaderType }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        gap: 12,
        flexDirection: "column",
      }}
    >
      <InlineLoader type={type} size="lg" />
      <span style={{ fontSize: 12, color: T.muted }}>{LABEL_MAP[type]}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Skeleton pulse
   ═══════════════════════════════════════════ */
export function SkeletonPulse({
  width = "100%",
  height = 16,
  radius = 8,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: [0.35, 0.6, 0.35] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${T.surface}, ${T.border}, ${T.surface})`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}
