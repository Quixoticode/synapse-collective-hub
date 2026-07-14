import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, UserCheck, Users, Search, ChevronDown, ChevronRight,
  Edit3, Save, X, CheckSquare, Square, Lock, Eye
} from "lucide-react";
import {
  T, LiquidButton, LiquidInput, LiquidCheckbox, TabBar, AccordionItem, Spin
} from "@/components/nl";
import { getSession } from "@/lib/syn-session";
import {
  permListEmployees, permGetPermissions, permSetTabPermission,
  permAssignRole, permRevokeRole, permListRoles,
} from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/permissions")({
  ssr: false,
  component: PermissionsPage,
});

type Employee = { slid: string; name: string; department: string | null; kind: string | null };

type PermEntry = {
  slid: string;
  tab_key: string;
  allowed: boolean;
};

const MODULE_TABS = [
  { key: "home", label: "Start" },
  { key: "worktime", label: "WorkTime" },
  { key: "tasks", label: "Tasks" },
  { key: "calendar", label: "Calendar" },
  { key: "contacts", label: "Contacts" },
  { key: "chat", label: "Chat" },
  { key: "vault", label: "Vault" },
  { key: "workspace", label: "Workspace" },
  { key: "basics", label: "Basics" },
  { key: "news", label: "News" },
  { key: "docs", label: "Docs" },
  { key: "apply", label: "Apply" },
  { key: "teams", label: "Teams" },
  { key: "security", label: "Security" },
  { key: "payments", label: "Payments" },
  { key: "auftrag", label: "Aufträge" },
  { key: "admin", label: "Admin" },
  { key: "account", label: "Mein Account" },
  { key: "settings", label: "Einstellungen" },
];

const ACTION_TABS = [
  { key: "worktime.manage", label: "WorkTime verwalten" },
  { key: "contacts.manage", label: "Contacts verwalten" },
  { key: "calendar.manage", label: "Calendar verwalten" },
  { key: "tasks.manage", label: "Tasks verwalten" },
  { key: "teams.manage", label: "Teams verwalten" },
  { key: "teams.permissions", label: "Team-Berechtigungen" },
  { key: "security.all", label: "Security (alle)" },
  { key: "settings.admin", label: "Admin-Einstellungen" },
  { key: "vault.shared", label: "Geteilte Vault-Einträge" },
  { key: "workspace.manage", label: "Workspace verwalten" },
  { key: "auftrag.manage", label: "Aufträge verwalten" },
];

function PermissionsPage() {
  const session = getSession();
  const listEmpFn = useServerFn(permListEmployees);
  const getPermFn = useServerFn(permGetPermissions);
  const setTabFn = useServerFn(permSetTabPermission);
  const assignRoleFn = useServerFn(permAssignRole);
  const revokeRoleFn = useServerFn(permRevokeRole);
  const listRolesFn = useServerFn(permListRoles);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedSlid, setSelectedSlid] = useState<string | null>(null);
  const [perms, setPerms] = useState<PermEntry[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creds = { slid: session?.slid || "", pik: session?.pik || "" };

  async function load() {
    if (!creds.slid || !creds.pik) return;
    setLoading(true);
    try {
      const emp = await listEmpFn({ data: creds }) as Employee[];
      setEmployees(emp);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function selectEmployee(slid: string) {
    setSelectedSlid(slid);
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        getPermFn({ data: { ...creds, target_slid: slid } }).catch(() => []),
        listRolesFn({ data: { ...creds, target_slid: slid } }).catch(() => []),
      ]);
      setPerms(p as PermEntry[]);
      setRoles((r as any[]).map((x) => x.role));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTab(tabKey: string, allowed: boolean) {
    if (!selectedSlid) return;
    setSaving(true);
    try {
      await setTabFn({ data: { ...creds, target_slid: selectedSlid, tab_key: tabKey, allowed } });
      setPerms((prev) => {
        const filtered = prev.filter((p) => p.tab_key !== tabKey);
        if (allowed) filtered.push({ slid: selectedSlid, tab_key: tabKey, allowed: true });
        return filtered;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(role: string, grant: boolean) {
    if (!selectedSlid) return;
    setSaving(true);
    try {
      if (grant) {
        await assignRoleFn({ data: { ...creds, target_slid: selectedSlid, role } });
        setRoles((prev) => [...prev.filter((r) => r !== role), role]);
      } else {
        await revokeRoleFn({ data: { ...creds, target_slid: selectedSlid, role } });
        setRoles((prev) => prev.filter((r) => r !== role));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedEmployee = employees.find((e) => e.slid === selectedSlid);
  const filteredEmployees = employees.filter((e) =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.slid.toLowerCase().includes(search.toLowerCase())
  );

  function hasPerm(tabKey: string) {
    return perms.some((p) => p.tab_key === tabKey && p.allowed);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 md:pb-8" style={{ minHeight: "100vh" }}>
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-8 w-8" style={{ color: T.primary }} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Berechtigungen</h1>
            <p className="text-xs" style={{ color: T.muted }}>Feature-basierte Zugriffssteuerung pro Mitarbeiter</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: `${T.error}12`, border: `1px solid ${T.error}30`, color: T.error }}>{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Employee list */}
        <div className="space-y-3">
          <LiquidInput placeholder="Mitarbeiter suchen…" value={search} onChange={setSearch} icon={Search} />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {loading && !employees.length ? (
              <div className="flex justify-center py-8"><Spin size={24} color={T.primary} /></div>
            ) : (
              filteredEmployees.map((e) => (
                <button
                  key={e.slid}
                  onClick={() => selectEmployee(e.slid)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{
                    background: selectedSlid === e.slid ? `${T.primary}15` : T.bg2,
                    border: `1px solid ${selectedSlid === e.slid ? `${T.primary}40` : T.border}`,
                  }}
                >
                  <div className="font-medium text-sm" style={{ color: T.text }}>{e.name || e.slid}</div>
                  <div className="text-xs" style={{ color: T.muted }}>{e.department || "—"} · {e.kind || "—"}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedSlid ? (
            <div className="text-center py-20 text-sm" style={{ color: T.muted }}>Wähle einen Mitarbeiter aus der Liste.</div>
          ) : (
            <>
              <div className="p-4 rounded-2xl" style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-5 w-5" style={{ color: T.primary }} />
                  <span className="font-semibold" style={{ color: T.text }}>{selectedEmployee?.name || selectedSlid}</span>
                  {saving && <Spin size={14} color={T.primary} />}
                </div>
                <div className="text-xs" style={{ color: T.muted }}>{selectedEmployee?.department} · {selectedEmployee?.kind}</div>
              </div>

              {/* Roles */}
              <AccordionItem title="Rollen" sub="Rollenzuweisung" color={T.accent}>
                <div className="grid grid-cols-2 gap-2 p-2">
                  {["superuser", "admin", "manager", "support", "customer"].map((role) => (
                    <LiquidCheckbox
                      key={role}
                      checked={roles.includes(role)}
                      onChange={(checked) => toggleRole(role, checked)}
                    >
                      <span className="capitalize text-xs">{role}</span>
                    </LiquidCheckbox>
                  ))}
                </div>
              </AccordionItem>

              {/* Module features */}
              <AccordionItem title="Module" sub="Tab-Zugriff" color={T.primary}>
                <div className="space-y-1 p-2">
                  {MODULE_TABS.map((t) => (
                    <div key={t.key} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.surface }}>
                      <span className="text-xs" style={{ color: T.text }}>{t.label}</span>
                      <LiquidCheckbox
                        checked={hasPerm(t.key)}
                        onChange={(checked) => toggleTab(t.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </AccordionItem>

              {/* Action features */}
              <AccordionItem title="Aktionen" sub="Erweiterte Berechtigungen" color={T.secondary}>
                <div className="space-y-1 p-2">
                  {ACTION_TABS.map((t) => (
                    <div key={t.key} className="flex items-center justify-between p-2 rounded-lg" style={{ background: T.surface }}>
                      <span className="text-xs" style={{ color: T.text }}>{t.label}</span>
                      <LiquidCheckbox
                        checked={hasPerm(t.key)}
                        onChange={(checked) => toggleTab(t.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </AccordionItem>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
