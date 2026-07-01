import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, Package, AlertTriangle, CalendarClock, FileText, Users, ShoppingCart,
  Plus, TrendingUp, Activity,
} from "lucide-react";
import { formatZAR, formatNumber, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Greenacres Pharmacy" },
      { name: "description", content: "Key pharmacy metrics, alerts, and analytics at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        salesToday, salesMonth, meds, lowStock, expiring, customers, pendingRx, recentSales,
      ] = await Promise.all([
        supabase.from("sales").select("total").gte("created_at", today.toISOString()),
        supabase.from("sales").select("total").gte("created_at", monthStart.toISOString()),
        supabase.from("medicines").select("id,quantity"),
        supabase.from("medicines").select("id,name,quantity,reorder_level").order("quantity"),
        supabase.from("medicines").select("id,name,expiry_date").lte("expiry_date", new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10)),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("sales").select("invoice_number,total,payment_method,pharmacist_name,created_at,customers(full_name)").order("created_at", { ascending: false }).limit(6),
      ]);

      const todaysTotal = (salesToday.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const monthTotal = (salesMonth.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const totalStock = (meds.data ?? []).reduce((s, r) => s + Number(r.quantity), 0);
      const low = (lowStock.data ?? []).filter((m) => Number(m.quantity) <= Number(m.reorder_level));

      return {
        todaysTotal,
        monthTotal,
        totalStock,
        medicinesCount: meds.data?.length ?? 0,
        lowCount: low.length,
        lowList: low.slice(0, 5),
        expiringCount: expiring.data?.length ?? 0,
        expiringList: (expiring.data ?? []).slice(0, 5),
        customersCount: customers.count ?? 0,
        pendingRx: pendingRx.count ?? 0,
        recentSales: recentSales.data ?? [],
        salesTodayCount: salesToday.data?.length ?? 0,
      };
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [{ data: sales }, { data: items }, { data: meds }] = await Promise.all([
        supabase.from("sales").select("total,created_at").gte("created_at", since.toISOString()),
        supabase.from("sale_items").select("medicine_name,quantity,line_total"),
        supabase.from("medicines").select("quantity,categories(name)"),
      ]);

      // Daily sales last 14 days
      const days: { date: string; total: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const label = d.toLocaleDateString("en-ZA", { month: "short", day: "2-digit" });
        const total = (sales ?? []).filter((s) => {
          const sd = new Date(s.created_at); return sd.toDateString() === d.toDateString();
        }).reduce((sum, s) => sum + Number(s.total), 0);
        days.push({ date: label, total: Math.round(total) });
      }

      // Top selling medicines
      const map = new Map<string, number>();
      (items ?? []).forEach((i) => map.set(i.medicine_name, (map.get(i.medicine_name) ?? 0) + Number(i.quantity)));
      const top = [...map.entries()].map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 6);

      // Category distribution
      const catMap = new Map<string, number>();
      (meds ?? []).forEach((m: any) => {
        const cat = m.categories?.name ?? "Uncategorised";
        catMap.set(cat, (catMap.get(cat) ?? 0) + Number(m.quantity));
      });
      const categories = [...catMap.entries()].map(([name, value]) => ({ name, value }));

      return { days, top, categories };
    },
  });

  const chartColors = ["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6", "#EC4899"];

  const kpis = [
    { label: "Today's Sales", value: formatZAR(metrics?.todaysTotal ?? 0), sub: `${metrics?.salesTodayCount ?? 0} transactions`, icon: DollarSign, tone: "primary" as const },
    { label: "Monthly Revenue", value: formatZAR(metrics?.monthTotal ?? 0), sub: "Month to date", icon: TrendingUp, tone: "secondary" as const },
    { label: "Medicines in Stock", value: formatNumber(metrics?.totalStock ?? 0), sub: `${metrics?.medicinesCount ?? 0} SKUs`, icon: Package, tone: "primary" as const },
    { label: "Low Stock Alerts", value: formatNumber(metrics?.lowCount ?? 0), sub: "Reorder required", icon: AlertTriangle, tone: "warning" as const },
    { label: "Expiring in 30 Days", value: formatNumber(metrics?.expiringCount ?? 0), sub: "Prioritise dispensing", icon: CalendarClock, tone: "warning" as const },
    { label: "Pending Prescriptions", value: formatNumber(metrics?.pendingRx ?? 0), sub: "Awaiting dispensing", icon: FileText, tone: "secondary" as const },
    { label: "Total Customers", value: formatNumber(metrics?.customersCount ?? 0), sub: "Registered profiles", icon: Users, tone: "primary" as const },
    { label: "Active Pharmacists", value: "8", sub: "On shift today", icon: Activity, tone: "secondary" as const },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live view of pharmacy operations across Greenacres Hospital."
        actions={
          <>
            <Button asChild variant="outline"><Link to="/inventory"><Plus className="mr-2 h-4 w-4" />Add Medicine</Link></Button>
            <Button asChild><Link to="/sales"><ShoppingCart className="mr-2 h-4 w-4" />New Sale</Link></Button>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{k.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
                </div>
                <div className={
                  "flex h-10 w-10 items-center justify-center rounded-lg " +
                  (k.tone === "primary" ? "bg-primary-soft text-primary"
                    : k.tone === "secondary" ? "bg-secondary-soft text-secondary"
                    : "bg-warning/15 text-warning-foreground")
                }>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sales — Last 14 days</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Daily revenue trend</p>
            </div>
            <Badge variant="secondary">ZAR</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.days ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R${v}`} />
                <Tooltip formatter={(v: number) => formatZAR(v)} />
                <Line type="monotone" dataKey="total" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Units in stock</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData?.categories ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {(chartData?.categories ?? []).map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle>Top Selling Medicines</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Units sold across all transactions</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.top ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="units" fill="#2563EB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="h-16 flex-col gap-1"><Link to="/sales"><ShoppingCart className="h-4 w-4" />New Sale</Link></Button>
            <Button asChild variant="outline" className="h-16 flex-col gap-1"><Link to="/inventory"><Package className="h-4 w-4" />Add Stock</Link></Button>
            <Button asChild variant="outline" className="h-16 flex-col gap-1"><Link to="/prescriptions"><FileText className="h-4 w-4" />Dispense</Link></Button>
            <Button asChild variant="outline" className="h-16 flex-col gap-1"><Link to="/customers"><Users className="h-4 w-4" />New Customer</Link></Button>
            <Button asChild variant="outline" className="h-16 flex-col gap-1 col-span-2"><Link to="/reports"><TrendingUp className="h-4 w-4" />Generate Report</Link></Button>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/invoices">View all</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Invoice</th>
                    <th className="px-4 py-2 text-left font-medium">Customer</th>
                    <th className="px-4 py-2 text-left font-medium">Pharmacist</th>
                    <th className="px-4 py-2 text-left font-medium">Payment</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(metrics?.recentSales ?? []).map((s: any) => (
                    <tr key={s.invoice_number} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.invoice_number}</td>
                      <td className="px-4 py-3">{s.customers?.full_name ?? "Walk-in"}</td>
                      <td className="px-4 py-3">{s.pharmacist_name ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{s.payment_method.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3 text-right font-medium">{formatZAR(s.total)}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDateTime(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Low Stock</CardTitle>
              <Badge variant="destructive">{metrics?.lowCount ?? 0}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {(metrics?.lowList ?? []).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-destructive">{m.quantity} left</span>
                </div>
              ))}
              {!metrics?.lowList?.length && <p className="text-sm text-muted-foreground">All stock healthy.</p>}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expiring Soon</CardTitle>
              <Badge className="bg-warning text-warning-foreground">{metrics?.expiringCount ?? 0}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {(metrics?.expiringList ?? []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground">{new Date(m.expiry_date).toLocaleDateString("en-ZA")}</span>
                </div>
              ))}
              {!metrics?.expiringList?.length && <p className="text-sm text-muted-foreground">Nothing near expiry.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
