import { createFileRoute } from "@tanstack/react-router";
import { Terminal, Bug } from "lucide-react";
import { DebugConsole } from "@/components/DebugConsole";

export const Route = createFileRoute("/_authenticated/debug")({
  ssr: false,
  component: DebugPage,
});

function DebugPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
          <Bug className="h-5 w-5" style={{ color: "var(--neural-magenta)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Debug &amp; Diagnostics</h1>
          <p className="text-xs text-muted-foreground">Console logs, network requests, session data</p>
        </div>
      </div>
      <DebugConsole />
    </div>
  );
}
