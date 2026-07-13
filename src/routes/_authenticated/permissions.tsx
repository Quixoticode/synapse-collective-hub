import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Search } from "lucide-react";
import { tabPermsListAll, tabPermSet } from "@/lib/permissions.functions";
import { TABS } from "@/lib/tabs-registry";
import { getCredentials } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/permissions")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("syn.session.v1");
    if (!raw) throw redirect({ to: "/auth" });
    let s: { slid?: string; pik?: string; isSuperuser?: boolean };
    try { s = JSON.parse(raw); } catch { throw redirect({ to: "/auth" }); }
    if (!s?.slid || !s?.pik) throw redirect({ to: "/auth" });
    if (s.isSuperuser) return;
    const { myPermissions } = await import("@/lib/permissions.functions");
    const r = await myPermissions({ data: { slid: s.slid, pik: s.pik } }).catch(() => null);
    if (!r || (!r.isSuperuser && !r.features.includes("teams.permissions"))) throw redirect({ to: "/apps" });
  },
  component: PermissionsPage,
});

type Emp = { slid: string; name: string; hl: number; kind: string; department: string|null; position: string|null };
type Perm = { slid: string; tab_key: string; allowed: boolean };

function PermissionsPage() {
  const listFn = useServerFn(tabPermsListAll);
  const setFn = useServerFn(tabPermSet);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const r = await listFn({ data: c }) as { employees: Emp[]; permissions: Perm[] };
    setEmps(r.employees); setPerms(r.permissions);
    if (!selected && r.employees.length) setSelected(r.employees[0].slid);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return emps.filter((e) => !s || e.name.toLowerCase().includes(s) || e.slid.includes(s));
  }, [emps, q]);

  function isAllowed(slid: string, key: string) {
    const p = perms.find((x) => x.slid === slid && x.tab_key === key);
    return p ? p.allowed : true; // default allow
  }

  async function toggle(key: string) {
    if (!selected) return;
    const cur = isAllowed(selected, key);
    const c = getCredentials(); if (!c) return;
    await setFn({ data: { ...c, target_slid: selected, tab_key: key, allowed: !cur } });
    await reload();
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-28 md:pb-8">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><ShieldCheck className="h-5 w-5" /> Berechtigungen</h1>
      <p className="text-xs text-muted-foreground mb-5">Tabs pro Mitarbeiter freigeben oder sperren.</p>

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="syn-card p-3">
          <div className="relative mb-2">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="syn-input pl-8" placeholder="Suche…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-1">
            {filtered.map((e) => (
              <button key={e.slid} onClick={() => setSelected(e.slid)}
                className={`w-full text-left px-3 py-2 rounded-xl ${selected === e.slid ? "syn-tab-active" : "hover:bg-accent"}`}>
                <div className="text-sm font-medium truncate">{e.name}</div>
                <div className="text-[10px] mono text-muted-foreground">{e.slid} · HL{e.hl}{e.position && ` · ${e.position}`}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="syn-card p-4">
          {!selected ? <div className="text-sm text-muted-foreground">Mitarbeiter wählen.</div> : (
            <div className="space-y-2">
              <div className="text-[10px] mono uppercase text-muted-foreground mb-2">Tabs für {selected}</div>
              {TABS.map((t) => {
                const allowed = isAllowed(selected, t.key);
                return (
                  <label key={t.key} className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border hover:border-cyan-400/30">
                    <div className="min-w-0 flex items-center gap-2">
                      <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.label}</div>
                        <div className="text-[10px] mono text-muted-foreground truncate">{t.to}</div>
                      </div>
                    </div>
                    <input type="checkbox" checked={allowed} onChange={() => void toggle(t.key)} className="h-4 w-4 accent-[color:var(--synapse)]" />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
