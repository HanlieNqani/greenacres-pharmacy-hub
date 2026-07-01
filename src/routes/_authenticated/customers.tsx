import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { formatZAR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — Greenacres Pharmacy" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await supabase.from("customers").select("*").order("full_name")).data ?? [],
  });

  const filtered = useMemo(() =>
    (customers ?? []).filter((c: any) =>
      !q || c.full_name.toLowerCase().includes(q.toLowerCase()) || c.code?.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q) || c.medical_aid?.toLowerCase().includes(q.toLowerCase())
    ), [customers, q]);

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Patient profiles, medical aid, and history." actions={
        <Button><Plus className="mr-2 h-4 w-4" />New Customer</Button>
      } />

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customer name, code, phone, medical aid…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search customers" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c: any) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{c.code}</div>
                <div className="mt-0.5 text-base font-semibold text-foreground">{c.full_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.phone} · {c.gender}</div>
              </div>
              <Badge variant={c.medical_aid === "Cash Patient" ? "outline" : "secondary"} className="shrink-0">
                {c.medical_aid ?? "None"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Chronic</div>
                <div className="mt-0.5 font-medium">{c.chronic_conditions ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Allergies</div>
                <div className="mt-0.5 font-medium">{c.allergies ?? "None"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Balance</div>
                <div className="mt-0.5 font-medium">{formatZAR(c.outstanding_balance)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Aid #</div>
                <div className="mt-0.5 font-mono">{c.medical_aid_number ?? "—"}</div>
              </div>
            </div>
          </Card>
        ))}
        {!filtered.length && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No customers match your search.
          </div>
        )}
      </div>
    </div>
  );
}
