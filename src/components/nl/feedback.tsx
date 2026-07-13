import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Download } from "lucide-react";
import { T } from "./tokens";

export type LoaderType = "think" | "sync" | "send" | "load" | "bootup" | "process" | "download" | "connect";

export const LoaderCard = ({ type, label }: { type: LoaderType; label: string }) => {
  const [pct, setPct] = useState(0);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [connectPulse, setConnectPulse] = useState(false);
  const BOOT = ["INIT NEURAL CORE v3.2", "LOADING LIQUID SHADERS", "SYNC CORTEX LAYERS", "BINDING AXON MESH", "READY \u2713"];
  useEffect(() => {
    // Timers only run client-side (useEffect never runs during SSR).
    if (type === "load" || type === "download") {
      const iv = setInterval(() => setPct((p) => (p >= 100 ? 0 : p + 1)), 60);
      return () => clearInterval(iv);
    }
    if (type === "bootup") {
      let i = 0;
      const next = () => {
        if (i < BOOT.length) {
          setBootLines((p) => [...p, BOOT[i]]);
          i++;
          setTimeout(next, 600);
        } else {
          setTimeout(() => {
            setBootLines([]);
            i = 0;
            next();
          }, 2000);
        }
      };
      const t = setTimeout(next, 300);
      return () => clearTimeout(t);
    }
    if (type === "connect") {
      const iv = setInterval(() => setConnectPulse((v) => !v), 1000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const Vis = () => {
    switch (type) {
      case "think":
        return (
          <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.primary, boxShadow: `0 0 10px ${T.primary}` }}
              />
            ))}
          </div>
        );
      case "sync":
        return (
          <div style={{ position: "relative", width: "48px", height: "48px" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: 0, border: `2.5px solid transparent`, borderTop: `2.5px solid ${T.primary}`, borderRight: `2.5px solid ${T.primary}`, borderRadius: "50%" }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: "8px", border: `2.5px solid transparent`, borderBottom: `2.5px solid ${T.secondary}`, borderLeft: `2.5px solid ${T.secondary}`, borderRadius: "50%" }}
            />
            <div style={{ position: "absolute", inset: "18px", borderRadius: "50%", background: T.primary, boxShadow: `0 0 10px ${T.primary}` }} />
          </div>
        );
      case "send":
        return (
          <div style={{ position: "relative", width: "60px", height: "40px", overflow: "hidden" }}>
            <motion.div
              animate={{ x: [-30, 70], opacity: [0, 1, 1, 0], y: [10, 0, -10] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "absolute", top: "50%", transform: "translateY(-50%)" }}
            >
              <Send size={22} color={T.primary} style={{ filter: `drop-shadow(0 0 6px ${T.primary})` }} />
            </motion.div>
            <motion.div
              animate={{ scaleX: [0, 1, 0], opacity: [0, 0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "absolute", top: "50%", left: 0, width: "50px", height: "1px", background: `linear-gradient(90deg,transparent,${T.primary})`, transformOrigin: "left" }}
            />
          </div>
        );
      case "load":
        return (
          <div style={{ width: "100%", maxWidth: "120px" }}>
            <div style={{ height: "6px", borderRadius: "3px", background: T.border, overflow: "hidden", marginBottom: "6px" }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ ease: "linear" }}
                style={{ height: "100%", borderRadius: "3px", background: `linear-gradient(90deg,${T.primary},${T.accent})`, boxShadow: `0 0 10px ${T.primary}80` }}
              />
            </div>
            <span className="font-mono" style={{ fontSize: "11px", color: T.primary }}>
              {pct}%
            </span>
          </div>
        );
      case "bootup":
        return (
          <div style={{ width: "100%", maxWidth: "180px", fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", color: T.success, lineHeight: 1.8 }}>
            <AnimatePresence>
              {bootLines.map((line, i) => (
                <motion.div
                  key={line + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ color: i === bootLines.length - 1 && line.includes("READY") ? T.success : T.primary }}
                >
                  {i === bootLines.length - 1 && line.includes("READY") ? "" : "> "}
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        );
      case "process":
        return (
          <div style={{ position: "relative", width: "50px", height: "50px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.15, 1, 0.15] }}
                transition={{ duration: 1, delay: i * 0.125, repeat: Infinity, ease: "linear" }}
                style={{
                  position: "absolute",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: T.accent,
                  left: `${50 + 36 * Math.cos((i * Math.PI) / 4) - 3}%`,
                  top: `${50 + 36 * Math.sin((i * Math.PI) / 4) - 3}%`,
                }}
              />
            ))}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ position: "absolute", inset: "14px", border: `1.5px solid ${T.accent}40`, borderTop: `1.5px solid ${T.accent}`, borderRadius: "50%" }}
            />
          </div>
        );
      case "download":
        return (
          <div style={{ position: "relative", width: "40px", height: "50px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ color: T.secondary }}
            >
              <Download size={22} />
            </motion.div>
            <div style={{ width: "100%", height: "4px", borderRadius: "2px", background: T.border, overflow: "hidden" }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ ease: "linear" }} style={{ height: "100%", background: T.secondary, borderRadius: "2px" }} />
            </div>
          </div>
        );
      case "connect":
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <motion.div
              animate={{ scale: connectPulse ? [1, 1.4, 1] : 1, opacity: connectPulse ? [1, 0.5, 1] : 1 }}
              transition={{ duration: 0.8 }}
              style={{ width: "10px", height: "10px", borderRadius: "50%", background: T.success, boxShadow: `0 0 12px ${T.success}` }}
            />
            <div style={{ display: "flex", gap: "3px" }}>
              {[4, 8, 12, 8, 4].map((hh, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [hh, hh * 1.8, hh] }}
                  transition={{ duration: 1, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: "3px", height: hh, borderRadius: "2px", background: `${T.success}${connectPulse ? "ff" : "66"}` }}
                />
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <motion.div
      whileHover={{ borderColor: `${T.primary}40` }}
      transition={{ duration: 0.2 }}
      style={{
        background: T.bg2,
        borderRadius: "16px",
        border: `1px solid ${T.border}`,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        minHeight: "130px",
        justifyContent: "center",
      }}
    >
      <Vis />
      <span
        style={{
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: T.muted,
          fontFamily: "'Space Grotesk',sans-serif",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
};
