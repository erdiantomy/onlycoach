import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SystemTab = "roles" | "audit";

interface RoleRow {
  user_id: string;
  role: string;
  display_name: string;
  handle: string;
}

interface AuditRow {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  admin_handle: string;
  created_at: string;
  payload: Record<string, unknown> | null;
}

const AdminSystem = () => {
  const { user: adminUser } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SystemTab>("roles");
  const [newRoleUserId, setNewRoleUserId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "coach" | "mentee">("coach");

  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleRow[]>({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .order("role");
      if (!data?.length) return [];

      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, handle")
        .in("id", userIds);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));

      return data.map((r) => {
        const p = pm.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          display_name: p?.display_name ?? "Unknown",
          handle: p?.handle ?? r.user_id,
        };
      });
    },
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<AuditRow[]>({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, action, target_table, target_id, admin_id, created_at, payload")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!data?.length) return [];

      const adminIds = [...new Set(data.map((r) => r.admin_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, handle")
        .in("id", adminIds as string[]);
      const pm = new Map((profiles ?? []).map((p) => [p.id, p.handle]));

      return data.map((r) => ({
        id: r.id,
        action: r.action,
        target_table: r.target_table,
        target_id: r.target_id,
        admin_handle: r.admin_id ? (pm.get(r.admin_id) ?? r.admin_id) : "system",
        created_at: r.created_at,
        payload: r.payload as Record<string, unknown> | null,
      }));
    },
  });

  const grantRole = useMutation({
    mutationFn: async () => {
      if (!newRoleUserId.trim()) throw new Error("Enter a user ID");
      await supabase.from("user_roles").insert({ user_id: newRoleUserId.trim(), role: newRole });
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "grant_role",
        target_table: "user_roles",
        target_id: newRoleUserId.trim(),
        payload: { role: newRole },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
      setNewRoleUserId("");
      toast.success("Role granted");
    },
    onError: (e) => toast.error(String(e)),
  });

  const revokeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as "admin" | "coach" | "mentee");
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "revoke_role",
        target_table: "user_roles",
        target_id: userId,
        payload: { role },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
      toast.success("Role revoked");
    },
  });

  const roleColor: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    coach: "bg-blue-100 text-blue-800",
    mentee: "bg-green-100 text-green-800",
  };

  return (
    <AdminShell>
      <h2 className="mb-4 font-display text-2xl">System</h2>

      <div className="mb-4 flex gap-1">
        {(["roles", "audit"] as SystemTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide",
              tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
            )}
          >
            {t === "roles" ? "User Roles" : "Audit Log"}
          </button>
        ))}
      </div>

      {tab === "roles" && (
        <>
          {/* Grant role form */}
          <div className="brutal-card-sm mb-4 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide">Grant Role</p>
            <div className="flex flex-wrap gap-2">
              <input
                className="brutal-input flex-1 min-w-[200px]"
                placeholder="User UUID…"
                value={newRoleUserId}
                onChange={(e) => setNewRoleUserId(e.target.value)}
              />
              <select
                className="brutal-input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "coach" | "mentee")}
              >
                <option value="admin">admin</option>
                <option value="coach">coach</option>
                <option value="mentee">mentee</option>
              </select>
              <button
                onClick={() => grantRole.mutate()}
                disabled={grantRole.isPending}
                className="border-2 border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase text-ink-foreground"
              >
                Grant
              </button>
            </div>
          </div>

          {rolesLoading ? (
            <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto border-2 border-ink">
              <table className="w-full text-sm">
                <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">User ID</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r, i) => (
                    <tr key={`${r.user_id}-${r.role}`} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                      <td className="px-3 py-2">
                        <p className="font-medium">{r.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{r.handle}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold uppercase", roleColor[r.role] ?? "bg-muted")}>
                          {r.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{r.user_id}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => { if (confirm(`Revoke ${r.role} from ${r.display_name}?`)) revokeRole.mutate({ userId: r.user_id, role: r.role }); }}
                          className="brutal-tag text-xs text-destructive"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "audit" && (
        auditLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Table</th>
                  <th className="px-3 py-2 text-left">Target ID</th>
                  <th className="px-3 py-2 text-left">Admin</th>
                  <th className="px-3 py-2 text-left">Payload</th>
                  <th className="px-3 py-2 text-left">At</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((r, i) => (
                  <tr key={r.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2 font-semibold">{r.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.target_table ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">
                      {r.target_id ?? "—"}
                    </td>
                    <td className="px-3 py-2">@{r.admin_handle}</td>
                    <td className="px-3 py-2 font-mono text-[10px] max-w-[140px] truncate text-muted-foreground">
                      {r.payload ? JSON.stringify(r.payload) : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </AdminShell>
  );
};

export default AdminSystem;
