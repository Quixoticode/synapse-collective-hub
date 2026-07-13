import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, Briefcase } from "lucide-react";

// Placeholder for the Applyance module (recruiting / open-position
// management). The full admin experience is built as part of the
// admin & governance module task; this keeps the nav entry resolvable
// in the meantime.
export const Route = createFileRoute("/_authenticated/applyance")({
  ssr: false,
  component: ApplyancePage,
});

function ApplyancePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-28 md:pb-8">
      <h1 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1">
        <UserPlus className="h-5 w-5" /> Applyance
      </h1>
      <p className="text-sm text-muted-foreground mb-5">
        Verwaltung von Stellen &amp; Bewerbungen. Diese Ansicht wird im Zuge des Admin- &amp; Governance-Moduls ausgebaut.
      </p>
      <div className="syn-card p-6 text-center space-y-3">
        <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Öffentliche Stellenausschreibungen und Bewerbungen werden aktuell über die öffentliche Bewerbungsseite verwaltet.
        </p>
        <Link to="/apply" className="syn-btn-ghost inline-flex items-center gap-1 text-xs">
          Zur öffentlichen Bewerbungsseite
        </Link>
      </div>
    </div>
  );
}
