import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mail")({
  ssr: false,
  component: MailDisabledPage,
});

function MailDisabledPage() {
  return (
    <div className="p-6 max-w-lg mx-auto pb-28 md:pb-8">
      <div className="syn-card p-6 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-white/5">
          <Mail className="h-6 w-6 opacity-60" />
        </div>
        <h1 className="text-xl font-semibold">SynMail deaktiviert</h1>
        <p className="text-sm text-muted-foreground">
          Das SynMail-Modul wurde mit dem Juli-Update offiziell abgeschaltet.
          E-Mail-Zustellung erfolgt jetzt ausschließlich über die Standard-Kollektiv-Kanäle.
        </p>
        <Link to="/apps" className="syn-btn inline-flex"><ArrowLeft className="h-4 w-4" /> Zurück zu den Apps</Link>
      </div>
    </div>
  );
}
