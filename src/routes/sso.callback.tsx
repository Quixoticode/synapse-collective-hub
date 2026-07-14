import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { T, LiquidButton, Spin, XSynaLogo, BgBlobs } from "@/components/nl";
import { useServerFn } from "@tanstack/react-start";
import { ssoHandleGitHubCallback } from "@/lib/sso.functions";

export const Route = createFileRoute("/sso/callback")({
  ssr: false,
  component: CallbackPage,
});

type CallbackState = "processing" | "success" | "error" | "register";

function CallbackPage() {
  const [status, setStatus] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [slid, setSlid] = useState<string | null>(null);
  const [githubProfile, setGithubProfile] = useState<{
    login: string;
    email: string | null;
    avatar_url: string | null;
    name: string | null;
  } | null>(null);

  const handleCallbackFn = useServerFn(ssoHandleGitHubCallback);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (errorParam) {
      setStatus("error");
      setError(errorDescription || errorParam);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setError("Ungültige Callback-Parameter.");
      return;
    }

    // Verify state matches what we stored
    const storedState = sessionStorage.getItem("sso_state");
    if (storedState && storedState !== state) {
      setStatus("error");
      setError("State-Parameter stimmt nicht überein. Möglicher Sicherheitsangriff.");
      return;
    }

    processCallback(code, state);
  }, []);

  async function processCallback(code: string, state: string) {
    try {
      const result = await handleCallbackFn({ data: { code, state } }) as {
        success: boolean;
        token?: string;
        slid?: string;
        error?: string;
        requiresRegistration?: boolean;
        githubProfile?: {
          login: string;
          email: string | null;
          avatar_url: string | null;
          name: string | null;
        };
      };

      if (result.success && result.token && result.slid) {
        // Store session
        localStorage.setItem("syn.session.v1", result.token);
        setSlid(result.slid);
        setStatus("success");
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else if (result.requiresRegistration && result.githubProfile) {
        setGithubProfile(result.githubProfile);
        setStatus("register");
      } else {
        setStatus("error");
        setError(result.error || "Authentifizierung fehlgeschlagen.");
      }
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: T.bg }}>
      <BgBlobs className="opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm relative"
      >
        <div
          className="h-1 rounded-t-3xl"
          style={{
            background:
              status === "success"
                ? T.success
                : status === "error"
                ? T.error
                : `linear-gradient(90deg, ${T.primary}, ${T.accent})`,
          }}
        />

        <div
          className="p-8 rounded-b-3xl border border-t-0 text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex justify-center mb-6">
            <XSynaLogo size={48} />
          </div>

          {status === "processing" && (
            <>
              <Spin size={40} className="mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2" style={{ color: T.text }}>
                Anmeldung läuft…
              </h2>
              <p className="text-sm" style={{ color: T.muted }}>
                Bitte warte einen Moment, während wir deine Anmeldung verarbeiten.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: T.success }} />
              </motion.div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: T.text }}>
                Anmeldung erfolgreich!
              </h2>
              <p className="text-sm mb-4" style={{ color: T.muted }}>
                Du wirst gleich weitergeleitet…
              </p>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "linear" }}
                  className="h-full rounded-full"
                  style={{ background: T.success }}
                />
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <XCircle className="h-16 w-16 mx-auto mb-4" style={{ color: T.error }} />
              </motion.div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: T.text }}>
                Anmeldung fehlgeschlagen
              </h2>
              <p className="text-sm mb-6" style={{ color: T.muted }}>
                {error || "Ein unerwarteter Fehler ist aufgetreten."}
              </p>
              <div className="flex gap-3">
                <LiquidButton
                  variant="ghost"
                  onClick={() => window.location.href = "/auth"}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </LiquidButton>
                <LiquidButton
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </LiquidButton>
              </div>
            </>
          )}

          {status === "register" && githubProfile && (
            <>
              <div className="mb-4">
                {githubProfile.avatar_url ? (
                  <img
                    src={githubProfile.avatar_url}
                    alt={githubProfile.login}
                    className="h-20 w-20 rounded-full mx-auto border-2"
                    style={{ borderColor: T.primary }}
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-full mx-auto border-2 flex items-center justify-center"
                    style={{ borderColor: T.primary, background: `${T.primary}20` }}
                  >
                    <span className="text-2xl font-bold" style={{ color: T.primary }}>
                      {githubProfile.login[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: T.text }}>
                Willkommen, @{githubProfile.login}!
              </h2>
              <p className="text-sm mb-6" style={{ color: T.muted }}>
                Du hast noch keinen xSyna-Account. Bitte melde dich an oder erstelle einen neuen Account.
              </p>
              <div className="flex gap-3">
                <LiquidButton
                  variant="ghost"
                  onClick={() => window.location.href = "/auth"}
                >
                  Anmelden
                </LiquidButton>
                <LiquidButton
                  variant="primary"
                  onClick={() => window.location.href = "/auth?signup=1"}
                >
                  Account erstellen
                </LiquidButton>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
