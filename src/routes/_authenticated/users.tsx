import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "User Management — Greenacres Pharmacy" }] }),
  component: UsersPage,
});

const staff = [
  { name: "Admin User", role: "Administrator", email: "admin@greenacres.co.za" },
  { name: "Natalie Williams", role: "Pharmacist", email: "n.williams@greenacres.co.za" },
  { name: "Thabo Ndlovu", role: "Pharmacist", email: "t.ndlovu@greenacres.co.za" },
  { name: "Ashley Mokoena", role: "Cashier", email: "a.mokoena@greenacres.co.za" },
  { name: "Karen Adams", role: "Pharmacy Manager", email: "k.adams@greenacres.co.za" },
  { name: "Sipho Khumalo", role: "Store Manager", email: "s.khumalo@greenacres.co.za" },
];

const roleTone: Record<string, string> = {
  Administrator: "bg-destructive/15 text-destructive",
  "Pharmacy Manager": "bg-secondary-soft text-secondary",
  "Store Manager": "bg-secondary-soft text-secondary",
  Pharmacist: "bg-primary-soft text-primary",
  Cashier: "bg-warning/20 text-warning-foreground",
};

function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Staff accounts, roles, and permissions." actions={
        <Button><Plus className="mr-2 h-4 w-4" />Add User</Button>
      } />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.map((s) => (
                <tr key={s.email} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3"><Badge className={roleTone[s.role]}>{s.role}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-primary">Active</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
