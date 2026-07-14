import { ShieldOff } from "lucide-react";
import { T } from "@/components/nl";

export function BanScreen({ message, expiresAt, onLogout }: { message: string; expiresAt?: string; onLogout: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: T.bg, color: T.text }}>
      <div className="syn-card max-w-sm w-full mx-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${T.error}15`, border: `1px solid ${T.error}30` }}>
          <ShieldOff size={28} style={{ color: T.error }} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Account gesperrt</h2>
        <p className="text-xs mb-4" style={{ color: T.muted }}>{message || "Ihr Account wurde vorübergehend gesperrt."}</p>
        {expiresAt && (
          <p className="text-xs mb-4" style={{ color: T.secondary }}>Bis: {new Date(expiresAt).toLocaleString("de-DE")}</p>
        )}
        <button className="syn-btn w-full" style={{ background: T.error }} onClick={onLogout}>Abmelden</button>
      </div>
    </div>
  );
}
