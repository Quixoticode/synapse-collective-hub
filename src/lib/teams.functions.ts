import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

export const teamsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const [{ data: teams }, { data: members }] = await Promise.all([
      sb.from("teams").select("*").order("kind").order("name"),
      sb.from("team_members").select("*"),
    ]);
    return { teams: teams ?? [], members: members ?? [] };
  });

export const teamUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    kind: z.enum(["service","support","labs","department"]),
    department: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    leader_slid: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 4) throw new Error("Nur Abteilungsleiter (HL 4+) dürfen Teams anlegen/ändern.");
    const sb = await admin();
    const payload = {
      name: data.name, kind: data.kind,
      department: data.department || null, description: data.description || null,
      leader_slid: data.leader_slid || null,
      created_by: me.slid,
    };
    if (data.id) {
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
    if (!me.isSuperuser && me.hl < 4) throw new Error("Nur HL 4+.");
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
    // HL 2+ (Teamleiter) or leader of that team, or HL 4+
    const { data: team } = await sb.from("teams").select("leader_slid").eq("id", data.team_id).maybeSingle();
    const isLeaderOfTeam = team?.leader_slid === me.slid;
    if (!me.isSuperuser && me.hl < 4 && !(me.hl >= 2 && isLeaderOfTeam)) {
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
    if (!me.isSuperuser && me.hl < 4 && !(me.hl >= 2 && isLeaderOfTeam)) {
      throw new Error("Keine Berechtigung.");
    }
    const { error } = await sb.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });
