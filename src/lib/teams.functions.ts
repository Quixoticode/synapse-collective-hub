import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

export const teamsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const [{ data: teams }, { data: members }] = await Promise.all([
      sb.from("teams").select("*").order("name"),
      sb.from("team_members").select("*"),
    ]);
    return { teams: teams ?? [], members: members ?? [] };
  });

export const teamUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    parent_id: z.string().uuid().nullable().optional(),
    min_hl: z.number().int().min(1).max(9).nullable().optional(),
    description: z.string().optional().nullable(),
    leader_slid: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "teams.manage");
    const sb = await admin();
    const payload = {
      name: data.name,
      parent_id: data.parent_id || null,
      min_hl: data.min_hl ?? null,
      description: data.description || null,
      leader_slid: data.leader_slid || null,
      created_by: me.slid,
    };
    if (data.id) {
      if (data.parent_id === data.id) throw new Error("Ein Team kann nicht sein eigenes Parent sein.");
      const { data: u, error } = await sb.from("teams").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("teams").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const teamDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "teams.manage");
    const sb = await admin();
    const { error } = await sb.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

export const teamMemberAdd = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    team_id: z.string().uuid(),
    target_slid: z.string().min(1),
    role: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: team } = await sb.from("teams").select("leader_slid").eq("id", data.team_id).maybeSingle();
    const isLeaderOfTeam = team?.leader_slid === me.slid;
    if (!isLeaderOfTeam && !(await (await auth()).hasPermission(me, "teams.manage"))) {
      throw new Error("Keine Berechtigung, Mitglieder hinzuzufügen.");
    }
    const { data: emp } = await sb.from("employees").select("hl").eq("slid", data.target_slid).maybeSingle();
    const { error } = await sb.from("team_members").insert({
      team_id: data.team_id, slid: data.target_slid, role: data.role || null, hl_at_join: emp?.hl ?? null,
    });
    if (error) throw new Error(error.message); return { ok: true };
  });

export const teamMemberRemove = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: mem } = await sb.from("team_members").select("team_id").eq("id", data.id).maybeSingle();
    if (!mem) throw new Error("Nicht gefunden.");
    const { data: team } = await sb.from("teams").select("leader_slid").eq("id", mem.team_id).maybeSingle();
    const isLeaderOfTeam = team?.leader_slid === me.slid;
    if (!isLeaderOfTeam && !(await (await auth()).hasPermission(me, "teams.manage"))) {
      throw new Error("Keine Berechtigung.");
    }
    const { error } = await sb.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });
