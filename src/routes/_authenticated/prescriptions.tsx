import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  head: () => ({ meta: [{ title: "Prescriptions — Greenacres Pharmacy" }] }),
  component: PrescriptionsPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  dispensing: "bg-secondary-soft text-secondary",
  completed: "bg-primary-soft text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

function PrescriptionsPage() {
  const { data: rxs } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => (await supabase
      .from("prescriptions")
      .select("*, customers(full_name), doctors(full_name, department), prescription_items(*)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Prescriptions" description="Digital prescription workflow: pending → dispensing → completed." actions={
        <>
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Upload Rx</Button>
          <Button><Plus className="mr-2 h-4 w-4" />New Prescription</Button>
        </>
      } />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(rxs ?? []).map((rx: any) => (
          <Card key={rx.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{rx.code}</div>
                <div className="mt-0.5 text-base font-semibold">{rx.customers?.full_name ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {rx.doctors?.full_name} · {rx.doctors?.department}
                </div>
              </div>
              <Badge className={"capitalize " + (statusStyles[rx.status] ?? "")}>{rx.status}</Badge>
            </div>
            <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="text-xs text-muted-foreground">Diagnosis</div>
              <div className="mt-0.5 font-medium">{rx.diagnosis ?? "—"}</div>
            </div>
            <div className="mt-3 space-y-1.5">
              {(rx.prescription_items ?? []).map((it: any) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{it.medicine_name}</span>
                  <span className="text-xs text-muted-foreground">{it.dosage} · {it.frequency} · {it.duration}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>{formatDate(rx.created_at)}</span>
              <Button size="sm" variant="ghost">View</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
