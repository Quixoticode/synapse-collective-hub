// Neuromorphic Liquid design tokens.
// Faithful port of the `T` palette from the source design system.
export const NL = {
  bg: "#020407",
  bg2: "#07101a",
  surface: "#0c1624",
  border: "rgba(255,255,255,0.07)",
  primary: "#00E5FF",
  secondary: "#FFB300",
  accent: "#7B4FFF",
  success: "#00FF88",
  error: "#FF4060",
  text: "#E8F4FF",
  muted: "#4A6080",
} as const;

// Alias kept for readability inside components that mirror the source's `T`.
export const T = NL;

export const NL_FONTS = {
  display: "'Space Grotesk',sans-serif",
  body: "'DM Sans',sans-serif",
  mono: "'JetBrains Mono',monospace",
} as const;
