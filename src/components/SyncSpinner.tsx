import { Loader2 } from "lucide-react";

/**
 * Small pulse spinner used while a change is being synchronised with the server.
 * Two variants: inline (small chip) and overlay (fixed corner badge).
 */
export function SyncSpinner({ label = "Synchronisiere…", inline = false }: { label?: string; inline?: boolean }) {
  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] mono text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--synapse)" }} />
        {label}
      </span>
    );
  }
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[60] syn-card px-3 py-2 flex items-center gap-2 text-xs mono animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--synapse)" }} />
      <span>{label}</span>
    </div>
  );
}
