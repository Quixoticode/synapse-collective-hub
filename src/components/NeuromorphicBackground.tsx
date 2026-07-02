import { useEffect, useRef, useState } from "react";

type Prefs = { bg: "neuromorphic" | "static" | "off"; intensity: number; accent: "synapse" | "mint" | "magenta" | "violet" };
const KEY = "xsyna.design.v1";

const ACCENTS: Record<Prefs["accent"], [string, string, string]> = {
  synapse:  ["#00A3FF", "#7B61FF", "#00FFD1"],
  mint:     ["#00FFD1", "#00A3FF", "#7B61FF"],
  magenta:  ["#FF3CAC", "#7B61FF", "#00A3FF"],
  violet:   ["#7B61FF", "#00A3FF", "#FF3CAC"],
};

export function readDesignPrefs(): Prefs {
  if (typeof window === "undefined") return { bg: "neuromorphic", intensity: 60, accent: "synapse" };
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return { bg: "neuromorphic", intensity: 60, accent: "synapse" };
}
export function writeDesignPrefs(p: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("xsyna-design-change"));
}

export function NeuromorphicBackground() {
  const [prefs, setPrefs] = useState<Prefs>({ bg: "neuromorphic", intensity: 60, accent: "synapse" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setPrefs(readDesignPrefs());
    const sync = () => setPrefs(readDesignPrefs());
    window.addEventListener("xsyna-design-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("xsyna-design-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (prefs.bg !== "neuromorphic") {
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
    const count = Math.max(14, Math.floor((prefs.intensity / 100) * 40));
    type Node = { x: number; y: number; vx: number; vy: number; r: number; c: string };
    const nodes: Node[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4 * dpr,
      vy: (Math.random() - 0.5) * 0.4 * dpr,
      r: (2 + Math.random() * 3) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    const linkDist = 180 * dpr;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // subtle radial glow layer
      const grad = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.25, 0, canvas.width * 0.7, canvas.height * 0.25, canvas.width * 0.7);
      grad.addColorStop(0, colors[0] + "22");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }
      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.28;
            ctx.strokeStyle = a.c;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      // nodes
      for (const n of nodes) {
        const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        rg.addColorStop(0, n.c);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefs]);

  if (prefs.bg === "off") return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {prefs.bg === "neuromorphic" ? (
        <canvas ref={canvasRef} className="h-full w-full opacity-60" />
      ) : (
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 25%, rgba(0,163,255,0.14), transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,60,172,0.10), transparent 60%)" }} />
      )}
    </div>
  );
}
