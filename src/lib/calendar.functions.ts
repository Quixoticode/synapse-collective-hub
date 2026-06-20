import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

export const calList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ from: z.string().optional(), to: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    let q = sb.from("cal_events").select("*").order("starts_at");
    if (data.from) q = q.gte("starts_at", data.from);
    if (data.to) q = q.lte("starts_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((e) =>
      me.isSuperuser || e.visibility === "all" || e.visibility === "team" || e.owner_slid === me.slid,
    );
  });

const upsert = creds.extend({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  all_day: z.boolean().default(false),
  visibility: z.enum(["private","team","all"]).default("team"),
  color: z.string().optional().nullable(),
});

export const calUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const payload = {
      title: data.title, description: data.description || null, location: data.location || null,
      starts_at: data.starts_at, ends_at: data.ends_at, all_day: data.all_day,
      visibility: data.visibility, color: data.color || null, owner_slid: me.slid,
    };
    if (data.id) {
      const { data: row } = await sb.from("cal_events").select("owner_slid").eq("id", data.id).maybeSingle();
      if (!row) throw new Error("Termin nicht gefunden.");
      if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
      const { data: u, error } = await sb.from("cal_events").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("cal_events").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const calDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("cal_events").select("owner_slid").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Termin nicht gefunden.");
    if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
    const { error } = await sb.from("cal_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// ---- ICS export ----
function pad(n: number) { return String(n).padStart(2, "0"); }
function toIcsDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function esc(s: string | null | undefined) {
  return String(s ?? "").replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export const calExportIcs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("cal_events").select("*").order("starts_at");
    if (error) throw new Error(error.message);
    const visible = (rows ?? []).filter((e) =>
      me.isSuperuser || e.visibility === "all" || e.visibility === "team" || e.owner_slid === me.slid,
    );
    const now = toIcsDate(new Date());
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//xSyna Central//SynCal//DE", "CALSCALE:GREGORIAN",
      ...visible.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:${e.id}@xsyna.central`,
        `DTSTAMP:${now}`,
        `DTSTART:${toIcsDate(new Date(e.starts_at))}`,
        `DTEND:${toIcsDate(new Date(e.ends_at))}`,
        `SUMMARY:${esc(e.title)}`,
        e.description ? `DESCRIPTION:${esc(e.description)}` : "",
        e.location ? `LOCATION:${esc(e.location)}` : "",
        "END:VEVENT",
      ].filter(Boolean)),
      "END:VCALENDAR",
    ];
    return { filename: `xsyna-syncal-${Date.now()}.ics`, content: lines.join("\r\n") };
  });

// ---- ICS import ----
export const calImportIcs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ ics: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const events = parseIcs(data.ics);
    if (events.length === 0) return { inserted: 0 };
    const payload = events.map((e) => ({
      owner_slid: me.slid,
      title: e.title || "Imported",
      description: e.description || null,
      location: e.location || null,
      starts_at: e.starts_at, ends_at: e.ends_at,
      all_day: false, visibility: "private" as const,
    }));
    const { error } = await sb.from("cal_events").insert(payload);
    if (error) throw new Error(error.message);
    return { inserted: payload.length };
  });

function parseIcs(ics: string) {
  const out: { title?: string; description?: string; location?: string; starts_at: string; ends_at: string }[] = [];
  const blocks = ics.replace(/\r\n[ \t]/g, "").split(/BEGIN:VEVENT/i).slice(1);
  for (const blk of blocks) {
    const body = blk.split(/END:VEVENT/i)[0];
    const get = (k: string) => {
      const m = body.match(new RegExp(`(?:^|\\n)${k}(?:;[^:]*)?:(.+)`, "i"));
      return m ? m[1].trim() : undefined;
    };
    const ds = get("DTSTART"); const de = get("DTEND");
    if (!ds || !de) continue;
    out.push({
      title: get("SUMMARY"), description: get("DESCRIPTION"), location: get("LOCATION"),
      starts_at: icsToIso(ds), ends_at: icsToIso(de),
    });
  }
  return out;
}
function icsToIso(s: string) {
  // 20260101T120000Z or 20260101
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return new Date().toISOString();
  const [, y, mo, d, hh = "00", mm = "00", ss = "00"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss)).toISOString();
}
