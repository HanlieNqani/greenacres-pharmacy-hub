import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Greenacres Pharmacy" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Hospital details, pricing, and system preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Hospital information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2"><Label htmlFor="hosp">Hospital name</Label><Input id="hosp" defaultValue="Greenacres Hospital" /></div>
            <div className="grid gap-2"><Label htmlFor="addr">Address</Label><Input id="addr" defaultValue="12 Health Rd, Cape Town, 8001" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="phone">Phone</Label><Input id="phone" defaultValue="021 555 1000" /></div>
              <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" defaultValue="pharmacy@greenacres.co.za" /></div>
            </div>
            <Button onClick={() => toast.success("Hospital details saved")}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing & tax</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="vat">VAT (%)</Label><Input id="vat" type="number" defaultValue="15" /></div>
              <div className="grid gap-2"><Label htmlFor="cur">Currency</Label><Input id="cur" defaultValue="ZAR" /></div>
            </div>
            <div className="grid gap-2"><Label htmlFor="receipt">Receipt footer</Label><Input id="receipt" defaultValue="Thank you for choosing Greenacres Pharmacy." /></div>
            <Button onClick={() => toast.success("Pricing settings saved")}>Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Low stock alerts", true],
              ["Expiry alerts (90 / 30 days)", true],
              ["Failed payment alerts", true],
              ["Large sale alerts", false],
              ["Daily summary email", true],
            ].map(([label, on]) => (
              <div key={label as string} className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor={label as string} className="font-normal">{label as string}</Label>
                <Switch id={label as string} defaultChecked={on as boolean} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>System</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="font-medium">Dark mode</div>
                <div className="text-xs text-muted-foreground">Toggle interface theme</div>
              </div>
              <Switch onCheckedChange={(v) => document.documentElement.classList.toggle("dark", v)} />
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success("Backup initiated")}>Backup database</Button>
              <Button variant="outline" onClick={() => toast.info("Restore requires admin approval")}>Restore</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
