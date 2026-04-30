import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "./AdminShell";
import { cn } from "@/lib/utils";

type EmailTab = "send_log" | "webhooks";

interface EmailLog {
  id: string;
  to_address: string;
  template: string;
  status: string;
  sent_at: string | null;
  error: string | null;
}

interface WebhookEvent {
  id: string;
  provider: string;
  event_type: string | null;
  processed_at: string;
}

const AdminEmails = () => {
  const [tab, setTab] = useState<EmailTab>("send_log");
  const [search, setSearch] = useState("");

  const { data: emailLogs = [], isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ["admin-email-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_send_log")
        .select("id, to_address, template, status, sent_at, error")
        .order("sent_at", { ascending: false, nullsFirst: true })
        .limit(300);
      return (data ?? []) as EmailLog[];
    },
  });

  const { data: webhookEvents = [], isLoading: webhooksLoading } = useQuery<WebhookEvent[]>({
    queryKey: ["admin-webhook-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("processed_webhook_events")
        .select("id, provider, event_type, processed_at")
        .order("processed_at", { ascending: false })
        .limit(300);
      return (data ?? []) as WebhookEvent[];
    },
  });

  const filteredLogs = emailLogs.filter(
    (e) =>
      e.to_address.toLowerCase().includes(search.toLowerCase()) ||
      e.template.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredWebhooks = webhookEvents.filter(
    (e) =>
      e.provider.toLowerCase().includes(search.toLowerCase()) ||
      (e.event_type ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const statusColor: Record<string, string> = {
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    queued: "bg-blue-100 text-blue-800",
  };

  return (
    <AdminShell>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl">Emails & Webhooks</h2>
        <input
          className="brutal-input w-full sm:w-64"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4 flex gap-1">
        {(["send_log", "webhooks"] as EmailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide",
              tab === t ? "bg-ink text-ink-foreground" : "bg-surface hover:bg-accent/40",
            )}
          >
            {t === "send_log" ? "Email Send Log" : "Webhook Events"}
          </button>
        ))}
      </div>

      {tab === "send_log" && (
        logsLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">To</th>
                  <th className="px-3 py-2 text-left">Template</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Sent At</th>
                  <th className="px-3 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((e, i) => (
                  <tr key={e.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2 font-mono text-xs">{e.to_address}</td>
                    <td className="px-3 py-2">{e.template}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold uppercase", statusColor[e.status] ?? "bg-muted")}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.sent_at ? new Date(e.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-xs text-destructive">
                      {e.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "webhooks" && (
        webhooksLoading ? (
          <div className="brutal-card-sm p-8 text-center text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-ink-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Event Type</th>
                  <th className="px-3 py-2 text-left">Processed At</th>
                </tr>
              </thead>
              <tbody>
                {filteredWebhooks.map((e, i) => (
                  <tr key={e.id} className={cn("border-t border-ink/30", i % 2 === 0 ? "bg-surface" : "bg-background")}>
                    <td className="px-3 py-2 font-mono text-xs max-w-[160px] truncate">{e.id}</td>
                    <td className="px-3 py-2 uppercase font-semibold">{e.provider}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.event_type ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(e.processed_at).toLocaleString()}
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

export default AdminEmails;
