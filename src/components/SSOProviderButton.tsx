import { motion } from "framer-motion";
import { Github, Unlink, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { LiquidButton } from "@/components/nl";

export interface SSOProvider {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  brandColor: string;
  scopes: string[];
}

export interface SSOAccount {
  provider: string;
  providerAccountId: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface SSOProviderButtonProps {
  provider: SSOProvider;
  account?: SSOAccount;
  onConnect: (provider: SSOProvider) => void;
  onDisconnect: (provider: SSOProvider) => void;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
};

export function SSOProviderButton({
  provider,
  account,
  onConnect,
  onDisconnect,
  loading,
  size = "md",
}: SSOProviderButtonProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const Icon = ICON_MAP[provider.icon] || Github;

  const sizeClasses = {
    sm: "p-3 rounded-xl",
    md: "p-5 rounded-2xl",
    lg: "p-6 rounded-3xl",
  };

  if (account) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative border border-white/10 bg-white/[0.04] backdrop-blur-sm ${sizeClasses[size]}`}
        style={{ borderColor: `${provider.brandColor}30` }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: `${provider.brandColor}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: provider.brandColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: "#F0F2F5" }}>
                {provider.name}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                <Check className="h-3 w-3" /> Verbunden
              </span>
            </div>
            {account.username && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "#5F6775" }}>
                @{account.username}
              </p>
            )}
          </div>
          {!confirmDisconnect ? (
            <LiquidButton
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDisconnect(true)}
            >
              <Unlink className="h-4 w-4" />
            </LiquidButton>
          ) : (
            <div className="flex items-center gap-1">
              <LiquidButton
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDisconnect(false)}
              >
                Abbrechen
              </LiquidButton>
              <LiquidButton
                variant="primary"
                size="sm"
                onClick={() => onDisconnect(provider)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Trennen"}
              </LiquidButton>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, borderColor: `${provider.brandColor}50` }}
      className={`relative border border-white/10 bg-white/[0.04] backdrop-blur-sm ${sizeClasses[size]} cursor-pointer`}
      onClick={() => onConnect(provider)}
    >
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center"
          style={{ background: `${provider.brandColor}15` }}
        >
          <Icon className="h-6 w-6" style={{ color: provider.brandColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm" style={{ color: "#F0F2F5" }}>
            {provider.name}
          </span>
          <p className="text-xs mt-0.5" style={{ color: "#5F6775" }}>
            Klicke, um deinen Account zu verbinden
          </p>
        </div>
        <LiquidButton variant="primary" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verbinden"}
        </LiquidButton>
      </div>
    </motion.div>
  );
}

interface SSOProviderChipProps {
  provider: SSOProvider;
  account?: SSOAccount;
  onClick?: () => void;
}

export function SSOProviderChip({ provider, account, onClick }: SSOProviderChipProps) {
  const Icon = ICON_MAP[provider.icon] || Github;
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs"
      style={{
        borderColor: account ? `${provider.brandColor}40` : "rgba(255,255,255,0.1)",
        background: account ? `${provider.brandColor}15` : "rgba(255,255,255,0.04)",
        color: account ? provider.brandColor : "#5F6775",
      }}
    >
      <Icon className="h-3 w-3" />
      {account ? `@${account.username}` : provider.name}
      {account && <Check className="h-3 w-3" />}
    </motion.button>
  );
}
