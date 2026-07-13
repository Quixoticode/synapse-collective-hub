import { useState } from "react";
import { motion } from "framer-motion";
import { T } from "./tokens";

export const Section = ({
  children,
  id,
  alt,
}: {
  children: React.ReactNode;
  id?: string;
  alt?: boolean;
}) => (
  <section
    id={id}
    style={{
      position: "relative",
      zIndex: 1,
      background: alt ? "rgba(255,255,255,0.018)" : "transparent",
      borderTop: alt ? `1px solid ${T.border}` : "none",
      borderBottom: alt ? `1px solid ${T.border}` : "none",
    }}
  >
    <div className="nl-section">{children}</div>
  </section>
);

export const SectionLabel = ({ n, title, sub }: { n: string; title: string; sub: string }) => (
  <div style={{ marginBottom: "48px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
      <span className="font-mono" style={{ fontSize: "11px", color: T.primary, letterSpacing: "0.15em" }}>
        {n}
      </span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg,${T.primary}40,transparent)` }} />
    </div>
    <h2
      className="font-display"
      style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 700, marginBottom: "10px", lineHeight: 1.15 }}
    >
      {title}
    </h2>
    <p style={{ color: T.muted, fontSize: "16px", maxWidth: "520px" }}>{sub}</p>
  </div>
);

export const IconCell = ({
  icon: Icon,
  name,
  color,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  name: string;
  color: string;
}) => {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      animate={{ borderColor: hov ? color + "66" : T.border, background: hov ? `${color}0d` : T.bg2 }}
      style={{
        borderRadius: "13px",
        border: `1px solid ${T.border}`,
        padding: "16px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "9px",
        cursor: "default",
        background: T.bg2,
        boxShadow: hov ? `0 0 16px ${color}28` : "none",
        transition: "box-shadow .2s",
      }}
    >
      <motion.div
        animate={{ color: hov ? color : T.muted, scale: hov ? 1.18 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
      >
        <Icon size={26} strokeWidth={1.5} />
      </motion.div>
      <span
        style={{
          fontSize: "9px",
          letterSpacing: "0.06em",
          color: T.muted,
          fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {name}
      </span>
    </motion.div>
  );
};
