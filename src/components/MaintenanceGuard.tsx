import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Clock, RefreshCw } from "lucide-react";
import { T, LiquidButton } from "@/components/nl";
import { AnimatedGear } from "./NeuLoader";
import { useServerFn } from "@tanstack/react-start";
import { maintenanceCheck } from "@/lib/maintenance.functions";

interface MaintenanceInfo {
  inMaintenance: boolean;
  message: string;
  estimatedEnd?: string;
}

export function MaintenanceGuard({
  module,
  children,
  fallback,
}: {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [info, setInfo] = useState<MaintenanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const checkFn = useServerFn(maintenanceCheck);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const result = await checkFn({ data: { module } }) as MaintenanceInfo;
        if (!cancelled) setInfo(result);
      } catch {
        if (!cancelled) setInfo({ inMaintenance: false, message: "" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    const id = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [module, checkFn]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw size={24} style={{ color: T.muted }} />
        </motion.div>
      </div>
    );
  }

  if (!info?.inMaintenance) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return <MaintenanceOverlay message={info.message} module={module} />;
}

function MaintenanceOverlay({ message, module }: { message: string; module: string }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9997,
          background: `${T.bg}f0`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
          style={{
            maxWidth: 480,
            width: "100%",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            padding: 40,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              top: -50,
              left: "50%",
              transform: "translateX(-50%)",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${T.secondary}30 0%, transparent 70%)`,
              filter: "blur(40px)",
            }}
          />

          {/* Animated gears */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24, position: "relative" }}>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <AnimatedGear size={48} color={T.secondary} />
            </motion.div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ marginTop: 16 }}
            >
              <AnimatedGear size={36} color={T.muted} />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
              <AnimatedGear size={28} color={T.secondary} />
            </motion.div>
          </div>

          {/* Wrench icon with rocking animation */}
          <motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ marginBottom: 16 }}
          >
            <Wrench size={40} style={{ color: T.secondary }} />
          </motion.div>

          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: T.text,
              marginBottom: 8,
            }}
          >
            Wartungsmodus
          </h2>

          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: T.muted,
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            {message || `Das Modul "${module}" befindet sich derzeit im Wartungsmodus.`}
          </p>

          {/* Progress bar */}
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: T.bg2,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: "50%",
                height: "100%",
                background: `linear-gradient(90deg, transparent, ${T.secondary}, transparent)`,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 12,
              color: T.muted,
              fontFamily: "'JetBrains Mono',monospace",
              marginBottom: 24,
            }}
          >
            <Clock size={14} />
            <span>Wird bearbeitet{dots}</span>
          </div>

          <LiquidButton variant="primary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            Seite neu laden
          </LiquidButton>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useMaintenanceCheck(module: string) {
  const [info, setInfo] = useState<MaintenanceInfo>({ inMaintenance: false, message: "" });
  const checkFn = useServerFn(maintenanceCheck);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const result = await checkFn({ data: { module } }) as MaintenanceInfo;
        if (!cancelled) setInfo(result);
      } catch { /* ignore */ }
    }
    check();
    const id = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [module, checkFn]);

  return info;
}
