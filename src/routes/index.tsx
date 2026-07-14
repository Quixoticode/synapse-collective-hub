import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Brain, Shield, Zap, Users, Clock, FileText,
  ChevronDown, Terminal, ArrowRight,
} from "lucide-react";
import { useRef } from "react";

import {
  XSynaLogo, BgBlobs, LiquidButton, T,
} from "@/components/nl";

const bg = T.bg;
const bg2 = T.bg2;
const border = T.border;
const primary = T.primary;
const secondary = T.secondary;
const accent = T.accent;
const success = T.success;
const error = T.error;
const text = T.text;
const muted = T.muted;

function AxonLines() {
  const lines = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const x2 = 50 + Math.cos(angle) * 40;
    const y2 = 50 + Math.sin(angle) * 40;
    return { x2, y2, delay: i * 0.12 };
  });

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: "scale(1.6)" }}>
      {lines.map((l, i) => (
        <motion.line key={i} x1="50" y1="50" x2={l.x2} y2={l.y2} stroke={primary} strokeWidth="0.4" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.35 }}
          transition={{ pathLength: { duration: 1.2, delay: l.delay + 0.5, ease: "easeOut" }, opacity: { duration: 0.4, delay: l.delay + 0.5 } }}
          style={{ filter: `drop-shadow(0 0 2px ${primary})` }} />
      ))}
      {lines.map((l, i) => (
        <motion.circle key={`dot-${i}`} r="1.2" fill={i % 2 === 0 ? primary : secondary}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], cx: [50, l.x2, 50], cy: [50, l.y2, 50] }}
          transition={{ duration: 3, delay: l.delay + 1.5, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

const featureList = [
  { icon: Brain, title: "Neural Core", desc: "AI-powered operations", color: primary, delay: 0 },
  { icon: Shield, title: "Passkey Security", desc: "Biometric authentication", color: success, delay: 0.08 },
  { icon: Zap, title: "Real-time Sync", desc: "Live data across devices", color: secondary, delay: 0.16 },
  { icon: Users, title: "Team Management", desc: "Roles and permissions", color: accent, delay: 0.24 },
  { icon: Clock, title: "WorkTime Tracking", desc: "Shift management", color: "#FF6B35", delay: 0.32 },
  { icon: FileText, title: "Workspace", desc: "Document management", color: "#00E5FF", delay: 0.40 },
];

function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string; desc: string; color: string; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }} whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative rounded-2xl p-6 cursor-default" style={{ background: bg2, border: `1px solid ${border}` }}>
      <motion.div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: `0 0 40px -10px ${color}30, inset 0 1px 0 0 ${color}15` }} />
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <h3 className="text-lg font-semibold mb-1.5" style={{ color: text }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: muted }}>{desc}</p>
    </motion.div>
  );
}

const stats = [
  { value: "17+", label: "Modules" },
  { value: "Passkey", label: "Auth" },
  { value: "99.9%", label: "Uptime" },
  { value: "Real-time", label: "Sync" },
];

function StatItem({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.4 + delay }}
      className="flex flex-col items-center">
      <span className="text-2xl md:text-3xl font-bold tracking-tight"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest mt-1" style={{ color: muted }}>{label}</span>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
      className="flex items-center gap-3 justify-center mb-12">
      <div className="h-px w-12" style={{ background: border }} />
      <span className="text-xs uppercase tracking-[0.25em]" style={{ color: muted }}>{children}</span>
      <div className="h-px w-12" style={{ background: border }} />
    </motion.div>
  );
}

function ScrollIndicator() {
  return (
    <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 0.6 }}
      onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: muted }}>Scroll</span>
      <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
        <ChevronDown size={16} style={{ color: muted }} />
      </motion.div>
    </motion.div>
  );
}

function ParticleField() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 1, duration: Math.random() * 8 + 6,
    delay: Math.random() * 5, opacity: Math.random() * 0.15 + 0.05,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: primary, opacity: p.opacity }}
          animate={{ y: [0, -30, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </div>
  );
}

function GradientOrbs() {
  return (
    <>
      <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${primary}10 0%, transparent 70%)`, filter: "blur(60px)" }}
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}10 0%, transparent 70%)`, filter: "blur(60px)" }}
        animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${secondary}08 0%, transparent 70%)`, filter: "blur(50px)" }}
        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
    </>
  );
}

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full overflow-x-hidden" style={{ background: bg }}>
      <BgBlobs />
      <GradientOrbs />
      <ParticleField />

      {/* Hero */}
      <motion.section className="relative min-h-screen flex flex-col items-center justify-center px-6"
        style={{ opacity: heroOpacity, scale: heroScale }}>
        <motion.div className="relative w-40 h-40 md:w-52 md:h-52 mb-8"
          initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}>
          <AxonLines />
          <div className="absolute inset-0 flex items-center justify-center">
            <XSynaLogo size={72} className="md:w-24 md:h-24" />
          </div>
        </motion.div>

        <motion.h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-center mb-3"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${accent} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          xSyna Central
        </motion.h1>

        <motion.p className="text-lg md:text-xl tracking-[0.15em] uppercase text-center mb-2" style={{ color: muted }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.85 }}>
          Neural Operations Center
        </motion.p>

        <motion.p className="text-base md:text-lg text-center mb-10" style={{ color: text }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }}>
          Intelligence that moves.
        </motion.p>

        <motion.div className="flex flex-col sm:flex-row gap-4 mb-16"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.15 }}>
          <Link to="/auth">
            <LiquidButton variant="primary" size="lg" className="min-w-[180px]">
              <span className="flex items-center gap-2">Anmelden <ArrowRight size={16} /></span>
            </LiquidButton>
          </Link>
          <LiquidButton variant="ghost" size="lg" className="min-w-[180px]"
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            Mehr erfahren
          </LiquidButton>
        </motion.div>

        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-14"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.3 }}>
          {stats.map((s, i) => <StatItem key={s.label} {...s} delay={i * 0.1} />)}
        </motion.div>

        <ScrollIndicator />
      </motion.section>

      {/* Features */}
      <section id="features" className="relative py-28 md:py-36 px-6" style={{ background: `linear-gradient(180deg, transparent 0%, ${bg2}40 100%)` }}>
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Capabilities</SectionLabel>
          <motion.h2 className="text-3xl md:text-5xl font-bold text-center mb-4" style={{ color: text }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            Everything you need to <span style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>operate</span>
          </motion.h2>
          <motion.p className="text-center mb-16 max-w-xl mx-auto" style={{ color: muted }}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
            A complete neural operations platform built for teams that demand speed, security, and intelligence.
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureList.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="relative py-28 md:py-36 px-6" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Platform</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: text }}>
                Built for <span style={{ background: `linear-gradient(135deg, ${secondary}, ${primary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>modern teams</span>
              </h2>
              <p className="mb-6 leading-relaxed" style={{ color: muted }}>
                xSyna Central unifies your operations into a single neural interface. From workforce management to secure document handling, every module is designed to work together seamlessly.
              </p>
              <ul className="space-y-3">
                {["Zero-trust passkey authentication", "End-to-end encrypted data sync", "Real-time collaboration channels", "AI-assisted decision support"].map((item, i) => (
                  <motion.li key={item} className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${success}20` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: success }} />
                    </div>
                    <span style={{ color: text }}>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }} className="relative">
              <div className="rounded-2xl p-8 relative overflow-hidden" style={{ background: bg2, border: `1px solid ${border}` }}>
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{ backgroundImage: `linear-gradient(${primary} 1px, transparent 1px), linear-gradient(90deg, ${primary} 1px, transparent 1px)`, backgroundSize: "30px 30px" }} />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full" style={{ background: error }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: secondary }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: success }} />
                    <span className="text-xs ml-2" style={{ color: muted }}>xsyna-central --dashboard</span>
                  </div>
                  {[
                    { label: "Active Sessions", value: "1,247", bar: 75, color: primary },
                    { label: "Neural Load", value: "42%", bar: 42, color: accent },
                    { label: "Sync Rate", value: "99.8%", bar: 99, color: success },
                    { label: "Threat Level", value: "Low", bar: 12, color: secondary },
                  ].map((row, i) => (
                    <motion.div key={row.label} className="space-y-2"
                      initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.1 }}>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: muted }}>{row.label}</span>
                        <span style={{ color: text }}>{row.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${row.color}15` }}>
                        <motion.div className="h-full rounded-full" style={{ background: row.color }}
                          initial={{ width: 0 }} whileInView={{ width: `${row.bar}%` }} viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.6 + i * 0.15, ease: "easeOut" }} />
                      </div>
                    </motion.div>
                  ))}
                  <div className="mt-6 pt-4 flex items-center gap-2 text-xs" style={{ borderTop: `1px solid ${border}`, color: muted, fontFamily: "JetBrains Mono, monospace" }}>
                    <Terminal size={12} style={{ color: primary }} />
                    <span>System operational</span>
                    <span style={{ color: success }}>●</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div className="rounded-3xl p-10 md:p-14 text-center relative overflow-hidden" style={{ background: bg2, border: `1px solid ${border}` }}
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none"
              style={{ background: `radial-gradient(ellipse, ${primary}08 0%, transparent 60%)`, filter: "blur(40px)" }} />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: text }}>
                Ready to <span style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>neuralize</span> your operations?
              </h2>
              <p className="mb-8 max-w-lg mx-auto" style={{ color: muted }}>
                Join the xSyna Kollektiv and experience the future of team operations. Secure, fast, and intelligently connected.
              </p>
              <Link to="/auth">
                <LiquidButton variant="primary" size="lg">
                  <span className="flex items-center gap-2">Get Started <ArrowRight size={16} /></span>
                </LiquidButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-10 px-6" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XSynaLogo size={24} />
            <span className="text-sm" style={{ color: muted, fontFamily: "JetBrains Mono, monospace" }}>xSyna Kollektiv 2026</span>
          </div>
          <div className="flex items-center gap-6">
            {["Docs", "API", "Status", "GitHub"].map((link) => (
              <motion.a key={link} href="#" className="text-xs uppercase tracking-wider" style={{ color: muted }}
                whileHover={{ color: primary }} transition={{ duration: 0.2 }}>{link}</motion.a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/")({ component: LandingPage });
