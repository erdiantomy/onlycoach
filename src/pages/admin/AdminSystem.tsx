import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logAdminAction } from "@/lib/adminAudit";
import { toast } from "sonner";

type AppRole = "admin" | "coach" | "mentee";

interface RoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  display_name: string;
  handle: string;
}
interface AuditRow {
  id: string;
  admin_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  payload: unknown;
  created_at: string;
  admin_handle: string;
}

export default function AdminSystem() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"roles" | "audit">("roles");
  const [grantUid, setGrantUid] = useState("");
  const [grantRole, setGrantRole] = useState<AppRole>("admin");

  const { data: roles = [] } = useQuery<RoleRow[]>({
    queryKey: ["admin-roles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("id, user_id, role, created_at").order("created_at", { ascending: false }).limit(500);
      const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name, handle").in("id", ids)
        : { data: [] as { id: string; display_name: string; handle: string }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((r) => ({
        ...r,
        display_name: m.get(r.user_id)?.display_name ?? "—",
        handle: m.get(r.user_id)?.handle ?? "—",
      })) as RoleRow[];
    },
  });

  const { data: audit = [] } = useQuery<AuditRow[]>({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      const ids = Array.from(new Set((data ?? []).map((r) => r.admin_id).filter(Boolean) as string[]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, handle").in("id", ids)
        : { data: [] as { id: string; handle: string }[] };
      const m = new Map((profs ?? []).map((p) => [p.id, p.handle]));
      return (data ?? []).map((r) => ({ ...r, admin_handle: r.admin_id ? m.get(r.admin_id) ?? "—" : "—" })) as AuditRow[];
    },
  });

  const grant = async () => {
    if (!grantUid) return toast.error("UUID required");
    const { error } = await supabase.from("user_roles").insert({ user_id: grantUid, role: grantRole });
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "role.grant", target_table: "user_roles", target_id: grantUid, payload: { role: grantRole } });
    toast.success(`Granted ${grantRole}`);
    setGrantUid("");
    qc.invalidateQueries({ queryKey: ["admin-roles-all"] });
  };

  const revoke = async (row: RoleRow) => {
    if (!confirm(`Revoke ${row.role} from @${row.handle}?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    await logAdminAction({ action: "role.revoke", target_table: "user_roles", target_id: row.user_id, payload: { role: row.role } });
    qc.invalidateQueries({ queryKey: ["admin-roles-all"] });
  };

  return (
    <AdminShell title="System">
      <div className="mb-4 flex gap-2">
        {(["roles", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase ${tab === t ? "bg-ink text-ink-foreground" : "bg-surface"}`}
          >
            {t === "roles" ? "User roles" : "Audit log"}
          </button>
        ))}
      </div>

      {tab === "roles" ? (
        <>
          <div className="brutal-card-sm mb-4 p-4">
            <h3 className="mb-2 font-display text-sm uppercase tracking-wide">Grant role</h3>
            <div className="flex flex-wrap gap-2">
              <Input value={grantUid} onChange={(e) => setGrantUid(e.target.value)} placeholder="User UUID" className="max-w-md border-2 border-ink" />
              <select
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value as AppRole)}
                className="border-2 border-ink bg-surface px-3 py-2 text-sm"
              >
                <option value="admin">admin</option>
                <option value="coach">coach</option>
                <option value="mentee">mentee</option>
              </select>
              <Button onClick={grant} className="border-2 border-ink bg-ink text-ink-foreground">Grant</Button>
            </div>
          </div>
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Granted</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={r.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                    <td className="px-3 py-2">
                      {r.display_name} <span className="text-xs text-muted-foreground">@{r.handle}</span>
                    </td>
                    <td className="px-3 py-2"><span className="brutal-tag">{r.role}</span></td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" onClick={() => revoke(r)} className="border-2 border-ink bg-destructive text-destructive-foreground">
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Target</th>
                <th className="px-3 py-2 text-left">Payload</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={a.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">@{a.admin_handle}</td>
                  <td className="px-3 py-2"><span className="brutal-tag">{a.action}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {a.target_table}
                    {a.target_id ? ` / ${a.target_id.slice(0, 8)}…` : ""}
                  </td>
                  <td className="max-w-md truncate px-3 py-2 font-mono text-xs">{a.payload ? JSON.stringify(a.payload) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
