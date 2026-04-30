import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminShell from "./AdminShell";
import { Input } from "@/components/ui/input";

interface EmailLog {
  id: string;
  recipient_email: string;
  template_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
}
interface Webhook {
  id: string;
  provider: string;
  event_type: string | null;
  processed_at: string;
}

export default function AdminEmails() {
  const [tab, setTab] = useState<"log" | "webhooks">("log");
  const [q, setQ] = useState("");

  const { data: logs = [] } = useQuery<EmailLog[]>({
    queryKey: ["admin-email-log"],
    queryFn: async () => {
      const { data } = await supabase.from("email_send_log").select("*").order("created_at", { ascending: false }).limit(500);
      return (data ?? []) as EmailLog[];
    },
  });

  const { data: hooks = [] } = useQuery<Webhook[]>({
    queryKey: ["admin-webhooks"],
    queryFn: async () => {
      const { data } = await supabase.from("processed_webhook_events").select("*").order("processed_at", { ascending: false }).limit(500);
      return (data ?? []) as Webhook[];
    },
  });

  const fLogs = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? logs.filter((l) => l.recipient_email.toLowerCase().includes(s) || l.template_name.toLowerCase().includes(s)) : logs;
  }, [logs, q]);
  const fHooks = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? hooks.filter((h) => h.id.toLowerCase().includes(s) || h.provider.toLowerCase().includes(s) || (h.event_type ?? "").toLowerCase().includes(s)) : hooks;
  }, [hooks, q]);

  return (
    <AdminShell title="Emails & Webhooks">
      <div className="mb-4 flex gap-2">
        {(["log", "webhooks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-2 border-ink px-3 py-1.5 text-xs font-semibold uppercase ${tab === t ? "bg-ink text-ink-foreground" : "bg-surface"}`}
          >
            {t === "log" ? "Email send log" : "Webhook events"}
          </button>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-4 max-w-md border-2 border-ink" />

      {tab === "log" ? (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">To</th>
                <th className="px-3 py-2 text-left">Template</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Sent</th>
                <th className="px-3 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {fLogs.map((l, i) => (
                <tr key={l.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2">{l.recipient_email}</td>
                  <td className="px-3 py-2">{l.template_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        l.status === "sent" ? "bg-green-200 text-green-900" : l.status === "failed" || l.status === "dlq" ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">{l.error_message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <table className="w-full text-sm">
            <thead className="bg-ink text-ink-foreground">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Provider</th>
                <th className="px-3 py-2 text-left">Event</th>
                <th className="px-3 py-2 text-left">Processed</th>
              </tr>
            </thead>
            <tbody>
              {fHooks.map((h, i) => (
                <tr key={h.id} className={`border-t-2 border-ink/20 ${i % 2 ? "bg-background" : "bg-surface"}`}>
                  <td className="px-3 py-2 font-mono text-xs">{h.id}</td>
                  <td className="px-3 py-2">{h.provider}</td>
                  <td className="px-3 py-2">{h.event_type ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(h.processed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
