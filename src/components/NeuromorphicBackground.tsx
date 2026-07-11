import { useEffect, useRef, useState } from "react";

export type DesignPrefs = {
  bg: "neuromorphic" | "calm" | "static" | "off";
  intensity: number;
  accent: "synapse" | "mint" | "magenta" | "violet";
  scale: "compact" | "normal" | "large";
  density: "airy" | "normal" | "dense";
  animation: "off" | "subtle" | "full";
};
const KEY = "xsyna.design.v1";
const DEFAULTS: DesignPrefs = {
  bg: "calm", intensity: 45, accent: "synapse",
  scale: "normal", density: "normal", animation: "subtle",
};

const ACCENTS: Record<DesignPrefs["accent"], [string, string, string]> = {
  synapse:  ["#00A3FF", "#7B61FF", "#00FFD1"],
  mint:     ["#00FFD1", "#00A3FF", "#7B61FF"],
  magenta:  ["#FF3CAC", "#7B61FF", "#00A3FF"],
  violet:   ["#7B61FF", "#00A3FF", "#FF3CAC"],
};

export function readDesignPrefs(): DesignPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return DEFAULTS;
}
export function writeDesignPrefs(p: DesignPrefs) {
  const merged: DesignPrefs = { ...DEFAULTS, ...p };
  localStorage.setItem(KEY, JSON.stringify(merged));
  applyDesignVars(merged);
  window.dispatchEvent(new Event("xsyna-design-change"));
}

export function applyDesignVars(p: DesignPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const scale = p.scale === "compact" ? "0.92" : p.scale === "large" ? "1.08" : "1";
  const density = p.density === "airy" ? "1.2" : p.density === "dense" ? "0.8" : "1";
  root.style.setProperty("--syn-scale", scale);
  root.style.setProperty("--syn-density", density);
  root.style.setProperty("--syn-anim", p.animation === "off" ? "0" : p.animation === "full" ? "1" : "0.5");
  root.dataset.synScale = p.scale;
  root.dataset.synDensity = p.density;
  root.dataset.synAnim = p.animation;
}

export function NeuromorphicBackground() {
  const [prefs, setPrefs] = useState<DesignPrefs>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const p = readDesignPrefs(); setPrefs(p); applyDesignVars(p);
    const sync = () => { const q = readDesignPrefs(); setPrefs(q); applyDesignVars(q); };
    window.addEventListener("xsyna-design-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("xsyna-design-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (prefs.bg === "off" || prefs.bg === "static" || prefs.animation === "off") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%"; canvas.style.height = "100%";
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ACCENTS[prefs.accent];
    const isCalm = prefs.bg === "calm";
    const speedMul = isCalm ? 0.35 : 1;
    const count = isCalm
      ? Math.max(8, Math.floor((prefs.intensity / 100) * 18))
      : Math.max(14, Math.floor((prefs.intensity / 100) * 40));
    const linkDist = (isCalm ? 240 : 180) * dpr;

    type Node = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    const nodes: Node[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4 * dpr * speedMul,
      vy: (Math.random() - 0.5) * 0.4 * dpr * speedMul,
      r: (isCalm ? 2 : 2 + Math.random() * 3) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * (isCalm ? 0.14 : 0.28);
            ctx.strokeStyle = a.c;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      for (const n of nodes) {
        const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * (isCalm ? 3 : 4));
        rg.addColorStop(0, n.c);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (isCalm ? 3 : 4), 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefs]);

  if (!mounted || prefs.bg === "off") return null;
  const opacity = prefs.bg === "calm" ? 0.35 : 0.6;
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {prefs.bg === "static" ? (
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 25%, rgba(0,163,255,0.10), transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,60,172,0.08), transparent 60%)" }} />
      ) : (
        <canvas ref={canvasRef} className="h-full w-full" style={{ opacity }} />
      )}
    </div>
  );
}
