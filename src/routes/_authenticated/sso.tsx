import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Github, Link2, Unlink, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { T, LiquidButton, TabBar, Spin, XSynaLogo, BgBlobs } from "@/components/nl";
import { getSession, getCredentials } from "@/lib/syn-session";
import {
  ssoGetProviders,
  ssoInitGitHub,
  ssoListConnectedAccounts,
  ssoDisconnectAccount,
} from "@/lib/sso.functions";
import { SSOProviderButton } from "@/components/SSOProviderButton";
import type { SSOProvider, ConnectedAccount } from "@/lib/sso.functions";

export const Route = createFileRoute("/_authenticated/sso")({
  ssr: false,
  component: SSOPage,
});

function SSOPage() {
  const session = getSession();
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getProvidersFn = useServerFn(ssoGetProviders);
  const listAccountsFn = useServerFn(ssoListConnectedAccounts);
  const initGitHubFn = useServerFn(ssoInitGitHub);
  const disconnectFn = useServerFn(ssoDisconnectAccount);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [provs, accs] = await Promise.all([
        getProvidersFn(),
        listAccountsFn({ data: { slid: session?.slid || "", pik: session?.pik || "" } }),
      ]);
      setProviders(provs as SSOProvider[]);
      setAccounts(accs as ConnectedAccount[]);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden der SSO-Daten.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(provider: SSOProvider) {
    setConnecting(provider.id);
    setError(null);
    try {
      if (provider.id === "github") {
        const state = generateState();
        const redirectUri = `${window.location.origin}/sso/callback`;
        const result = await initGitHubFn({ data: { redirectUri, state } }) as { authUrl: string };
        // Store state in sessionStorage for verification on callback
        sessionStorage.setItem("sso_state", state);
        sessionStorage.setItem("sso_provider", "github");
        window.location.href = result.authUrl;
      }
    } catch (e: any) {
      setError(e.message || "Fehler beim Starten der OAuth-Flow.");
      setConnecting(null);
    }
  }

  async function handleDisconnect(provider: SSOProvider) {
    setConnecting(provider.id);
    setError(null);
    try {
      const account = accounts.find(
        (a) => a.provider === provider.id
      );
      if (!account) return;

      await disconnectFn({
        data: {
          slid: session?.slid || "",
          pik: session?.pik || "",
          provider: provider.id,
          providerAccountId: account.provider_account_id,
        },
      });

      setSuccess(`${provider.name}-Verbindung getrennt.`);
      setAccounts((prev) =>
        prev.filter((a) => a.provider !== provider.id)
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || "Fehler beim Trennen des Kontos.");
    } finally {
      setConnecting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BgBlobs className="opacity-30" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="h-6 w-6" style={{ color: T.primary }} />
          <T h2>SSO-Verbindungen</T>
        </div>
        <T body style={{ color: T.muted }}>
          Verbinde deinen xSyna-Account mit externen Diensten für ein nahtloses Login-Erlebnis.
        </T>
      </motion.div>

      {/* Error / Success */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 rounded-2xl border"
            style={{ background: `${T.error}15`, borderColor: `${T.error}30`, color: T.error }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 rounded-2xl border"
            style={{ background: `${T.success}15`, borderColor: `${T.success}30`, color: T.success }}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {providers.map((provider, i) => {
          const account = accounts.find(
            (a) => a.provider === provider.id
          );
          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <SSOProviderButton
                provider={provider}
                account={account}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                loading={connecting === provider.id}
                size="lg"
              />
            </motion.div>
          );
        })}

        {/* Placeholder for future providers */}
        {[
          { id: "google", name: "Google", icon: "google", enabled: false, brandColor: "#4285F4" },
          { id: "microsoft", name: "Microsoft", icon: "microsoft", enabled: false, brandColor: "#2F2F2F" },
        ].map((provider, i) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="relative"
          >
            <div
              className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm opacity-50"
            >
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${provider.brandColor}10` }}
                >
                  <div className="h-6 w-6 rounded" style={{ background: provider.brandColor }} />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-sm" style={{ color: T.text }}>
                    {provider.name}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                    Demnächst verfügbar
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", color: T.muted }}
                >
                  Coming Soon
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-5 rounded-2xl border"
        style={{ background: "rgba(0,229,255,0.04)", borderColor: "rgba(0,229,255,0.15)" }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: T.primary }} />
          <div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: T.text }}>
              Sicherheitshinweis
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
              Deine xSyna-Anmeldedaten werden niemals an Dritte weitergegeben. 
              Bei der Verbindung mit externen Diensten wird nur ein sicheres 
              Authentifizierungstoken gespeichert. Du kannst die Verbindung 
              jederzeit hier trennen.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function generateState(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
