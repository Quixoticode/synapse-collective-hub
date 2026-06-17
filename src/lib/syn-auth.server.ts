// Shared server-side helper: verify SLID+PIK and load role flags.
// Kept in a .server.ts file so it can be imported from *.functions.ts handlers
// without leaking into the client bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export function requireHl(actor: SynActor, hl: number) {
  if (actor.isSuperuser) return;
  if (actor.hl < hl) throw new Error(`Hierarchie-Level ${hl}+ erforderlich.`);
}

export function requireSuperuser(actor: SynActor) {
  if (!actor.isSuperuser) throw new Error("Superuser-Rechte erforderlich.");
}
