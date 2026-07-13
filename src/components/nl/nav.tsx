import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Home,
  LayoutDashboard,
  Brain,
  BarChart2,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";
import { T } from "./tokens";

export interface TabBarProps {
  tabs?: string[];
  defaultActive?: number;
  onChange?: (index: number) => void;
}

export const TabBar = ({
  tabs = ["Overview", "Analytics", "Agents", "Settings"],
  defaultActive = 0,
  onChange,
}: TabBarProps) => {
  const [active, setActive] = useState(defaultActive);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useEffect(() => {
    // Measurement runs client-side only.
    const el = refs.current[active];
    if (el) {
      const r = el.getBoundingClientRect();
      const pr = el.parentElement!.getBoundingClientRect();
      setIndicator({ left: r.left - pr.left, width: r.width });
    }
  }, [active, tabs]);
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        gap: "0",
        background: T.bg2,
        borderRadius: "14px",
        border: `1px solid ${T.border}`,
        padding: "4px",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ left: indicator.left + 4, width: indicator.width - 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "absolute",
          top: "4px",
          bottom: "4px",
          borderRadius: "10px",
          background: `${T.primary}18`,
          border: `1px solid ${T.primary}40`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {tabs.map((t, i) => (
        <button
          key={t}
          ref={(el) => {
            refs.current[i] = el;
          }}
          onClick={() => {
            setActive(i);
            onChange?.(i);
          }}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "9px 18px",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderRadius: "10px",
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 600,
            fontSize: "13px",
            color: active === i ? T.primary : T.muted,
            whiteSpace: "nowrap",
            transition: "color .2s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
};

export interface SideNavItem {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}

export interface SideNavProps {
  items?: SideNavItem[];
  defaultActive?: number;
  defaultCollapsed?: boolean;
  onChange?: (index: number) => void;
}

export const SideNav = ({
  items = [
    { icon: Home, label: "Home" },
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: Brain, label: "Agents" },
    { icon: BarChart2, label: "Analytics" },
    { icon: Users, label: "Team" },
    { icon: Settings, label: "Settings" },
    { icon: HelpCircle, label: "Support" },
  ],
  defaultActive = 0,
  defaultCollapsed = false,
  onChange,
}: SideNavProps) => {
  const [active, setActive] = useState(defaultActive);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <motion.div
      animate={{ width: collapsed ? 60 : 200 }}
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
      style={{
        background: T.bg2,
        borderRadius: "16px",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "12px 8px",
        gap: "4px",
        minHeight: "300px",
      }}
    >
      <div style={{ display: "flex", justifyContent: collapsed ? "center" : "flex-end", marginBottom: "8px", padding: "0 4px" }}>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", padding: "4px", borderRadius: "8px" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      {items.map(({ icon: Icon, label }, i) => (
        <motion.button
          key={label}
          onClick={() => {
            setActive(i);
            onChange?.(i);
          }}
          animate={{ background: active === i ? `${T.primary}12` : "transparent", borderColor: active === i ? `${T.primary}40` : T.border }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            borderRadius: "10px",
            border: `1px solid transparent`,
            background: "transparent",
            cursor: "pointer",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <motion.div animate={{ color: active === i ? T.primary : T.muted }} style={{ flexShrink: 0, display: "flex" }}>
            <Icon size={18} strokeWidth={1.6} />
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: "13px",
                  fontFamily: "'Space Grotesk',sans-serif",
                  fontWeight: 600,
                  color: active === i ? T.text : T.muted,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {active === i && !collapsed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: T.primary, boxShadow: `0 0 8px ${T.primary}`, flexShrink: 0 }}
            />
          )}
        </motion.button>
      ))}
    </motion.div>
  );
};

export interface DropdownProps {
  options?: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export const Dropdown = ({
  options = ["Dark Cortex", "Midnight Bio", "Bioluminescent", "Neural Void"],
  value,
  defaultValue,
  onChange,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue ?? options[0]);
  const selected = value ?? internal;
  const select = (opt: string) => {
    setInternal(opt);
    onChange?.(opt);
    setOpen(false);
  };
  return (
    <div style={{ position: "relative", width: "220px" }}>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ borderColor: `${T.primary}44` }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: "12px",
          cursor: "pointer",
          color: T.text,
          fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        <span>{selected}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
          <ChevronDown size={16} color={T.muted} />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              transformOrigin: "top",
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: "12px",
              overflow: "hidden",
              zIndex: 20,
              boxShadow: `0 16px 40px rgba(0,0,0,.6)`,
            }}
          >
            {options.map((opt, i) => (
              <motion.button
                key={opt}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => select(opt)}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  background: selected === opt ? `${T.primary}10` : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: selected === opt ? T.primary : T.text,
                  fontFamily: "'Space Grotesk',sans-serif",
                  fontWeight: selected === opt ? 600 : 400,
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {opt}
                {selected === opt && <Check size={14} color={T.primary} />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface AccordionItemProps {
  title: string;
  sub: string;
  children: React.ReactNode;
  color?: string;
}

export const AccordionItem = ({ title, sub, children, color = T.primary }: AccordionItemProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: "12px",
        border: `1px solid ${open ? color + "44" : T.border}`,
        overflow: "hidden",
        background: open ? `${color}05` : T.bg2,
        transition: "border-color .3s,background .3s",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: "14px", color: open ? color : T.text }}>{title}</div>
          <div style={{ fontSize: "12px", color: T.muted, marginTop: "2px" }}>{sub}</div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
          <ChevronDown size={16} color={open ? color : T.muted} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 18px 18px" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Alias to satisfy the "Accordion/AccordionItem" deliverable naming.
export const Accordion = AccordionItem;
