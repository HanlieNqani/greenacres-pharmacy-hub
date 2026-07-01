import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Mail } from "lucide-react";
import { formatZAR, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Greenacres Pharmacy" }] }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { data: sales } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("sales").select("*, customers(full_name), sale_items(*)").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Auto-generated invoices for every completed sale." />
      <div className="grid gap-4">
        {(sales ?? []).map((s: any) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-muted-foreground">{s.invoice_number}</div>
                <div className="mt-0.5 text-base font-semibold">{s.customers?.full_name ?? "Walk-in customer"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(s.created_at)} · Served by {s.pharmacist_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{s.payment_method.replace("_", " ")}</Badge>
                <Badge className="bg-primary-soft text-primary capitalize">{s.payment_status}</Badge>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Medicine</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(s.sale_items ?? []).map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2">{it.medicine_name}</td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatZAR(it.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatZAR(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />PDF</Button>
                <Button size="sm" variant="outline"><Mail className="mr-2 h-4 w-4" />Email</Button>
              </div>
              <div className="text-right text-sm">
                <div className="text-muted-foreground">Subtotal: <span className="text-foreground">{formatZAR(s.subtotal)}</span></div>
                <div className="text-muted-foreground">VAT (15%): <span className="text-foreground">{formatZAR(s.vat)}</span></div>
                <div className="mt-1 text-lg font-semibold">{formatZAR(s.total)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
