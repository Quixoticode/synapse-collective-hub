import { useEffect, useRef, useState } from "react";

/**
 * "xSyna erwacht" — Neuronales Netz, das langsam erwacht.
 * Punkte erscheinen, Verbindungen entstehen sanft, Areale (Cluster) pulsieren
 * nacheinander synchron in wachsender Anzahl bis das gesamte Netz gemeinsam pulsiert.
 */
export function StartupAnimation({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLogo, setShowLogo] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = "100%"; canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    // Nodes
    const NODES = 42;
    const CLUSTERS = 5;
    type Node = { x: number; y: number; r: number; cluster: number; born: number };
    const cx = w / 2, cy = h / 2;
    const nodes: Node[] = Array.from({ length: NODES }, (_, i) => {
      const cluster = i % CLUSTERS;
      const a = (cluster / CLUSTERS) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 60 + Math.random() * Math.min(w, h) * 0.28;
      return {
        x: cx + Math.cos(a) * dist * (0.4 + Math.random() * 0.9),
        y: cy + Math.sin(a) * dist * (0.4 + Math.random() * 0.9),
        r: 1.8 + Math.random() * 1.4,
        cluster,
        born: 200 + Math.random() * 600,
      };
    });
    // Precompute edges (nearest few per node)
    const edges: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = nodes.map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
        .filter((x) => x.j !== i).sort((a, b) => a.d - b.d).slice(0, 3);
      for (const { j } of dists) if (i < j) edges.push([i, j]);
    }

    const start = performance.now();
    const DURATION = reduce ? 900 : 2400;

    function frame(t: number) {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / DURATION);
      ctx!.clearRect(0, 0, w, h);
      // background vignette
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      g.addColorStop(0, "rgba(0,163,255,0.10)");
      g.addColorStop(1, "rgba(5,5,13,0)");
      ctx!.fillStyle = g; ctx!.fillRect(0, 0, w, h);

      // Clusters wake up progressively: at p=0.2 → cluster 0, ... at p=0.9 → all
      const wakeThreshold = Math.floor(p * (CLUSTERS + 1));
      const pulse = 0.5 + 0.5 * Math.sin(elapsed / 260);

      // edges
      ctx!.lineWidth = 1;
      for (const [a, b] of edges) {
        const na = nodes[a], nb = nodes[b];
        const born = Math.max(na.born, nb.born);
        const bornProgress = Math.max(0, Math.min(1, (elapsed - born) / 600));
        if (bornProgress <= 0) continue;
        const bothWake = na.cluster < wakeThreshold && nb.cluster < wakeThreshold;
        const alpha = 0.10 + 0.20 * bornProgress + (bothWake ? 0.25 * pulse : 0);
        ctx!.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
        ctx!.beginPath(); ctx!.moveTo(na.x, na.y); ctx!.lineTo(nb.x, nb.y); ctx!.stroke();
      }

      // nodes
      for (const n of nodes) {
        const bornProgress = Math.max(0, Math.min(1, (elapsed - n.born) / 600));
        if (bornProgress <= 0) continue;
        const wake = n.cluster < wakeThreshold;
        const glow = n.r * (2 + (wake ? 3 * pulse : 1.2));
        const rg = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, glow);
        rg.addColorStop(0, wake ? "rgba(0,255,209,0.95)" : "rgba(0,180,255,0.7)");
        rg.addColorStop(1, "rgba(0,163,255,0)");
        ctx!.fillStyle = rg;
        ctx!.beginPath(); ctx!.arc(n.x, n.y, glow, 0, Math.PI * 2); ctx!.fill();
      }

      if (p >= 0.75 && !showLogo) setShowLogo(true);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setTimeout(onDone, 350);
      }
    }
    requestAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#05050D]" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className={`relative text-center transition-all duration-700 ${showLogo ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <div className="text-[10px] mono text-cyan-300/70 tracking-[0.5em] uppercase">xSyna</div>
        <div className="mt-1 text-3xl font-bold syn-gradient-text">erwacht</div>
      </div>
    </div>
  );
}
