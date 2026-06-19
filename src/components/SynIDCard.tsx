import { ShieldCheck } from "lucide-react";

export type SynIDCardData = {
  slid: string;
  name: string;
  hl: number;
  regid?: string | null;
  kind?: string | null;
  kwn?: string | null;
  kwn_active?: boolean | null;
};

/**
 * xSynID Card visual — neon-cyan info card inspired by the official SynID layout.
 * Used on /auth (own profile preview & verify result) and on /apps (header).
 */
export function SynIDCard({ data, compact = false }: { data: SynIDCardData; compact?: boolean }) {
  const department = data.kind ? data.kind.charAt(0).toUpperCase() + data.kind.slice(1) : "Mitglied";
  const issued = "01/01";
  const validUntil = "31/12";

  return (
    <div className="syn-id-card relative overflow-hidden rounded-3xl border border-white/10 bg-black/80 p-4 sm:p-5 shadow-[0_30px_80px_-30px_rgba(0,200,255,0.45)]">
      <div aria-hidden className="syn-id-card__glow" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg syn-id-card__sigil" />
          <div className="min-w-0">
            <div className="text-base font-semibold text-white truncate">SynID</div>
            <div className="text-[10px] mono text-white/50 uppercase tracking-wider">xSyna Kollektiv</div>
          </div>
        </div>
        <div className="text-right min-w-0">
          <div className="text-[10px] mono text-white tracking-widest">[WN] NAME</div>
          <div className="text-[11px] mono text-cyan-300 truncate">[{String(data.hl).padStart(2, "0")}] {data.name}</div>
        </div>
      </div>

      {!compact && (
        <div className="relative z-10 mt-4 grid grid-cols-[1fr_auto] gap-3 items-start">
          <div className="min-w-0">
            <div className="text-[10px] mono text-white/70 uppercase tracking-wider">Abteilung &amp; Position</div>
            <div className="mt-0.5 text-xl sm:text-2xl font-semibold text-cyan-300 leading-tight break-words">
              xSyna {department}
              <br />
              {data.kwn || "Mitglied"}
            </div>
          </div>
          <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-md syn-id-card__photo" />
        </div>
      )}

      <div className="relative z-10 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[11px] mono">
        <Field label="SLID" value={data.slid} />
        <Field label="HL" value={String(data.hl)} />
        <Field label="REGID" value={data.regid || "—"} />
        <Field label="GÜLTIG" value={validUntil} />
        <Field label="AUSGESTELLT" value={issued} />
        {data.kwn ? <Field label="KWN" value={`${data.kwn}${data.kwn_active ? " ●" : ""}`} /> : null}
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
      <div className="text-cyan-300 truncate">{value}</div>
    </div>
  );
}
