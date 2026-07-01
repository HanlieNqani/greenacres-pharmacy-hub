import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { formatZAR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Greenacres Pharmacy" }] }),
  component: ReportsPage,
});

const reports = [
  "Daily Sales", "Weekly Sales", "Monthly Revenue", "Medicine Inventory",
  "Expired Medicines", "Low Stock", "Prescription Report",
  "Customer Purchases", "Pharmacist Performance", "Profit & Loss", "VAT Summary",
];

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports-data"],
    queryFn: async () => {
      const [{ data: sales }, { data: items }] = await Promise.all([
        supabase.from("sales").select("total,payment_method,created_at"),
        supabase.from("sale_items").select("medicine_name,line_total"),
      ]);

      const byDay = new Map<string, number>();
      (sales ?? []).forEach((s) => {
        const d = new Date(s.created_at).toLocaleDateString("en-ZA", { weekday: "short" });
        byDay.set(d, (byDay.get(d) ?? 0) + Number(s.total));
      });
      const daily = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ day: d, total: Math.round(byDay.get(d) ?? 0) }));

      const byPay = new Map<string, number>();
      (sales ?? []).forEach((s) => byPay.set(s.payment_method, (byPay.get(s.payment_method) ?? 0) + Number(s.total)));
      const payments = [...byPay.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));

      const byMed = new Map<string, number>();
      (items ?? []).forEach((i) => byMed.set(i.medicine_name, (byMed.get(i.medicine_name) ?? 0) + Number(i.line_total)));
      const topRev = [...byMed.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 6);

      return { daily, payments, topRev };
    },
  });

  const colors = ["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#0EA5E9"];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate, print, and export reports for management." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Sales by day (this week)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="day" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(v: number) => formatZAR(v)} />
                <Bar dataKey="total" fill="#16A34A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment methods</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.payments ?? []} dataKey="value" nameKey="name" outerRadius={90}>
                  {(data?.payments ?? []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
                <Tooltip formatter={(v: number) => formatZAR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Revenue by top medicines</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topRev ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                <YAxis type="category" dataKey="name" width={160} fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatZAR(v)} />
                <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Downloadable reports</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <div key={r} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileText className="h-4 w-4" /></div>
                <div className="text-sm font-medium">{r}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={`Export ${r} PDF`}><FileDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Export ${r} Excel`}><FileSpreadsheet className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
