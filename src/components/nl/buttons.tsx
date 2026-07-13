import { useState } from "react";
import { motion } from "framer-motion";
import { T } from "./tokens";

export type BtnV = "primary" | "secondary" | "accent" | "ghost" | "danger" | "success";

const VBg: Record<BtnV, string> = {
  primary: T.primary,
  secondary: T.secondary,
  accent: T.accent,
  ghost: "transparent",
  danger: T.error,
  success: T.success,
};

export interface LiquidButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnV;
  fullWidth?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "xs";
}

export const LiquidButton = ({
  children,
  onClick,
  variant = "primary",
  fullWidth,
  type = "button",
  disabled,
  size = "md",
}: LiquidButtonProps) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [down, setDown] = useState(false);
  const fire = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // Client-only measurement/ripple effect.
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((p) => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setDown(true);
    setTimeout(() => setRipples((p) => p.filter((x) => x.id !== id)), 760);
    setTimeout(() => setDown(false), 140);
    onClick?.();
  };
  const bg = VBg[variant];
  const isG = variant === "ghost";
  const pad = { xs: "5px 12px", sm: "8px 16px", md: "12px 24px", lg: "16px 40px" }[size];
  const fz = { xs: "11px", sm: "12px", md: "14px", lg: "16px" }[size];
  const h = { xs: "30px", sm: "36px", md: "48px", lg: "60px" }[size];
  const textC = isG ? T.muted : variant === "primary" ? T.bg : "#fff";
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onPointerDown={fire}
      animate={{ scale: down ? 0.963 : 1 }}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "12px",
        border: isG ? `1px solid ${T.border}` : "none",
        background: isG ? "rgba(255,255,255,0.03)" : `linear-gradient(130deg,${bg}ee,${bg}99)`,
        color: textC,
        fontFamily: "'Space Grotesk',sans-serif",
        fontWeight: 600,
        fontSize: fz,
        letterSpacing: "0.02em",
        padding: pad,
        height: h,
        width: fullWidth ? "100%" : "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.36 : 1,
        boxShadow: isG ? "none" : `0 0 20px ${bg}28,0 2px 10px ${bg}18`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {ripples.map((rp) => (
        <span
          key={rp.id}
          className="liq-ripple"
          style={{ left: rp.x, top: rp.y, background: `radial-gradient(circle,${bg}55 0%,transparent 70%)` }}
        />
      ))}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {children}
      </span>
    </motion.button>
  );
};

export const Spin = ({ color = T.bg, size = 16 }: { color?: string; size?: number }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `2px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      flexShrink: 0,
    }}
  />
);
