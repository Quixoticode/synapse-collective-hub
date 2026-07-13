import { T } from "./tokens";

// Animated liquid background blobs. Uses only CSS keyframes (blobMorph) so it is
// fully SSR-safe — no window/document access.
export const BgBlobs = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    {(
      [
        { c: `${T.primary}1e`, s: 700, x: "8%", y: "10%", d: 22, dl: 0 },
        { c: `${T.accent}18`, s: 600, x: "90%", y: "60%", d: 28, dl: 6 },
        { c: `${T.secondary}12`, s: 500, x: "50%", y: "85%", d: 20, dl: 3 },
      ] as { c: string; s: number; x: string; y: string; d: number; dl: number }[]
    ).map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: b.s,
          height: b.s,
          left: b.x,
          top: b.y,
          transform: "translate(-50%,-50%)",
          background: b.c,
          filter: `blur(${Math.round(b.s * 0.19)}px)`,
          animation: `blobMorph ${b.d}s ease-in-out infinite`,
          animationDelay: `${b.dl}s`,
          mixBlendMode: "screen",
        }}
      />
    ))}
  </div>
);
