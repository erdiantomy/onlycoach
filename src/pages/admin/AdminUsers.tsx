import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logAdminAction } from "@/lib/adminAudit";
import { toast } from "sonner";

type AppRole = "admin" | "coach" | "mentee";

interface Row {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  follower_count: number;
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const { data: users = [] } = useQuery<Row[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url, bio, created_at, follower_count")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Row[];
    },
  });

  const { data: openRoles = [] } = useQuery<AppRole[]>({
    queryKey: ["admin-user-roles", open?.id],
    enabled: !!open?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", open!.id);
      return (data ?? []).map((r: { role: AppRole }) => r.role);
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => u.display_name?.toLowerCase().includes(s) || u.handle?.toLowerCase().includes(s));
  }, [users, q]);

  const toggleRole = async (role: AppRole) => {
    if (!open) return;
    const has = openRoles.includes(role);
    if (has) {
      if (!confirm(`Revoke "${role}" from ${open.display_name}?`)) return;
      await supabase.from("user_roles").delete().eq("user_id", open.id).eq("role", role);
      await logAdminAction({ action: "role.revoke", target_table: "user_roles", target_id: open.id, payload: { role } });
      toast.success(`Revoked ${role}`);
    } else {
      await supabase.from("user_roles").insert({ user_id: open.id, role });
      await logAdminAction({ action: "role.grant", target_table: "user_roles", target_id: open.id, payload: { role } });
      toast.success(`Granted ${role}`);
    }
    qc.invalidateQueries({ queryKey: ["admin-user-roles", open.id] });
  };

  return (
    <AdminShell title="Users" subtitle={`${users.length} most recent`}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or handle…" className="mb-4 max-w-md border-2 border-ink" />
      <div className="overflow-x-auto border-2 border-ink">
        <table className="w-full text-sm">
          <thead className="bg-ink text-ink-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Handle</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2 text-left">Followers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr
                key={u.id}
                onClick={() => setOpen(u)}
                className={`cursor-pointer border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"} hover:bg-accent/30`}
              >
                <td className="flex items-center gap-2 px-3 py-2">
                  {u.avatar_url && <img src={u.avatar_url} alt="" className="h-7 w-7 border-2 border-ink object-cover" />}
                  <span className="font-medium">{u.display_name}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">@{u.handle}</td>
                <td className="px-3 py-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">{u.follower_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="border-2 border-ink">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{open?.display_name}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4 text-sm">
              <div className="text-xs text-muted-foreground">UUID: {open.id}</div>
              {open.bio && <p>{open.bio}</p>}
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Roles</div>
                <div className="flex flex-wrap gap-2">
                  {(["admin", "coach", "mentee"] as AppRole[]).map((r) => {
                    const has = openRoles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        onClick={() => toggleRole(r)}
                        className={`border-2 border-ink ${has ? "bg-ink text-ink-foreground" : "bg-surface text-ink"}`}
                      >
                        {has ? `✓ ${r}` : r}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
