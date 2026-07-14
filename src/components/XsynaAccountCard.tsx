import { ShieldCheck, Fingerprint } from "lucide-react";

export type XsynaAccountCardData = {
  slid: string;
  name: string;
  hl: number;
  regid?: string | null;
  kind?: string | null;
  kwn?: string | null;
  kwn_active?: boolean | null;
  department?: string | null;
  position?: string | null;
  roles?: string[];
};

/**
 * xSyna Account Card — identity card for the xSyna Collective.
 * Displays the user's account info in a branded neon-cyan card.
 * No placeholder data — only shows fields that have real values.
 */
export function XsynaAccountCard({ data, compact = false }: { data: XsynaAccountCardData; compact?: boolean }) {
  const hasDepartment = !!(data.department && data.department.trim());
  const hasPosition = !!(data.position && data.position.trim());
  const showDepartment = hasDepartment || hasPosition;
  const showKwn = !!(data.kwn && data.kwn.trim());

  // Role display
  const roleLabel = data.roles?.includes("superuser") ? "Superuser"
    : data.roles?.includes("admin") ? "Administrator"
    : data.kind ? data.kind.charAt(0).toUpperCase() + data.kind.slice(1)
    : "Mitglied";

  const roleColor = data.roles?.includes("superuser") ? "#ff007a"
    : data.roles?.includes("admin") ? "#00e5ff"
    : "#7cf5a3";

  return (
    <div className="xsyna-card relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1628] via-[#061018] to-[#020407] p-4 sm:p-5 shadow-[0_20px_60px_-20px_rgba(0,229,255,0.35)] transition-all duration-500 hover:shadow-[0_25px_70px_-18px_rgba(0,229,255,0.5)]">
      {/* Animated background glow */}
      <div aria-hidden className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.4) 0%, transparent 70%)" }} />
      <div aria-hidden className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: "radial-gradient(circle, rgba(124,245,163,0.3) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(124,245,163,0.15))", border: "1px solid rgba(0,229,255,0.25)" }}>
            <Fingerprint className="h-5 w-5" style={{ color: "var(--synapse)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-white truncate">xSyna Account</div>
            <div className="text-[10px] mono text-white/50 uppercase tracking-wider">{roleLabel}</div>
          </div>
        </div>
        <div className="text-right min-w-0">
          <div className="text-[10px] mono text-white/60 tracking-widest uppercase">HL {String(data.hl).padStart(2, "0")}</div>
          <div className="text-[11px] mono truncate" style={{ color: "var(--synapse)" }}>{data.name}</div>
        </div>
      </div>

      {!compact && showDepartment && (
        <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto] gap-3 items-start">
          <div className="min-w-0">
            <div className="text-[10px] mono text-white/70 uppercase tracking-wider">Abteilung &amp; Position</div>
            <div className="mt-0.5 text-lg sm:text-xl font-semibold leading-tight break-words" style={{ color: "var(--synapse)" }}>
              {hasDepartment && <span>{data.department}</span>}
              {hasDepartment && hasPosition && <br />}
              {hasPosition && <span className="text-sm opacity-80">{data.position}</span>}
            </div>
          </div>
          {/* Decorative avatar placeholder */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl flex items-center justify-center text-2xl font-bold" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(255,0,122,0.1))", border: "1px solid rgba(0,229,255,0.2)" }}>
            {data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}

      {!compact && !showDepartment && (
        <div className="relative z-10 mt-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(255,0,122,0.1))", border: "1px solid rgba(0,229,255,0.2)" }}>
            {data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold">{data.name}</div>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1" style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}40` }}>
              <ShieldCheck className="w-3 h-3" />{roleLabel}
            </span>
          </div>
        </div>
      )}

      <div className="relative z-10 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-[11px] mono">
        <Field label="Account-ID" value={data.slid} />
        <Field label="HL" value={String(data.hl)} />
        {data.regid && <Field label="RegID" value={data.regid} />}
        {showKwn && <Field label="KWN" value={`${data.kwn}${data.kwn_active ? " \u2022 aktiv" : ""}`} />}
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-1.5 text-[10px] text-white/50">
        <ShieldCheck className="h-3 w-3" /> verifiziert durch xSyna Central
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-white/60 uppercase tracking-wider text-[10px]">{label}</div>
      <div className="truncate" style={{ color: "var(--synapse)" }}>{value}</div>
    </div>
  );
}
