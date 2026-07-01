import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Search, Printer, AlertTriangle } from "lucide-react";
import { formatZAR, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Greenacres Pharmacy" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name").order("name")).data ?? [],
  });

  const { data: medicines, refetch } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => (await supabase.from("medicines").select("*, categories(name), suppliers(name)").order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!medicines) return [];
    return medicines.filter((m: any) => {
      const q = search.toLowerCase();
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.generic_name?.toLowerCase().includes(q) || m.barcode?.includes(q) || m.batch_number?.toLowerCase().includes(q);
      const matchC = category === "all" || m.category_id === category;
      const today = new Date();
      const isExpired = m.expiry_date && new Date(m.expiry_date) < today;
      const isLow = m.quantity <= m.reorder_level;
      const matchS = status === "all"
        || (status === "low" && isLow && !isExpired)
        || (status === "expired" && isExpired)
        || (status === "active" && !isExpired && !isLow);
      return matchQ && matchC && matchS;
    });
  }, [medicines, search, category, status]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Generic", "Category", "Supplier", "Qty", "Cost", "Selling", "Batch", "Expiry", "Barcode", "Location"],
      ...filtered.map((m: any) => [m.name, m.generic_name, m.categories?.name, m.suppliers?.name, m.quantity, m.cost_price, m.selling_price, m.batch_number, m.expiry_date, m.barcode, m.storage_location]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inventory.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory exported");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Real-time medicine stock, batches, and expiries."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
            <Button onClick={() => toast.info("Add-medicine form coming in next iteration.")}><Plus className="mr-2 h-4 w-4" />Add Medicine</Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, generic, batch, barcode…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search medicines" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]" aria-label="Category filter"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]" aria-label="Status filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Healthy stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Medicine</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Batch</th>
                <th className="px-4 py-3 text-left font-medium">Expiry</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m: any) => {
                const isExpired = m.expiry_date && new Date(m.expiry_date) < new Date();
                const isLow = m.quantity <= m.reorder_level;
                return (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.generic_name}</div>
                    </td>
                    <td className="px-4 py-3">{m.categories?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.batch_number ?? "—"}</td>
                    <td className="px-4 py-3">{formatDate(m.expiry_date)}</td>
                    <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatZAR(m.selling_price)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.storage_location ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isExpired ? <Badge variant="destructive">Expired</Badge>
                        : isLow ? <Badge className="bg-warning text-warning-foreground"><AlertTriangle className="mr-1 h-3 w-3" />Low</Badge>
                        : <Badge className="bg-primary-soft text-primary">In stock</Badge>}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">No medicines match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
