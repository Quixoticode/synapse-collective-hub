import { useEffect, useState } from "react";

/**
 * "xSyna erwacht" — Startup splash shown once per session.
 * A single point expands into synapses, then the logo reveals, then everything fades in.
 */
export function StartupAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1700);
    const t4 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#05050D]" aria-hidden>
      <div className="relative h-72 w-72">
        {/* expanding rings */}
        <div className={`syn-startup-ring ${phase >= 1 ? "syn-startup-ring--on" : ""}`} style={{ animationDelay: "0ms" }} />
        <div className={`syn-startup-ring ${phase >= 1 ? "syn-startup-ring--on" : ""}`} style={{ animationDelay: "180ms" }} />
        <div className={`syn-startup-ring ${phase >= 1 ? "syn-startup-ring--on" : ""}`} style={{ animationDelay: "360ms" }} />
        {/* nucleus */}
        <div className={`syn-startup-nucleus ${phase >= 0 ? "on" : ""}`} />
        {/* synapses */}
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i}
            className={`syn-startup-synapse ${phase >= 2 ? "on" : ""}`}
            style={{ transform: `translate(-50%, -50%) rotate(${i * 45}deg)`, animationDelay: `${i * 60}ms` }} />
        ))}
        {/* logo */}
        <div className={`syn-startup-logo ${phase >= 3 ? "on" : ""}`}>
          <div className="text-xs mono text-cyan-300/70 tracking-[0.5em] uppercase">xSyna</div>
          <div className="mt-1 text-3xl font-bold syn-gradient-text">erwacht</div>
        </div>
      </div>
    </div>
  );
}
