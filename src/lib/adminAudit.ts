import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(opts: {
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("admin_audit_log").insert({
    admin_id: u.user?.id,
    action: opts.action,
    target_table: opts.target_table ?? null,
    target_id: opts.target_id ?? null,
    payload: (opts.payload ?? null) as never,
  });
}
