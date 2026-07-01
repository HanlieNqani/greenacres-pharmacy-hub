import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatZAR, formatDateTime } from "@/lib/format";
import { Plus, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Sales — Greenacres Pharmacy" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { data: sales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await supabase.from("sales").select("*, customers(full_name)").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Point-of-sale transactions across the pharmacy." actions={
        <Button><Plus className="mr-2 h-4 w-4" />New Sale</Button>
      } />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Today's Sales", value: formatZAR((sales ?? []).filter((s: any) => new Date(s.created_at).toDateString() === new Date().toDateString()).reduce((a: number, s: any) => a + Number(s.total), 0)) },
          { label: "Transactions", value: (sales ?? []).length },
          { label: "Avg Sale", value: formatZAR((sales ?? []).length ? (sales ?? []).reduce((a: number, s: any) => a + Number(s.total), 0) / (sales ?? []).length : 0) },
          { label: "Refunds", value: 0 },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <div className="text-xs uppercase text-muted-foreground">{k.label}</div>
            <div className="mt-2 text-xl font-semibold">{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Pharmacist</th>
                <th className="px-4 py-3 text-left font-medium">Payment</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(sales ?? []).map((s: any) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.invoice_number}</td>
                  <td className="px-4 py-3">{s.customers?.full_name ?? "Walk-in"}</td>
                  <td className="px-4 py-3">{s.pharmacist_name}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{s.payment_method.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3"><Badge className="bg-primary-soft text-primary capitalize">{s.payment_status}</Badge></td>
                  <td className="px-4 py-3 text-right font-medium">{formatZAR(s.total)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTime(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
