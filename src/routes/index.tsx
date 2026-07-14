import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Brain, Shield, Zap, Users, Clock, FileText, ChevronRight, Lock, ArrowRight
} from "lucide-react";
import { T, LiquidButton, XSynaLogo, BgBlobs } from "@/components/nl";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: LandingPage,
});

const features = [
  { icon: Brain, title: "Neural Engine", desc: "KI-gestützte Prozessoptimierung für maximale Effizienz in deinem Workflow.", color: T.accent },
  { icon: Shield, title: "Enterprise Security", desc: "End-to-end Verschlüsselung, Passkey-Support und rollenbasierte Zugriffskontrolle.", color: T.primary },
  { icon: Zap, title: "Real-time Sync", desc: "Sofortige Synchronisation über alle Geräte mit WebSocket-Technologie.", color: T.secondary },
  { icon: Users, title: "Team Collaboration", desc: "Integrierte Teamverwaltung mit Berechtigungsmatrix und Audit-Logging.", color: T.success },
  { icon: Clock, title: "Smart WorkTime", desc: "Automatische Zeiterfassung mit intelligenten Berichten und Überstunden-Tracking.", color: T.primary },
  { icon: FileText, title: "Document Hub", desc: "Zentrale Dokumentenverwaltung mit Versionskontrolle und Freigabesystem.", color: T.accent },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "<50ms", label: "Latency" },
  { value: "256-bit", label: "Encryption" },
  { value: "24/7", label: "Monitoring" },
];

function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-[100dvh]" style={{ background: T.bg }}>
      <BgBlobs className="opacity-40" />

      {/* ─── Hero ─── */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
        {/* Animated Axon Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 800 600">
          {[...Array(8)].map((_, i) => (
            <motion.line
              key={i}
              x1="400" y1="300"
              x2={400 + 300 * Math.cos((i * Math.PI) / 4)}
              y2={300 + 300 * Math.sin((i * Math.PI) / 4)}
              stroke={T.primary}
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 2, delay: i * 0.15, ease: "easeOut" }}
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <motion.circle
              key={`c-${i}`}
              cx={400 + 150 * Math.cos((i * Math.PI) / 3)}
              cy={300 + 150 * Math.sin((i * Math.PI) / 3)}
              r="3"
              fill={T.accent}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
            />
          ))}
        </svg>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative z-10 mb-6"
        >
          <XSynaLogo size={80} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-bold mb-4"
          style={{ fontFamily: "'Space Grotesk', sans-serif", background: `linear-gradient(135deg, ${T.text}, ${T.primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          xSyna Central
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="relative z-10 text-sm sm:text-base max-w-lg mb-8"
          style={{ color: T.muted, lineHeight: 1.7 }}
        >
          Die zentrale Kommandoplattform für dein digitales Ökosystem.
          Sicher. Schnell. Intelligent.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 flex flex-col sm:flex-row gap-3"
        >
          <Link to="/auth">
            <LiquidButton variant="primary" size="lg">
              Anmelden <ArrowRight className="h-4 w-4 ml-2" />
            </LiquidButton>
          </Link>
          <Link to="/auth">
            <LiquidButton variant="ghost" size="lg">
              Passkey erstellen
            </LiquidButton>
          </Link>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative z-10 flex gap-6 sm:gap-10 mt-16"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-lg sm:text-xl font-bold" style={{ color: T.primary, fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
              <div className="text-[10px] sm:text-xs" style={{ color: T.muted }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }}>
              Plattform-Features
            </h2>
            <p className="text-sm" style={{ color: T.muted }}>
              Alles was du brauchst — in einer intuitiven Oberfläche.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, borderColor: `${f.color}30` }}
                className="p-6 rounded-3xl border transition-colors duration-300"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                  <f.icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: T.text }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: T.muted }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center rounded-3xl border p-10 relative overflow-hidden"
          style={{ background: "rgba(0,229,255,0.03)", borderColor: `${T.primary}20` }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }}>
            Bereit für xSyna Central?
          </h2>
          <p className="text-sm mb-6" style={{ color: T.muted }}>
            Melde dich an und entdecke die volle Leistungsfähigkeit der Plattform.
          </p>
          <Link to="/auth">
            <LiquidButton variant="primary" size="lg">
              Jetzt anmelden <ArrowRight className="h-4 w-4 ml-2" />
            </LiquidButton>
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <XSynaLogo size={24} />
            <span className="text-xs font-medium" style={{ color: T.muted }}>xSyna Central</span>
          </div>
          <div className="flex gap-6">
            {["Datenschutz", "Impressum", "Support"].map((link) => (
              <span key={link} className="text-xs hover:underline cursor-pointer" style={{ color: T.muted }}>{link}</span>
            ))}
          </div>
          <span className="text-[10px]" style={{ color: T.muted }}>&copy; 2026 xSyna Collective</span>
        </div>
      </footer>
    </div>
  );
}
