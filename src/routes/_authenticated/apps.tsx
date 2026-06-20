import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSession, getCredentials, type SynSession } from "@/lib/syn-session";
import { SynIDCard } from "@/components/SynIDCard";
import { TABS, visibleTabs } from "@/lib/tabs-registry";
import { tabPermsForMe, tabPrefsForMe } from "@/lib/permissions.functions";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsLauncher,
});

function AppsLauncher() {
  const [session, setSession] = useState<SynSession | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<Record<string, { visible: boolean; sort_order?: number }>>({});
  const fetchPerms = useServerFn(tabPermsForMe);
  const fetchPrefs = useServerFn(tabPrefsForMe);

  useEffect(() => {
    setSession(getSession());
    const c = getCredentials();
    if (!c) return;
    void (async () => {
      try {
        const [p, q] = await Promise.all([
          fetchPerms({ data: c }) as Promise<{ tab_key: string; allowed: boolean }[]>,
          fetchPrefs({ data: c }) as Promise<{ tab_key: string; visible: boolean; sort_order: number }[]>,
        ]);
        setPerms(Object.fromEntries(p.map((x) => [x.tab_key, x.allowed])));
        setPrefs(Object.fromEntries(q.map((x) => [x.tab_key, { visible: x.visible, sort_order: x.sort_order }])));
      } catch { /* ignore */ }
    })();
  }, [fetchPerms, fetchPrefs]);

  if (!session) return null;
  const tabs = visibleTabs({ hl: session.hl, isSuperuser: session.isSuperuser }, { permissions: perms, prefs })
    .filter((t) => t.key !== "apps"); // don't show apps tile inside apps page

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto pb-28 md:pb-8">
      <div className="mb-5 sm:mb-6">
        <SynIDCard data={session} />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Deine Apps</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">Wähle eine Anwendung aus dem xSyna-Kollektiv.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {tabs.map((t, i) => {
          const Icon = t.icon;
          return (
            <Link key={t.key} to={t.to}>
              <div
                className="syn-app-tile group relative overflow-hidden rounded-3xl border border-white/10 bg-card/70 backdrop-blur-sm p-4 sm:p-5 transition-all hover:-translate-y-1 hover:border-white/25"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${t.accent} opacity-40 group-hover:opacity-70 transition-opacity`} />
                <div className="relative z-10 flex flex-col gap-3 min-h-[110px]">
                  <div className="h-11 w-11 rounded-2xl bg-black/40 border border-white/10 grid place-items-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="mt-auto">
                    <div className="font-semibold text-sm sm:text-base">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
