import { ShieldAlert, LogOut } from "lucide-react";

export function BanScreen({ message, expiresAt, onLogout }: { message: string; expiresAt?: string | null; onLogout: () => void }) {
  const until = expiresAt ? new Date(expiresAt) : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-6">
      <div className="syn-card syn-gradient-border max-w-md w-full p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl grid place-items-center" style={{ background: "rgba(255,60,108,0.15)", border: "1px solid rgba(255,60,108,0.4)" }}>
          <ShieldAlert className="h-7 w-7" style={{ color: "#FF3C6C" }} />
        </div>
        <h1 className="text-xl font-bold mb-2">Zugriff temporär gesperrt</h1>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{message}</p>
        {until && (
          <p className="text-[11px] mono text-muted-foreground mb-4">
            Sperre endet: {until.toLocaleString()}
          </p>
        )}
        <button onClick={onLogout} className="syn-btn w-full">
          <LogOut className="h-4 w-4" /> Trennen
        </button>
      </div>
    </div>
  );
}
