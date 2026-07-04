import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Settings, ChevronUp, ChevronDown } from "lucide-react";
import { tabPrefsForMe, tabPermsForMe, tabPrefSet } from "@/lib/permissions.functions";
import { TABS } from "@/lib/tabs-registry";
import { getCredentials, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/_authenticated/settings/tabs")({
  ssr: false,
  component: TabPrefsPage,
});

type Pref = { tab_key: string; visible: boolean; pinned: boolean; sort_order: number };
type Perm = { tab_key: string; allowed: boolean };

function TabPrefsPage() {
  const session = getSession();
  const prefsFn = useServerFn(tabPrefsForMe);
  const permsFn = useServerFn(tabPermsForMe);
  const setFn = useServerFn(tabPrefSet);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);

  async function reload() {
    const c = getCredentials(); if (!c) return;
    const [p, q] = await Promise.all([prefsFn({ data: c }) as Promise<Pref[]>, permsFn({ data: c }) as Promise<Perm[]>]);
    setPrefs(p); setPerms(q);
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const allowed = (key: string) => {
    const p = perms.find((x) => x.tab_key === key);
    return p ? p.allowed : true;
  };
  const visible = (key: string) => {
    const p = prefs.find((x) => x.tab_key === key);
    return p ? p.visible : true;
  };

  async function toggle(key: string) {
    if (!allowed(key)) return;
    const cur = visible(key);
    const c = getCredentials(); if (!c) return;
    const p = prefs.find((x) => x.tab_key === key);
    await setFn({ data: { ...c, tab_key: key, visible: !cur, pinned: false, sort_order: p?.sort_order ?? 0 } });
    await reload();
  }

  const eligible = TABS.filter((t) => {
    if (t.requires?.superuser && !session?.isSuperuser) return false;
    if (t.requires?.hl && (session?.hl ?? 0) < t.requires.hl && !session?.isSuperuser) return false;
    return true;
  });

  // Ordered by current sort_order (fallback: registry order)
  const ordered = [...eligible].sort((a, b) => {
    const sa = prefs.find((x) => x.tab_key === a.key)?.sort_order ?? 0;
    const sb = prefs.find((x) => x.tab_key === b.key)?.sort_order ?? 0;
    return sa - sb;
  });

  async function move(key: string, dir: -1 | 1) {
    const c = getCredentials(); if (!c) return;
    const idx = ordered.findIndex((x) => x.key === key);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    // assign sequential sort_order to make swap deterministic
    const list = ordered.map((t, i) => ({ key: t.key, order: i * 10 }));
    list[idx].order = swap * 10;
    list[swap].order = idx * 10;
    for (const item of list) {
      const p = prefs.find((x) => x.tab_key === item.key);
      await setFn({ data: { ...c, tab_key: item.key, visible: p?.visible ?? true, pinned: false, sort_order: item.order } });
    }
    await reload();
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-28 md:pb-8">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><Settings className="h-5 w-5" /> Meine Tabs</h1>
      <p className="text-xs text-muted-foreground mb-5">Sichtbarkeit umschalten, Reihenfolge per Pfeiltasten ändern (kein Drag-and-Drop nötig).</p>

      <div className="syn-card p-3 space-y-1">
        {ordered.map((t, i) => {
          const can = allowed(t.key);
          const vis = visible(t.key);
          return (
            <div key={t.key} className={`flex items-center gap-2 p-2 rounded-xl border ${can ? "border-border" : "border-rose-500/30 opacity-60"}`}>
              <div className="flex flex-col shrink-0">
                <button disabled={i === 0} onClick={() => void move(t.key, -1)} className="syn-btn-ghost p-0.5 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button disabled={i === ordered.length - 1} onClick={() => void move(t.key, 1)} className="syn-btn-ghost p-0.5 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
              <t.icon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.label}</div>
                <div className="text-[10px] mono text-muted-foreground truncate">
                  {t.to}{!can && " · von Admin gesperrt"}
                </div>
              </div>
              <input type="checkbox" disabled={!can} checked={vis && can} onChange={() => void toggle(t.key)} className="h-4 w-4 accent-[color:var(--synapse)]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

