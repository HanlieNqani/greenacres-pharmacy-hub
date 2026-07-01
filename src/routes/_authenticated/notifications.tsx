import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Greenacres Pharmacy" }] }),
  component: NotificationsPage,
});

const iconFor = (l: string) => {
  if (l === "error") return { Icon: XCircle, cls: "text-destructive bg-destructive/10" };
  if (l === "warning") return { Icon: AlertTriangle, cls: "text-warning-foreground bg-warning/20" };
  if (l === "success") return { Icon: CheckCircle2, cls: "text-primary bg-primary-soft" };
  return { Icon: Info, cls: "text-secondary bg-secondary-soft" };
};

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notes } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Alerts, warnings, and system events." actions={
        <Button variant="outline" onClick={markAll}>Mark all as read</Button>
      } />

      <Card className="divide-y divide-border">
        {(notes ?? []).map((n) => {
          const { Icon, cls } = iconFor(n.level);
          return (
            <div key={n.id} className={"flex items-start gap-4 p-4 " + (n.read ? "opacity-70" : "")}>
              <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " + cls}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="truncate font-medium text-foreground">{n.title}</div>
                  <div className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                </div>
                {n.message && <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>}
              </div>
            </div>
          );
        })}
        {!notes?.length && <div className="p-10 text-center text-sm text-muted-foreground">All clear — no notifications.</div>}
      </Card>
    </div>
  );
}
