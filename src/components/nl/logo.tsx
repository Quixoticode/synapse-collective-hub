import { T } from "./tokens";

export const XSynaLogo = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size, display: "block" }}>
    <defs>
      <linearGradient id="xlg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={T.primary} />
        <stop offset="100%" stopColor={T.secondary} />
      </linearGradient>
    </defs>
    <path
      d="M18,18 Q50,50 82,82 M18,82 Q50,50 82,18"
      stroke="url(#xlg)"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="50" cy="50" r="9" fill={T.bg} stroke="url(#xlg)" strokeWidth="4.5" />
  </svg>
);
