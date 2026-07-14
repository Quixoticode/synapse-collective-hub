import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, ArrowRight, ArrowLeft, ScanLine, Smartphone, Fingerprint, KeyRound, Wrench, AlertTriangle, Check, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { T, LiquidButton, LiquidInput, Spin, TabBar, XSynaLogo, BgBlobs } from "@/components/nl";
import { PageLoader, InlineLoader } from "@/components/NeuLoader";
import { getSession, type SynSession } from "@/lib/syn-session";
import { synVerifyByPik } from "@/lib/syn.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Stage = "passkey" | "synid" | "verify" | "quick" | "support";

export default function AuthPage() {
  const [stage, setStage] = useState<Stage>("passkey");
  const [pik, setPik] = useState("");
  const [slid, setSlid] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [session, setSession] = useState<SynSession | null>(null);

  const verifyFn = useServerFn(synVerifyByPik);

  useEffect(() => {
    const s = getSession();
    if (s) setSession(s);
  }, []);

  const handleVerify = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await verifyFn({ data: { pik, device: "web" } }) as any;
      if (result?.slid) {
        setSuccess("Authentifiziert! Weiterleitung…");
        setTimeout(() => window.location.href = "/", 800);
      } else {
        setError("Ungültige Anmeldedaten.");
      }
    } catch (e: any) {
      setError(e.message || "Fehler bei der Anmeldung.");
    }
    setLoading(false);
  }, [pik, verifyFn]);

  const tabs: Stage[] = ["passkey", "synid", "verify", "quick", "support"];
  const tabLabels = ["Passkey", "SynID", "Verify", "Quick", "Support"];
  const tabIcons = [Fingerprint, Shield, KeyRound, ScanLine, Wrench];

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 relative" style={{ background: T.bg }}>
      <BgBlobs className="opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="w-full max-w-md relative"
      >
        {/* Gradient top */}
        <div className="h-1 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }} />

        <div className="p-6 sm:p-8 rounded-b-3xl border border-t-0" style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <XSynaLogo size={56} />
          </div>

          <h1 className="text-center text-xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.text }}>
            xSyna Central
          </h1>
          <p className="text-center text-xs mb-6" style={{ color: T.muted }}>
            {session ? `Angemeldet als ${session.slid}` : "Wähle eine Anmeldemethode"}
          </p>

          {/* Error / Success */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: `${T.error}15`, color: T.error, border: `1px solid ${T.error}30` }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: `${T.success}15`, color: T.success, border: `1px solid ${T.success}30` }}>
                <Check className="h-4 w-4 flex-shrink-0" /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Bar */}
          <div className="mb-6">
            <TabBar tabs={tabLabels} active={tabs.indexOf(stage)} onChange={(i) => setStage(tabs[i])} />
          </div>

          {/* Stage Content */}
          <AnimatePresence mode="wait">
            {stage === "passkey" && (
              <motion.div key="passkey" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <Fingerprint className="h-12 w-12 mx-auto mb-4" style={{ color: T.primary }} />
                <h3 className="font-semibold mb-2" style={{ color: T.text }}>Passkey-Anmeldung</h3>
                <p className="text-xs mb-6" style={{ color: T.muted }}>
                  Nutze deinen Passkey (FIDO2/WebAuthn) für eine sichere, passwortlose Anmeldung.
                </p>
                <LiquidButton variant="primary" fullWidth onClick={() => setStage("verify")}>
                  <Fingerprint className="h-4 w-4 mr-2" /> Mit Passkey anmelden
                </LiquidButton>
              </motion.div>
            )}

            {stage === "synid" && (
              <motion.div key="synid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-4">
                  <Shield className="h-10 w-10 mx-auto mb-2" style={{ color: T.accent }} />
                  <h3 className="font-semibold" style={{ color: T.text }}>SynID-Anmeldung</h3>
                </div>
                <LiquidInput label="SynID (SLID)" value={slid} onChange={setSlid} placeholder="z.B. XSN-12345" />
                <div className="mt-4">
                  <LiquidButton variant="primary" fullWidth onClick={() => { if (slid) setStage("verify"); }}>
                    Weiter <ArrowRight className="h-4 w-4 ml-2" />
                  </LiquidButton>
                </div>
              </motion.div>
            )}

            {stage === "verify" && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-4">
                  <KeyRound className="h-10 w-10 mx-auto mb-2" style={{ color: T.secondary }} />
                  <h3 className="font-semibold" style={{ color: T.text }}>Verifizierung</h3>
                </div>
                <div className="relative">
                  <LiquidInput
                    label={slid ? `PIK für ${slid}` : "Persönlicher Identifikations-Key (PIK)"}
                    value={pik}
                    onChange={setPik}
                    placeholder="Dein PIK"
                    type={showPin ? "text" : "password"}
                  />
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-[34px] p-1"
                    style={{ color: T.muted }}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  <LiquidButton variant="primary" fullWidth onClick={handleVerify} disabled={loading || !pik}>
                    {loading ? <InlineLoader type="sync" size="sm" /> : <><Shield className="h-4 w-4 mr-2" /> Anmelden</>}
                  </LiquidButton>
                  <LiquidButton variant="ghost" fullWidth onClick={() => setStage("synid")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                  </LiquidButton>
                </div>
              </motion.div>
            )}

            {stage === "quick" && (
              <motion.div key="quick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <ScanLine className="h-12 w-12 mx-auto mb-4" style={{ color: T.secondary }} />
                <h3 className="font-semibold mb-2" style={{ color: T.text }}>Quick-Login</h3>
                <p className="text-xs mb-6" style={{ color: T.muted }}>
                  Generiere einen temporären Code für schnelles Anmelden auf anderen Geräten.
                </p>
                <LiquidButton variant="secondary" fullWidth onClick={() => setStage("verify")}>
                  <ScanLine className="h-4 w-4 mr-2" /> Code generieren
                </LiquidButton>
              </motion.div>
            )}

            {stage === "support" && (
              <motion.div key="support" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                <Wrench className="h-12 w-12 mx-auto mb-4" style={{ color: T.muted }} />
                <h3 className="font-semibold mb-2" style={{ color: T.text }}>Support</h3>
                <p className="text-xs mb-6" style={{ color: T.muted }}>
                  Probleme bei der Anmeldung? Kontaktiere den xSyna Support.
                </p>
                <LiquidButton variant="ghost" fullWidth onClick={() => window.location.href = "mailto:support@xsyna.de"}>
                  <Wrench className="h-4 w-4 mr-2" /> Support kontaktieren
                </LiquidButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] mt-4" style={{ color: T.muted }}>
          xSyna Central &middot; Secure by Design
        </p>
      </motion.div>
    </div>
  );
}
