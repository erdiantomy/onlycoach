import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  follower_count: number;
}

interface UserRole {
  role: string;
}

interface UserDetail extends Profile {
  roles: UserRole[];
}

const AdminUsers = () => {
  const { user: adminUser } = useSession();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserDetail | null>(null);

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, handle, bio, avatar_url, created_at, follower_count")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const openDetail = async (p: Profile) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", p.id);
    setSelected({ ...p, roles: roles ?? [] });
  };

  const grantRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").insert({ user_id: userId, role: role as "admin" | "coach" | "mentee" });
      await supabase.from("admin_audit_log").insert({
        admin_id: adminUser!.id,
        action: "grant_role",
        target_table: "user_roles",
        target_id: userId,
        payload: { role },
      });
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      if (selected?.id === userId) {
        openDetail(selected);
      }
      toast.success("Role granted");
    },
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
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      if (selected?.id === userId) {
        openDetail(selected);
      }
      toast.success("Role revoked");
    },
  });

  const filtered = profiles.filter(
    (p) =>
      p.display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.handle.toLowerCase().includes(search.toLowerCase()),
  );

  const ROLES: Array<"admin" | "coach" | "mentee"> = ["admin", "coach", "mentee"];

  return (
    <AdminShell>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl">All Users ({profiles.length})</h2>
        <input
          className="brutal-input w-full sm:w-64"
          placeholder="Search name or handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Handle</th>
                <th className="px-3 py-2 text-left">Joined</th>
                <th className="px-3 py-2 text-left">Followers</th>
                <th className="px-3 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 border border-ink bg-accent overflow-hidden">
                        {p.avatar_url && <img src={p.avatar_url} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <span className="font-medium">{p.display_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">@{p.handle}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{p.follower_count}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => openDetail(p)} className="brutal-tag text-xs">
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="brutal-card w-full max-w-md bg-background p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl">{selected.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{selected.handle}</p>
                {selected.bio && <p className="mt-1 text-sm">{selected.bio}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="brutal-tag text-xs">✕</button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Roles</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const hasRole = selected.roles.some((r) => r.role === role);
                return (
                  <button
                    key={role}
                    onClick={() => {
                      if (hasRole) {
                        revokeRole.mutate({ userId: selected.id, role });
                        setSelected((s) => s ? { ...s, roles: s.roles.filter((r) => r.role !== role) } : s);
                      } else {
                        grantRole.mutate({ userId: selected.id, role });
                        setSelected((s) => s ? { ...s, roles: [...s.roles, { role }] } : s);
                      }
                    }}
                    className={cn(
                      "border-2 border-ink px-3 py-1 text-xs font-semibold uppercase",
                      hasRole ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
                    )}
                  >
                    {hasRole ? `✓ ${role}` : `+ ${role}`}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Joined: {new Date(selected.created_at).toLocaleDateString()}</span>
              <span>Followers: {selected.follower_count}</span>
              <span className="col-span-2 font-mono text-[10px] break-all">ID: {selected.id}</span>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full border-2 border-ink"
              onClick={() => setSelected(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminUsers;
