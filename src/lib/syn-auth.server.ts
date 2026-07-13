// Shared server-side helper: verify SLID+PIK and load role flags.
// Kept in a .server.ts file so it can be imported from *.functions.ts handlers
// without leaking into the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_ALLOWED, ALL_FEATURES, type Feature } from "./features";

export type SynActor = {
  slid: string;
  name: string;
  hl: number;
  kind: string;
  isSuperuser: boolean;
};

export async function verifyActor(slid: string, pik: string): Promise<SynActor> {
  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("slid,name,hl,kind,pik")
    .eq("slid", slid)
    .eq("pik", pik)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ungültige SynID-Anmeldedaten.");

  const { data: su } = await supabaseAdmin.rpc("has_role", {
    _slid: data.slid,
    _role: "superuser",
  });

  return {
    slid: data.slid,
    name: data.name,
    hl: data.hl,
    kind: data.kind,
    isSuperuser: !!su,
  };
}

export function requireSuperuser(actor: SynActor) {
  if (!actor.isSuperuser) throw new Error("Superuser-Rechte erforderlich.");
}

// Resolve the full set of feature keys this account may use. The superuser
// gets everything; everyone else gets DEFAULT_ALLOWED plus explicit grants
// minus explicit revokes stored in user_tab_permissions.
export async function getEffectivePermissions(actor: SynActor): Promise<Set<string>> {
  if (actor.isSuperuser) return new Set<string>(ALL_FEATURES as string[]);
  const set = new Set<string>(DEFAULT_ALLOWED as string[]);
  const { data } = await supabaseAdmin
    .from("user_tab_permissions")
    .select("tab_key,allowed")
    .eq("slid", actor.slid);
  for (const row of data ?? []) {
    if (row.allowed) set.add(row.tab_key);
    else set.delete(row.tab_key);
  }
  return set;
}

// Throw unless the account may use a given feature. Superuser always passes.
export async function requirePermission(actor: SynActor, key: Feature | string) {
  if (actor.isSuperuser) return;
  const perms = await getEffectivePermissions(actor);
  if (!perms.has(key)) throw new Error("Keine Berechtigung für diese Aktion.");
}

// Non-throwing variant for conditional logic (e.g. filtering a list query,
// or deciding whether a secondary bypass like "own team leader" applies).
export async function hasPermission(actor: SynActor, key: Feature | string): Promise<boolean> {
  if (actor.isSuperuser) return true;
  const perms = await getEffectivePermissions(actor);
  return perms.has(key);
}
