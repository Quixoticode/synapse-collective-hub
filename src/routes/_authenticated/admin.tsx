import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Users, Plus, Trash2, Save, X, ChevronDown, ChevronUp, Search, RefreshCw, UserPlus, AtSign, Building2, Star, Crown, User, Briefcase } from "lucide-react";
import { xaAdminListAccounts, xaAdminCreateAccount, xaAdminUpdateRoles, xaAdminDeleteAccount } from "@/lib/xsyna-account.functions";
import { getXsynaSession } from "@/lib/xsyna-session";
import { useSync } from "@/lib/use-sync";
import { SyncSpinner } from "@/components/SyncSpinner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminPage,
});

type Account = {
  slid: string;
  name: string;
  email: string | null;
  hl: number;
  kind: string;
  department: string | null;
  position: string | null;
  created_at: string;
  roles: string[];
  profile: { first_name?: string; last_name?: string; email?: string; passkey_migrated?: boolean } | null;
};

const ALL_ROLES = ["kunde", "partner", "mitarbeiter", "admin", "superuser"] as const;
const ROLE_ICONS: Record<string, React.ReactNode> = {
  superuser: <Crown className="w-3 h-3" />,
  admin: <Star className="w-3 h-3" />,
  mitarbeiter: <Briefcase className="w-3 h-3" />,
  partner: <User className="w-3 h-3" />,
  kunde: <AtSign className="w-3 h-3" />,
};
const ROLE_COLORS: Record<string, string> = {
  superuser: "var(--neural-magenta)",
  admin: "var(--synapse)",
  mitarbeiter: "var(--neural-mint)",
  partner: "var(--neural-violet)",
  kunde: "var(--neural-amber)",
};

function AdminPage() {
  const xa = getXsynaSession();
  const listFn = useServerFn(xaAdminListAccounts);
  const createFn = useServerFn(xaAdminCreateAccount);
  const updateRolesFn = useServerFn(xaAdminUpdateRoles);
  const deleteFn = useServerFn(xaAdminDeleteAccount);
  const { run, syncing, error } = useSync();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filtered, setFiltered] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSlid, setExpandedSlid] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<Record<string, string[]>>({});

  // Create form state
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cKind, setCKind] = useState<"kunde" | "partner" | "mitarbeiter">("kunde");
  const [cHl, setCHl] = useState(1);
  const [cDept, setCDept] = useState("");
  const [cPos, setCPos] = useState("");

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) { setFiltered(accounts); return; }
    setFiltered(accounts.filter((a) =>
      a.slid.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.email?.toLowerCase() ?? "").includes(q) ||
      (a.department?.toLowerCase() ?? "").includes(q) ||
      a.roles.some((r) => r.includes(q))
    ));
  }, [search, accounts]);

  async function loadAccounts() {
    if (!xa) return;
    await run(async () => {
      const rows = await listFn({ data: { token: xa.token } }) as Account[];
      setAccounts(rows);
      setFiltered(rows);
      // Init edit roles
      const er: Record<string, string[]> = {};
      rows.forEach((r) => { er[r.slid] = [...r.roles]; });
      setEditRoles(er);
    });
  }

  async function createAccount() {
    if (!xa || !cName.trim()) return;
    await run(async () => {
      await createFn({ data: {
        token: xa.token, name: cName.trim(), email: cEmail.trim() || undefined,
        kind: cKind, hl: cHl, department: cDept.trim() || undefined, position: cPos.trim() || undefined,
      }});
      setShowCreate(false);
      setCName(""); setCEmail(""); setCKind("kunde"); setCHl(1); setCDept(""); setCPos("");
      await loadAccounts();
    });
  }

  async function saveRoles(slid: string) {
    if (!xa) return;
    const roles = editRoles[slid] ?? [];
    if (roles.length === 0) return;
    await run(async () => {
      await updateRolesFn({ data: { token: xa.token, target_slid: slid, roles: roles as any } });
      await loadAccounts();
      setExpandedSlid(null);
    });
  }

  async function deleteAccount(slid: string) {
    if (!xa) return;
    if (!window.confirm(`Account ${slid} wirklich löschen? Alle Passkeys und Daten werden entfernt.`)) return;
    await run(async () => {
      await deleteFn({ data: { token: xa.token, target_slid: slid } });
      await loadAccounts();
    });
  }

  function toggleRole(slid: string, role: string) {
    setEditRoles((prev) => {
      const current = prev[slid] ?? [];
      const has = current.includes(role);
      const next = has ? current.filter((r) => r !== role) : [...current, role];
      return { ...prev, [slid]: next };
    });
  }

  const stats = {
    total: accounts.length,
    superusers: accounts.filter((a) => a.roles.includes("superuser")).length,
    admins: accounts.filter((a) => a.roles.includes("admin")).length,
    mitarbeiter: accounts.filter((a) => a.roles.includes("mitarbeiter")).length,
    partners: accounts.filter((a) => a.roles.includes("partner")).length,
    kunden: accounts.filter((a) => a.roles.includes("kunde")).length,
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl grid place-items-center" style={{ background: "var(--gradient-neural-soft)" }}>
            <Shield className="h-5 w-5" style={{ color: "var(--neural-magenta)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Account-Verwaltung</h1>
            <p className="text-xs text-muted-foreground">{stats.total} Accounts · nur Superuser</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadAccounts()} disabled={syncing} className="syn-btn-ghost"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setShowCreate(true)} className="syn-btn"><Plus className="h-4 w-4" />Neu</button>
        </div>
      </div>

      {error && <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([
          { label: "Gesamt", value: stats.total, color: "var(--synapse)" },
          { label: "Superuser", value: stats.superusers, color: "var(--neural-magenta)" },
          { label: "Admin", value: stats.admins, color: "var(--synapse)" },
          { label: "Mitarbeiter", value: stats.mitarbeiter, color: "var(--neural-mint)" },
          { label: "Partner", value: stats.partners, color: "var(--neural-violet)" },
          { label: "Kunden", value: stats.kunden, color: "var(--neural-amber)" },
        ]).map((s) => (
          <div key={s.label} className="syn-card p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="syn-input pl-9" placeholder="SLID, Name, E-Mail, Abteilung, Rolle…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Account List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="syn-card p-8 text-center text-sm text-muted-foreground">
            {accounts.length === 0 ? "Noch keine Accounts vorhanden." : "Keine Accounts gefunden."}
          </div>
        )}
        {filtered.map((a) => (
          <div key={a.slid} className="syn-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              {/* Avatar initials */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--gradient-neural-soft)", color: "var(--synapse)" }}>
                {a.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{a.name}</span>
                  <span className="text-[10px] mono text-muted-foreground">{a.slid}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {a.roles.sort().map((r) => (
                    <span key={r} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${ROLE_COLORS[r]}15`, color: ROLE_COLORS[r], border: `1px solid ${ROLE_COLORS[r]}30` }}>
                      {ROLE_ICONS[r]} {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setExpandedSlid(expandedSlid === a.slid ? null : a.slid)} className="syn-btn-ghost p-1.5">
                  {expandedSlid === a.slid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button onClick={() => void deleteAccount(a.slid)} className="syn-btn-ghost p-1.5 text-destructive" title="Account löschen"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            {expandedSlid === a.slid && (
              <div className="pt-2 border-t border-border space-y-3 animate-in fade-in duration-200">
                {/* Account details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {a.email && <div><span className="text-muted-foreground">E-Mail:</span> {a.email}</div>}
                  {a.department && <div><span className="text-muted-foreground">Abteilung:</span> {a.department}</div>}
                  {a.position && <div><span className="text-muted-foreground">Position:</span> {a.position}</div>}
                  <div><span className="text-muted-foreground">HL:</span> {a.hl}</div>
                  <div><span className="text-muted-foreground">Kind:</span> {a.kind}</div>
                  <div><span className="text-muted-foreground">Erstellt:</span> {new Date(a.created_at).toLocaleDateString("de-DE")}</div>
                  <div><span className="text-muted-foreground">Passkey:</span> {a.profile?.passkey_migrated ? "✓" : "—"}</div>
                </div>

                {/* Role editor */}
                <div>
                  <div className="text-[11px] text-muted-foreground mono uppercase tracking-wider mb-2">Rollen bearbeiten</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_ROLES.map((r) => {
                      const active = (editRoles[a.slid] ?? a.roles).includes(r);
                      return (
                        <button key={r} onClick={() => toggleRole(a.slid, r)}
                          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all ${active ? "font-medium" : "opacity-50"}`}
                          style={active ? { background: `${ROLE_COLORS[r]}20`, color: ROLE_COLORS[r], border: `1px solid ${ROLE_COLORS[r]}50` } : { border: "1px solid rgba(255,255,255,0.1)" }}>
                          {ROLE_ICONS[r]} {r}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => void saveRoles(a.slid)} disabled={syncing} className="syn-btn mt-3 text-xs flex items-center gap-1">
                    <Save className="h-3.5 w-3.5" />Rollen speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Account Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="syn-card syn-gradient-border max-w-md w-full p-5 space-y-4" style={{ borderColor: "var(--synapse)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" style={{ color: "var(--synapse)" }} />
                <h3 className="font-semibold">Account erstellen</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="syn-btn-ghost p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Neuer Account mit automatisch generierter SLID und zufälligem PIK. Der Nutzer meldet sich per Passkey an.</p>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">Name *</span>
                <input className="syn-input" placeholder="Vorname Nachname" value={cName} onChange={(e) => setCName(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">E-Mail</span>
                <input className="syn-input" type="email" placeholder="email@example.com" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">Kind</span>
                  <select className="syn-input" value={cKind} onChange={(e) => setCKind(e.target.value as any)}>
                    <option value="kunde">Kunde</option>
                    <option value="partner">Partner</option>
                    <option value="mitarbeiter">Mitarbeiter</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">HL (1-7)</span>
                  <input className="syn-input" type="number" min={1} max={7} value={cHl} onChange={(e) => setCHl(Number(e.target.value))} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider flex items-center gap-1"><Building2 className="w-3 h-3" />Abteilung</span>
                  <input className="syn-input" placeholder="z. B. Development" value={cDept} onChange={(e) => setCDept(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] text-muted-foreground mono uppercase tracking-wider">Position</span>
                  <input className="syn-input" placeholder="z. B. Developer" value={cPos} onChange={(e) => setCPos(e.target.value)} />
                </label>
              </div>
            </div>

            <button onClick={() => void createAccount()} disabled={syncing || !cName.trim()} className="syn-btn w-full">
              <UserPlus className="h-4 w-4" />{syncing ? "Erstelle…" : "Account erstellen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
