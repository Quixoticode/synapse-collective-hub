import { Link } from "@tanstack/react-router";
import { Sparkles, LogIn, LayoutDashboard, BookOpen, Newspaper, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Header for public-facing routes (landing, /docs). Renders a discreet
 * "Login" button on the right, and if the user is already authenticated,
 * offers a "Zum System" shortcut into /home.
 */
export function PublicHeader() {
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    const check = () => {
      try { setHasSession(!!localStorage.getItem("syn.session.v1")); } catch { /* ignore */ }
    };
    check();
    window.addEventListener("syn-session-change", check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("syn-session-change", check);
      window.removeEventListener("storage", check);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/60 border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl syn-gradient-border grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "var(--synapse)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-wide truncate">xSyna Central</div>
            <div className="text-[10px] mono text-muted-foreground hidden sm:block">Kollektiv · Docs · News</div>
          </div>
        </Link>

        <nav className="ml-6 hidden md:flex items-center gap-1 text-sm">
          <Link to="/" activeOptions={{ exact: true }} className="px-3 py-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <Newspaper className="inline h-3.5 w-3.5 mr-1" /> News
          </Link>
          <Link to="/docs" className="px-3 py-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <BookOpen className="inline h-3.5 w-3.5 mr-1" /> Docs
          </Link>
          <Link to="/apply" className="px-3 py-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <Briefcase className="inline h-3.5 w-3.5 mr-1" /> Stellen
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {hasSession ? (
            <Link to="/home" className="syn-btn text-xs"><LayoutDashboard className="h-3.5 w-3.5" /> Zum System</Link>
          ) : (
            <Link to="/auth" className="syn-btn-ghost text-xs"><LogIn className="h-3.5 w-3.5" /> Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
