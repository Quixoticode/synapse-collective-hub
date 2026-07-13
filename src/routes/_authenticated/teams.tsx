import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UsersRound, ArrowLeft, Plus, Trash2, X, Briefcase, Crown, UserPlus2, ChevronRight } from "lucide-react";
import { teamsList, teamUpsert, teamDelete, teamMemberAdd, teamMemberRemove } from "@/lib/teams.functions";
import { employeesList } from "@/lib/syn.functions";
import { applyPositionUpsert } from "@/lib/apply.functions";
import { myPermissions } from "@/lib/permissions.functions";
import { getCredentials, getSession } from "@/lib/syn-session";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/_authenticated/teams")({
  ssr: false,
  component: TeamsPage,
});

type Team = { id: string; name: string; parent_id: string | null; min_hl: number | null; description: string | null; leader_slid: string | null };
type Member = { id: string; team_id: string; slid: string; role: string | null; hl_at_join: number | null };
type Emp = { slid: string; name: string; hl: number };

function TeamsPage() {
  const session = getSession();
  const listFn = useServerFn(teamsList);
  const upsertFn = useServerFn(teamUpsert);
  const delFn = useServerFn(teamDelete);
  const addFn = useServerFn(teamMemberAdd);
  const remFn = useServerFn(teamMemberRemove);
  const lookupFn = useServerFn(employeesList);
  const positionFn = useServerFn(applyPositionUpsert);
  const permsFn = useServerFn(myPermissions);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [emps, setEmps] = useState<Record<string, Emp>>({});
  const [edit, setEdit] = useState<Partial<Team> | null>(null);
  const [memberFor, setMemberFor] = useState<Team | null>(null);
  const [addSlid, setAddSlid] = useState(""); const [addRole, setAddRole] = useState("");
  const [postFor, setPostFor] = useState<Team | null>(null);
  const [postPos, setPostPos] = useState({ position: "", hl_max: 3, description: "" });
  const [err, setErr] = useState<string | null>(null);
  const [allowedFeatures, setAllowedFeatures] = useState<Set<string>>(new Set());

  const canManage = !!session?.isSuperuser || allowedFeatures.has("teams.manage");

  async function reload() {
    const c = getCredentials(); if (!c) return;
    setErr(null);
    try {
      const feats = await permsFn({ data: c }) as { features: string[] };
      setAllowedFeatures(new Set(feats.features));
      const r = await listFn({ data: c }) as unknown as { teams: Team[]; members: Member[] };
      setTeams(r.teams); setMembers(r.members);
      try {
        const all = await lookupFn({ data: c }) as Emp[];
        const map: Record<string, Emp> = {};
        for (const e of all) map[e.slid] = e;
        setEmps(map);
      } catch { /* no teams.manage — employee lookup unavailable, skip name resolution */ }
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const membersByTeam = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) { const a = map.get(m.team_id) ?? []; a.push(m); map.set(m.team_id, a); }
    return map;
  }, [members]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Team[]>();
    for (const t of teams) {
      const k = t.parent_id;
      const a = map.get(k) ?? []; a.push(t); map.set(k, a);
    }
    return map;
  }, [teams]);

  async function saveTeam() {
    if (!edit?.name) return;
    const c = getCredentials(); if (!c) return;
    try {
      await upsertFn({ data: {
        ...c, id: edit.id, name: edit.name!,
        parent_id: edit.parent_id || null,
        min_hl: edit.min_hl ?? null,
        description: edit.description || null,
        leader_slid: edit.leader_slid || null,
      } });
      setEdit(null); await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  async function addMember() {
    if (!memberFor || !addSlid.trim()) return;
    const c = getCredentials(); if (!c) return;
    try {
      await addFn({ data: { ...c, team_id: memberFor.id, target_slid: addSlid.trim(), role: addRole.trim() || null } });
      setAddSlid(""); setAddRole(""); await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  async function postPosition() {
    if (!postFor || !postPos.position.trim()) return;
    const c = getCredentials(); if (!c) return;
    try {
      await positionFn({ data: {
        ...c, department: postFor.name, team: postFor.name,
        position: postPos.position, hl_max: postPos.hl_max,
        description: postPos.description || null, open: true,
      } });
      setPostFor(null); setPostPos({ position: "", hl_max: 3, description: "" });
      alert("Stelle wurde in Applyance veröffentlicht.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Fehler."); }
  }

  function renderTree(parentId: string | null, depth: number): React.ReactNode {
    const list = childrenOf.get(parentId) ?? [];
    if (list.length === 0) return null;
    return list.map((t) => {
      const mems = membersByTeam.get(t.id) ?? [];
      const leader = t.leader_slid ? emps[t.leader_slid] : null;
      const isTeamLeader = session?.slid === t.leader_slid;
      const canEditMembers = canManage || isTeamLeader;
      return (
        <div key={t.id} style={{ marginLeft: depth * 16 }}>
          <div className="syn-card p-3 space-y-2 mb-2">
            <div className="flex items-start gap-2">
              {depth > 0 && <ChevronRight className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold truncate">{t.name}</span>
                </div>
                {leader && (
                  <div className="text-[11px] mt-1 flex items-center gap-1">
                    <Crown className="h-3 w-3" style={{ color: "var(--neural-mint)" }} />
                    <span>Leitung:</span> <span className="mono">{leader.name}</span>
                  </div>
                )}
                {t.description && <div className="mt-2 text-xs"><Markdown>{t.description}</Markdown></div>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {canManage && <button onClick={() => setEdit(t)} className="syn-btn-ghost text-xs">Edit</button>}
                {canManage && (
                  <button onClick={async () => { if (!confirm("Team löschen?")) return; const c = getCredentials(); if (!c) return; await delFn({ data: { ...c, id: t.id } }); await reload(); }} className="syn-btn-ghost text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {canManage && (
                  <button onClick={() => setPostFor(t)} className="syn-btn-ghost text-xs">
                    <Briefcase className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="border-t border-border/40 pt-2">
              <div className="text-[11px] uppercase text-muted-foreground mono mb-1">Mitglieder ({mems.length})</div>
              <div className="grid gap-1">
                {mems.map((m) => {
                  const e = emps[m.slid];
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/5">
                      <div className="flex-1 min-w-0 truncate">
                        <span className="mono">{m.slid}</span> · {e?.name || "?"}
                        {m.role && <span className="text-muted-foreground"> — {m.role}</span>}
                      </div>
                      {canEditMembers && (
                        <button onClick={async () => { const c = getCredentials(); if (!c) return; await remFn({ data: { ...c, id: m.id } }); await reload(); }} className="syn-btn-ghost text-xs">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {mems.length === 0 && <div className="text-[11px] text-muted-foreground">Keine Mitglieder.</div>}
              </div>
              {canEditMembers && (
                <button onClick={() => { setMemberFor(t); setAddSlid(""); setAddRole(""); }} className="syn-btn-ghost text-xs mt-2">
                  <UserPlus2 className="h-3.5 w-3.5" /> Mitglied hinzufügen
                </button>
              )}
            </div>
          </div>
          {renderTree(t.id, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 md:pb-8">
      <header className="mb-4 flex items-center gap-3">
        <UsersRound className="h-6 w-6" style={{ color: "var(--synapse)" }} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Teams</h1>
          <p className="text-xs text-muted-foreground">Frei definierbare Gruppen mit Hierarchie</p>
        </div>
        <Link to="/apps" className="syn-btn-ghost text-xs shrink-0"><ArrowLeft className="h-3.5 w-3.5" /> Apps</Link>
      </header>

      {canManage && (
        <button onClick={() => setEdit({ name: "" })} className="syn-btn mb-4">
          <Plus className="h-4 w-4" /> Neues Team
        </button>
      )}

      {err && <div className="mb-3 text-xs text-destructive mono">{err}</div>}

      <div>
        {teams.length === 0 && <div className="text-sm text-muted-foreground">Noch keine Teams.</div>}
        {renderTree(null, 0)}
      </div>

      {edit && (
        <Modal title={edit.id ? "Team bearbeiten" : "Neues Team"} onClose={() => setEdit(null)}>
          <input className="syn-input" placeholder="Name" value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <select className="syn-input" value={edit.parent_id || ""} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value || null })}>
            <option value="">— Kein Parent (Top-Level) —</option>
            {teams.filter((x) => x.id !== edit.id).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          <input className="syn-input" placeholder="Leiter (SLID)" value={edit.leader_slid || ""} onChange={(e) => setEdit({ ...edit, leader_slid: e.target.value })} />
          <textarea className="syn-input min-h-24" placeholder="Beschreibung (Markdown erlaubt)" value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <button className="syn-btn w-full" onClick={() => void saveTeam()}>Speichern</button>
        </Modal>
      )}

      {memberFor && (
        <Modal title={`Mitglied hinzufügen: ${memberFor.name}`} onClose={() => setMemberFor(null)}>
          <input className="syn-input" placeholder="SLID" value={addSlid} onChange={(e) => setAddSlid(e.target.value)} />
          <input className="syn-input" placeholder="Rolle / Posten (optional)" value={addRole} onChange={(e) => setAddRole(e.target.value)} />
          <button className="syn-btn w-full" onClick={() => void addMember()}>Hinzufügen</button>
        </Modal>
      )}

      {postFor && (
        <Modal title={`Stelle ausschreiben: ${postFor.name}`} onClose={() => setPostFor(null)}>
          <input className="syn-input" placeholder="Position" value={postPos.position} onChange={(e) => setPostPos({ ...postPos, position: e.target.value })} />
          <input className="syn-input" type="number" min={1} max={9} placeholder="HL max" value={String(postPos.hl_max)} onChange={(e) => setPostPos({ ...postPos, hl_max: Number(e.target.value) })} />
          <textarea className="syn-input min-h-20" placeholder="Beschreibung (Markdown)" value={postPos.description} onChange={(e) => setPostPos({ ...postPos, description: e.target.value })} />
          <button className="syn-btn w-full" onClick={() => void postPosition()}>In Applyance veröffentlichen</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className="syn-card w-full max-w-md p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><button onClick={onClose} className="syn-btn-ghost"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>
  );
}
