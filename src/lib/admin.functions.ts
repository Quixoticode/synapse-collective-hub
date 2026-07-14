import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({
  slid: z.string().min(1),
  pik: z.string().min(8),
});

async function admin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}

async function actor(slid: string, pik: string) {
  const m = await import("./syn-auth.server");
  return m.verifyActor(slid, pik);
}

/* ═══════════════════════════════════════════
   requireSuperuser
   ═══════════════════════════════════════════ */
async function requireSuperuser(slid: string, pik: string) {
  const me = await actor(slid, pik);
  if (!me.isSuperuser) throw new Error("Nur für Superuser.");
  return me;
}

/* ═══════════════════════════════════════════
   adminStats
   ═══════════════════════════════════════════ */
export const adminStats = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const [{ count: totalAccounts }, { count: totalDevices }, { count: activeBans }] = await Promise.all([
      supa.from("employees").select("*", { head: true, count: "exact" }),
      supa.from("trusted_devices").select("*", { head: true, count: "exact" }),
      supa.from("bans").select("*", { head: true, count: "exact" }).is("expires_at", null).or("expires_at.gt." + new Date().toISOString()),
    ]);

    const { data: roleData } = await supa.from("employee_roles").select("role");
    const roleBreakdown: Record<string, number> = {};
    (roleData || []).forEach((r) => {
      roleBreakdown[r.role] = (roleBreakdown[r.role] || 0) + 1;
    });

    return {
      totalAccounts: totalAccounts || 0,
      totalDevices: totalDevices || 0,
      activeBans: activeBans || 0,
      roleBreakdown,
    };
  });

/* ═══════════════════════════════════════════
   adminListAccounts
   ═══════════════════════════════════════════ */
export const adminListAccounts = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.extend({ search: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    let q = supa.from("employees").select("slid,name,department,position,kind,hl").order("name", { ascending: true });
    if (data.search) {
      q = q.or(`name.ilike.%${data.search}%,slid.ilike.%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;

    // Get roles for each employee
    const { data: roles } = await supa.from("employee_roles").select("slid,role");
    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach((r) => {
      if (!roleMap[r.slid]) roleMap[r.slid] = [];
      roleMap[r.slid].push(r.role);
    });

    return (rows || []).map((r) => ({
      ...r,
      roles: roleMap[r.slid] || [],
    }));
  });

/* ═══════════════════════════════════════════
   adminUpdateAccount
   ═══════════════════════════════════════════ */
export const adminUpdateAccount = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({
      target_slid: z.string().min(1),
      name: z.string().optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      kind: z.string().optional(),
      hl: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const update: Record<string, any> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.department !== undefined) update.department = data.department;
    if (data.position !== undefined) update.position = data.position;
    if (data.kind !== undefined) update.kind = data.kind;
    if (data.hl !== undefined) update.hl = data.hl;

    const { error } = await supa.from("employees").update(update).eq("slid", data.target_slid);
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminSetRole
   ═══════════════════════════════════════════ */
export const adminSetRole = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({
      target_slid: z.string().min(1),
      role: z.string().min(1),
      grant: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    if (data.grant) {
      const { error } = await supa.from("employee_roles").upsert({
        slid: data.target_slid,
        role: data.role,
        granted_by: data.slid,
        granted_at: new Date().toISOString(),
      }, { onConflict: "slid,role" });
      if (error) throw error;
    } else {
      const { error } = await supa.from("employee_roles").delete()
        .eq("slid", data.target_slid).eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminListDevices
   ═══════════════════════════════════════════ */
export const adminListDevices = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.extend({ limit: z.number().int().min(1).max(500).default(100) }).parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { data: rows, error } = await supa
      .from("trusted_devices")
      .select("fingerprint,slid,device_name,device_type,last_login,created_at")
      .order("last_login", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows || [];
  });

/* ═══════════════════════════════════════════
   adminRevokeDevice
   ═══════════════════════════════════════════ */
export const adminRevokeDevice = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({ device_fingerprint: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { error } = await supa.from("trusted_devices").delete()
      .eq("fingerprint", data.device_fingerprint);
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminListBans
   ═══════════════════════════════════════════ */
export const adminListBans = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { data: rows, error } = await supa
      .from("bans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows || [];
  });

/* ═══════════════════════════════════════════
   adminBanAccount
   ═══════════════════════════════════════════ */
export const adminBanAccount = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({
      target_slid: z.string().min(1),
      reason: z.string().min(1),
      duration_hours: z.number().int().min(1).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const expiresAt = data.duration_hours
      ? new Date(Date.now() + data.duration_hours * 3600000).toISOString()
      : null;

    const { error } = await supa.from("bans").insert({
      slid: data.target_slid,
      reason: data.reason,
      expires_at: expiresAt,
      banned_by: data.slid,
    });
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminUnbanAccount
   ═══════════════════════════════════════════ */
export const adminUnbanAccount = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({ target_slid: z.string().min(1) }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { error } = await supa.from("bans").delete().eq("slid", data.target_slid);
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminSetPermission
   ═══════════════════════════════════════════ */
export const adminSetPermission = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({
      target_slid: z.string().min(1),
      feature: z.string().min(1),
      allowed: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    if (data.allowed) {
      const { error } = await supa.from("user_tab_permissions").upsert({
        slid: data.target_slid,
        tab_key: data.feature,
        allowed: true,
        updated_by: data.slid,
      }, { onConflict: "slid,tab_key" });
      if (error) throw error;
    } else {
      const { error } = await supa.from("user_tab_permissions").delete()
        .eq("slid", data.target_slid).eq("tab_key", data.feature);
      if (error) throw error;
    }
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   adminListPermissions
   ═══════════════════════════════════════════ */
export const adminListPermissions = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { data: rows, error } = await supa
      .from("user_tab_permissions")
      .select("slid,tab_key,allowed,updated_by")
      .eq("allowed", true);
    if (error) throw error;
    return rows || [];
  });

/* ═══════════════════════════════════════════
   adminAuditLog
   ═══════════════════════════════════════════ */
export const adminAuditLog = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({ limit: z.number().int().min(1).max(500).default(100) }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    await requireSuperuser(data.slid, data.pik);

    const { data: rows, error } = await supa
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) {
      // If security_events doesn't exist, return empty
      return [];
    }
    return rows || [];
  });
