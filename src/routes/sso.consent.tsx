import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Check, X, Globe, Mail, User } from "lucide-react";
import { T, LiquidButton, Spin, XSynaLogo, BgBlobs } from "@/components/nl";
import { useServerFn } from "@tanstack/react-start";
import { ssoGetConsentPage, ssoApproveConsent } from "@/lib/sso.functions";

export const Route = createFileRoute("/sso/consent")({
  ssr: false,
  component: ConsentPage,
});

function ConsentPage() {
  const search = useSearch({ from: "/sso/consent" }) as {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    scope?: string;
  };

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<{
    clientName: string;
    clientLogo: string | null;
    scopes: string[];
    error: string | null;
  } | null>(null);

  const getConsentFn = useServerFn(ssoGetConsentPage);
  const approveFn = useServerFn(ssoApproveConsent);

  useEffect(() => {
    if (!search.client_id || !search.redirect_uri || !search.state) {
      setError("Ungültige Anfrage. Erforderliche Parameter fehlen.");
      setLoading(false);
      return;
    }

    loadConsentData();
  }, []);

  async function loadConsentData() {
    try {
      const result = await getConsentFn({
        data: {
          clientId: search.client_id!,
          redirectUri: search.redirect_uri!,
          state: search.state!,
        },
      }) as {
        clientName: string;
        clientLogo: string | null;
        scopes: string[];
        error: string | null;
      };
      setClientData(result);
      if (result.error) setError(result.error);
    } catch (e: any) {
      setError("Fehler beim Laden der Zustimmungsdaten.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const result = await approveFn({
        data: {
          state: search.state!,
          approved: true,
          scopes: search.scope?.split(" ") || ["profile", "email"],
          redirectUri: search.redirect_uri!,
          clientId: search.client_id!,
        },
      }) as { redirectUrl?: string; error?: string };

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError(result.error || "Fehler bei der Genehmigung.");
        setApproving(false);
      }
    } catch (e: any) {
      setError(e.message || "Fehler bei der Genehmigung.");
      setApproving(false);
    }
  }

  async function handleDeny() {
    setApproving(true);
    try {
      const result = await approveFn({
        data: {
          state: search.state!,
          approved: false,
          redirectUri: search.redirect_uri!,
          clientId: search.client_id!,
        },
      }) as { redirectUrl?: string };

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch {
      // Redirect to fallback
      const fallback = new URL(search.redirect_uri!);
      fallback.searchParams.set("error", "access_denied");
      fallback.searchParams.set("state", search.state!);
      window.location.href = fallback.toString();
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: T.bg }}>
        <Spin size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: T.bg }}>
      <BgBlobs className="opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md relative"
      >
        {/* Gradient accent top */}
        <div
          className="h-1 rounded-t-3xl"
          style={{
            background: `linear-gradient(90deg, ${T.primary}, ${T.accent})`,
          }}
        />

        <div
          className="p-8 rounded-b-3xl border border-t-0"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <XSynaLogo size={48} />
          </div>

          <h1
            className="text-center text-xl font-bold mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }}
          >
            Anmeldung bei xSyna
          </h1>

          <p
            className="text-center text-sm mb-6"
            style={{ color: T.muted }}
          >
            Möchtest du dich mit xSyna bei{" "}
            <strong style={{ color: T.primary }}>
              {clientData?.clientName || "einer Anwendung"}
            </strong>{" "}
            anmelden?
          </p>

          {error && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{ background: `${T.error}15`, color: T.error }}
            >
              {error}
            </div>
          )}

          {/* Scope List */}
          <div className="space-y-2 mb-6">
            <p className="text-xs font-medium mb-2" style={{ color: T.muted }}>
              Folgende Informationen werden geteilt:
            </p>
            {(clientData?.scopes || ["profile", "email"]).map((scope) => (
              <div
                key={scope}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${T.success}15` }}
                >
                  <Check className="h-4 w-4" style={{ color: T.success }} />
                </div>
                <div>
                  <span className="text-sm font-medium" style={{ color: T.text }}>
                    {scope === "profile" && "Profil"}
                    {scope === "email" && "E-Mail-Adresse"}
                    {scope === "openid" && "OpenID"}
                    {!["profile", "email", "openid"].includes(scope) && scope}
                  </span>
                  <p className="text-xs" style={{ color: T.muted }}>
                    {scope === "profile" && "Dein Name und Avatar"}
                    {scope === "email" && "Deine primäre E-Mail-Adresse"}
                    {scope === "openid" && "Authentifizierungs-ID"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* User info */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-6"
            style={{ background: "rgba(0,229,255,0.05)", border: `1px solid ${T.primary}20` }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: `${T.primary}20` }}
            >
              <User className="h-5 w-5" style={{ color: T.primary }} />
            </div>
            <div>
              <span className="text-sm font-medium" style={{ color: T.text }}>
                Angemeldet als xSyna-Benutzer
              </span>
              <p className="text-xs" style={{ color: T.muted }}>
                Deine Anmeldedaten werden sicher übertragen.
              </p>
            </div>
          </div>

          {/* Security note */}
          <p
            className="text-xs text-center mb-6"
            style={{ color: T.muted }}
          >
            <ShieldCheck className="h-3 w-3 inline mr-1" />
            xSyna gibt dein Passwort niemals an Dritte weiter.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <LiquidButton
              variant="ghost"
              fullWidth
              onClick={handleDeny}
              disabled={approving}
            >
              <X className="h-4 w-4 mr-2" />
              Ablehnen
            </LiquidButton>
            <LiquidButton
              variant="primary"
              fullWidth
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <Spin size={16} />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Genehmigen
                </>
              )}
            </LiquidButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
