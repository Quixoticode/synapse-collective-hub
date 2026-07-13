import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { T } from "./tokens";

export interface LiquidInputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  iconRight?: React.ReactNode;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

export const LiquidInput = ({
  label,
  type = "text",
  value,
  onChange,
  icon: Icon,
  iconRight,
  placeholder,
  error,
  autoComplete,
}: LiquidInputProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: focused ? T.primary : T.muted,
            marginBottom: "7px",
            fontFamily: "'Space Grotesk',sans-serif",
            transition: "color .3s",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {Icon && (
          <div
            style={{
              position: "absolute",
              left: "13px",
              top: "50%",
              transform: "translateY(-50%)",
              color: focused ? T.primary : T.muted,
              transition: "color .3s",
              pointerEvents: "none",
              zIndex: 1,
              display: "flex",
            }}
          >
            <Icon size={16} strokeWidth={1.6} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            background: T.bg2,
            border: `1.5px solid ${focused ? T.primary + "66" : error ? T.error + "50" : T.border}`,
            borderRadius: "12px",
            color: T.text,
            fontSize: "14px",
            fontFamily: "'DM Sans',sans-serif",
            padding: Icon ? "13px 42px 13px 42px" : "13px 14px",
            paddingRight: iconRight ? "42px" : undefined,
            outline: "none",
            WebkitAppearance: "none",
            transition: "border-color .25s,box-shadow .25s",
            boxShadow: focused
              ? `0 0 0 3px ${T.primary}14`
              : error
                ? `0 0 0 3px ${T.error}12`
                : "none",
          }}
        />
        {iconRight && (
          <div
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
              display: "flex",
            }}
          >
            {iconRight}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            pointerEvents: "none",
            borderRadius: "0 0 12px 12px",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
            initial={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg,${T.primary},${T.accent})`,
              transformOrigin: "left",
              filter: `drop-shadow(0 0 5px ${T.primary})`,
            }}
          />
        </div>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: T.error, fontSize: "11px", marginTop: "4px" }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export const LiquidToggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: checked ? `${T.primary}25` : T.bg2,
        border: `1px solid ${checked ? T.primary + "55" : T.border}`,
        transition: "all .3s",
        boxShadow: checked ? `0 0 14px ${T.primary}28` : "none",
      }}
    >
      <motion.div
        animate={{ x: checked ? 21 : 2 }}
        transition={{ type: "spring", stiffness: 600, damping: 32 }}
        style={{
          position: "absolute",
          top: "3px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: checked ? T.primary : T.muted,
          boxShadow: checked ? `0 0 8px ${T.primary}` : "none",
        }}
      />
    </div>
    {label && <span style={{ color: T.muted, fontSize: "13px" }}>{label}</span>}
  </button>
);

export const LiquidCheckbox = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 0,
      textAlign: "left",
    }}
  >
    <div
      style={{
        flexShrink: 0,
        width: "19px",
        height: "19px",
        borderRadius: "6px",
        marginTop: "1px",
        border: `1.5px solid ${checked ? T.primary : T.muted + "55"}`,
        background: checked ? `${T.primary}18` : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all .25s",
        boxShadow: checked ? `0 0 12px ${T.primary}28` : "none",
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: checked ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 22 }}
      >
        <Check size={10} color={T.primary} strokeWidth={3} />
      </motion.div>
    </div>
    {children && <span style={{ color: T.muted, fontSize: "13px", lineHeight: 1.55 }}>{children}</span>}
  </button>
);

export const LiquidSlider = ({
  value,
  onChange,
  color = T.primary,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  color?: string;
  label?: string;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const calc = (cx: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((cx - r.left) / r.width) * 100)));
  };
  const onPD = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(calc(e.clientX));
  };
  const onPM = (e: React.PointerEvent) => {
    if (dragging.current) onChange(calc(e.clientX));
  };
  const onPU = () => {
    dragging.current = false;
  };
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", color: T.muted }}>{label}</span>
          <span className="font-mono" style={{ fontSize: "12px", color }}>
            {value}%
          </span>
        </div>
      )}
      <div
        ref={trackRef}
        onPointerDown={onPD}
        onPointerMove={onPM}
        onPointerUp={onPU}
        style={{
          position: "relative",
          height: "6px",
          borderRadius: "3px",
          background: T.border,
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            borderRadius: "3px",
            background: `linear-gradient(90deg,${color},${color}99)`,
            boxShadow: `0 0 10px ${color}60`,
          }}
        />
        <motion.div
          animate={{ left: `${value}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          style={{
            position: "absolute",
            top: "50%",
            transform: "translate(-50%,-50%)",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 0 4px ${color}30,0 0 14px ${color}80`,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.bg }} />
        </motion.div>
      </div>
    </div>
  );
};

export const OTPInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const LEN = 6;
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ display: "flex", gap: "8px", justifyContent: "center" }}
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from({ length: LEN }).map((_, i) => {
          const digit = value[i] ?? "";
          const isActive = value.length === i;
          return (
            <motion.div
              key={i}
              animate={{ scale: isActive ? 1.07 : 1 }}
              style={{
                width: "46px",
                height: "54px",
                borderRadius: "11px",
                border: `1.5px solid ${digit ? T.primary + "99" : isActive ? T.primary + "44" : T.border}`,
                background: digit ? `${T.primary}0d` : T.bg2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 700,
                color: T.text,
                cursor: "text",
                position: "relative",
                overflow: "hidden",
                boxShadow: digit ? `0 0 18px ${T.primary}1a` : "none",
                transition: "border-color .2s,background .2s",
              }}
            >
              {digit ? (
                <motion.span key={i + digit} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ position: "absolute" }}>
                  {digit}
                </motion.span>
              ) : isActive ? (
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.85 }}
                  style={{ width: "2px", height: "20px", background: T.primary, borderRadius: "2px" }}
                />
              ) : null}
            </motion.div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={LEN}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LEN))}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, top: 0, left: 0 }}
      />
    </div>
  );
};

export const StrengthBar = ({ password }: { password: string }) => {
  const s =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 10
          ? 2
          : /[^a-zA-Z0-9]/.test(password)
            ? 4
            : 3;
  const cols = ["", T.error, T.secondary, T.secondary, T.success];
  const labs = ["", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ scaleX: s >= i ? 1 : 0, backgroundColor: cols[s] }}
            initial={{ scaleX: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ flex: 1, height: "3px", borderRadius: "2px", transformOrigin: "left", background: T.border }}
          />
        ))}
      </div>
      <p style={{ fontSize: "11px", color: cols[s] }}>{labs[s]}</p>
    </div>
  );
};
