import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Users, Shield, Smartphone, Ban, Search, ChevronDown, ChevronRight,
  Edit3, Trash2, RotateCcw, Save, X, UserCheck, Activity, Lock, Eye, Clock, CheckSquare,
  ShieldCheck, UserX, KeyRound, Fingerprint, Globe, Monitor
} from "lucide-react";
import {
  T, LiquidButton, LiquidInput, LiquidCheckbox, TabBar, AccordionItem, Spin, XSynaLogo
} from "@/components/nl";
import { getCredentials, getSession } from "@/lib/syn-session";
import {
  adminStats, adminListAccounts, adminUpdateAccount, adminSetRole,
  adminListDevices, adminRevokeDevice, adminAuditLog,
  adminBanAccount, adminUnbanAccount, adminListBans,
  adminListPermissions, adminSetPermission,
} from "@/lib/admin.functions";
import { MODULE_FEATURES, ACTION_FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminPage,
});

/* ─── types ─── */
type AccountRow = {
  slid: string; name: string; department: string | null; position: string | null;
  kind: string | null; hl: boolean | null; roles: string[];
};

/* ─── page ─── */
function AdminPage() {
  const session = getSession();
  const listAccountsFn = useServerFn(adminListAccounts);
  const statsFn = useServerFn(adminStats);
  const updateAccountFn = useServerFn(adminUpdateAccount);
  const setRoleFn = useServerFn(adminSetRole);
  const listDevicesFn = useServerFn(adminListDevices);
  const revokeDeviceFn = useServerFn(adminRevokeDevice);
  const listBansFn = useServerFn(adminListBans);
  const banFn = useServerFn(adminBanAccount);
  const unbanFn = useServerFn(adminUnbanAccount);
  const auditFn = useServerFn(adminAuditLog);
  const listPermsFn = useServerFn(adminListPermissions);
  const setPermFn = useServerFn(adminSetPermission);

  const [tab, setTab] = useState(0);
  const tabs = ["Dashboard", "Accounts", "Berechtigungen", "Security"];

  /* Dashboard state */
  const [stats, setStats] = useState<any>(null);

  /* Accounts state */
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [editingSlid, setEditingSlid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccountRow>>({});

  /* Devices state */
  const [devices, setDevices] = useState<any[]>([]);

  /* Bans state */
  const [bans, setBans] = useState<any[]>([]);
  const [banForm, setBanForm] = useState({ slid: "", reason: "", hours: "" });

  /* Audit state */
  const [auditLog, setAuditLog] = useState<any[]>([]);

  /* Permissions state */
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [selectedPermSlid, setSelectedPermSlid] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creds = { slid: session?.slid || "", pik: session?.pik || "" };

  async function load() {
    if (!creds.slid || !creds.pik) return;
    setLoading(true);
    setError(null);
    try {
      const [s, a, d, b, al, p] = await Promise.all([
        statsFn({ data: creds }).catch(() => null),
        listAccountsFn({ data: creds }).catch(() => []),
        listDevicesFn({ data: creds }).catch(() => []),
        listBansFn({ data: creds }).catch(() => []),
        auditFn({ data: { ...creds, limit: 100 } }).catch(() => []),
        listPermsFn({ data: creds }).catch(() => []),
      ]);
      setStats(s);
      setAccounts(a as AccountRow[]);
      setDevices(d);
      setBans(b);
      setAuditLog(al);
      setAllPerms(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveEdit() {
    if (!editingSlid) return;
    await updateAccountFn({ data: { ...creds, target_slid: editingSlid, ...editForm } });
    setEditingSlid(null);
    load();
  }

  async function toggleRole(targetSlid: string, role: string, grant: boolean) {
    await setRoleFn({ data: { ...creds, target_slid: targetSlid, role, grant } });
    load();
  }

  async function togglePerm(targetSlid: string, feature: string, allowed: boolean) {
    await setPermFn({ data: { ...creds, target_slid: targetSlid, feature, allowed } });
    load();
  }

  async function handleBan() {
    if (!banForm.slid || !banForm.reason) return;
    await banFn({ data: { ...creds, target_slid: banForm.slid, reason: banForm.reason, duration_hours: banForm.hours ? parseInt(banForm.hours) : undefined } });
    setBanForm({ slid: "", reason: "", hours: "" });
    load();
  }

  async function handleUnban(slid: string) {
    await unbanFn({ data: { ...creds, target_slid: slid } });
    load();
  }

  const filteredAccounts = accounts.filter((a) =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.slid.toLowerCase().includes(search.toLowerCase())
  );

  const allFeatures = [...MODULE_FEATURES, ...ACTION_FEATURES];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8" style={{ minHeight: "100vh" }}>
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-8 w-8" style={{ color: T.primary }} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Admin Dashboard</h1>
            <p className="text-xs" style={{ color: T.muted }}>Systemverwaltung · Superuser-Only</p>
          </div>
        </div>
        <TabBar tabs={tabs} defaultActive={0} onChange={setTab} />
      </header>

      {error && (
        <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: `${T.error}12`, border: `1px solid ${T.error}30`, color: T.error }}>
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <Spin size={32} color={T.primary} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 0 && stats && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Accounts" value={stats.totalAccounts} color={T.primary} />
              <StatCard icon={Smartphone} label="Geräte" value={stats.totalDevices} color={T.accent} />
              <StatCard icon={Ban} label="Aktive Bans" value={stats.activeBans} color={T.error} />
              <StatCard icon={ShieldCheck} label="Rollen" value={Object.keys(stats.roleBreakdown).length} color={T.success} />

              <div className="col-span-2 lg:col-span-4">
                <div className="p-4 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: T.text }}>Rollen-Verteilung</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.roleBreakdown).map(([role, count]) => (
                      <span key={role} className="px-3 py-1 rounded-full text-xs" style={{ background: `${T.primary}15`, border: `1px solid ${T.primary}30`, color: T.primary }}>
                        {role}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 1 && (
            <motion.div key="accounts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex gap-2">
                <LiquidInput placeholder="Suchen (SLID oder Name)" value={search} onChange={setSearch} icon={Search} />
                <LiquidButton onClick={load}><RotateCcw className="h-4 w-4" /></LiquidButton>
              </div>

              <div className="space-y-2">
                {filteredAccounts.map((a) => (
                  <div key={a.slid} className="p-4 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                    {editingSlid === a.slid ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <LiquidInput label="Name" value={editForm.name || ""} onChange={(v) => setEditForm(f => ({ ...f, name: v }))} />
                          <LiquidInput label="Abteilung" value={editForm.department || ""} onChange={(v) => setEditForm(f => ({ ...f, department: v }))} />
                        </div>
                        <div className="flex gap-2">
                          <LiquidButton onClick={saveEdit}><Save className="h-4 w-4" /> Speichern</LiquidButton>
                          <LiquidButton variant="ghost" onClick={() => setEditingSlid(null)}><X className="h-4 w-4" /> Abbrechen</LiquidButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm" style={{ color: T.text }}>{a.name || "—"} <span className="mono text-xs" style={{ color: T.muted }}>({a.slid})</span></div>
                          <div className="text-xs" style={{ color: T.muted }}>{a.department || "—"} · {a.position || "—"} · {a.kind || "—"}</div>
                          <div className="flex gap-1 mt-1">
                            {a.roles.map((r) => (
                              <span key={r} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${T.accent}20`, color: T.accent }}>{r}</span>
                            ))}
                          </div>
                        </div>
                        <LiquidButton size="sm" onClick={() => { setEditingSlid(a.slid); setEditForm(a); }}><Edit3 className="h-4 w-4" /></LiquidButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 2 && (
            <motion.div key="perms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: T.text }}>Accounts</h3>
                  {accounts.map((a) => (
                    <button
                      key={a.slid}
                      onClick={() => setSelectedPermSlid(a.slid)}
                      className="w-full text-left p-2 rounded-xl text-sm"
                      style={{
                        background: selectedPermSlid === a.slid ? `${T.primary}15` : T.bg2,
                        border: `1px solid ${selectedPermSlid === a.slid ? `${T.primary}40` : T.border}`,
                        color: T.text,
                      }}
                    >
                      {a.name || a.slid}
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2 space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: T.text }}>
                    {selectedPermSlid ? `Berechtigungen für ${accounts.find(a => a.slid === selectedPermSlid)?.name || selectedPermSlid}` : "Account auswählen"}
                  </h3>
                  {selectedPermSlid && (
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                      {allFeatures.map((f) => {
                        const hasPerm = allPerms.some((p) => p.slid === selectedPermSlid && p.tab_key === f);
                        return (
                          <div key={f} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: T.bg2 }}>
                            <LiquidCheckbox
                              checked={hasPerm}
                              onChange={(checked) => togglePerm(selectedPermSlid, f, checked)}
                            >
                              <span className="text-xs">{f}</span>
                            </LiquidCheckbox>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 3 && (
            <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Bans */}
              <div className="p-4 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: T.text }}>Bans</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <LiquidInput placeholder="SLID" value={banForm.slid} onChange={(v) => setBanForm(f => ({ ...f, slid: v }))} />
                  <LiquidInput placeholder="Grund" value={banForm.reason} onChange={(v) => setBanForm(f => ({ ...f, reason: v }))} />
                  <LiquidInput placeholder="Stunden (optional)" value={banForm.hours} onChange={(v) => setBanForm(f => ({ ...f, hours: v }))} />
                </div>
                <LiquidButton onClick={handleBan}><Ban className="h-4 w-4" /> Bannen</LiquidButton>

                <div className="mt-3 space-y-2">
                  {bans.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.surface }}>
                      <div>
                        <span className="text-sm" style={{ color: T.text }}>{b.slid}</span>
                        <span className="text-xs ml-2" style={{ color: T.muted }}>{b.reason}</span>
                      </div>
                      <LiquidButton variant="ghost" size="xs" onClick={() => handleUnban(b.slid)}><UserCheck className="h-4 w-4" /></LiquidButton>
                    </div>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div className="p-4 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: T.text }}>Geräte ({devices.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {devices.map((d) => (
                    <div key={d.fingerprint} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.surface }}>
                      <div>
                        <div className="text-sm" style={{ color: T.text }}>{d.device_name || "Unbekannt"}</div>
                        <div className="text-xs" style={{ color: T.muted }}>{d.device_type} · {d.slid} · {d.last_login ? new Date(d.last_login).toLocaleDateString() : "—"}</div>
                      </div>
                      <LiquidButton variant="danger" size="xs" onClick={() => revokeDeviceFn({ data: { ...creds, device_fingerprint: d.fingerprint } }).then(load)}>
                        <Trash2 className="h-4 w-4" />
                      </LiquidButton>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl"
      style={{ background: T.bg2, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} style={{ color }} />
        <span className="text-xs" style={{ color: T.muted }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
    </motion.div>
  );
}
