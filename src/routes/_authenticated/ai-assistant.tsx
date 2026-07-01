import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Upload, ShieldAlert, MessageSquare, Truck, Loader2, Send } from "lucide-react";
import {
  parsePrescriptionImage,
  checkInteractions,
  inventoryAssistant,
  suggestReorders,
  listPickerData,
} from "@/lib/ai.functions";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  component: AiAssistantPage,
});

function AiAssistantPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="AI Assistant"
        description="Powered features for prescription parsing, safety checks, inventory chat, and procurement."
        icon={Sparkles}
      />
      <Tabs defaultValue="ocr" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="ocr"><Upload className="mr-2 h-4 w-4" />Prescription OCR</TabsTrigger>
          <TabsTrigger value="safety"><ShieldAlert className="mr-2 h-4 w-4" />Safety Check</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4" />Inventory Chat</TabsTrigger>
          <TabsTrigger value="reorder"><Truck className="mr-2 h-4 w-4" />Smart Reorder</TabsTrigger>
        </TabsList>
        <TabsContent value="ocr" className="mt-4"><OcrTab /></TabsContent>
        <TabsContent value="safety" className="mt-4"><SafetyTab /></TabsContent>
        <TabsContent value="chat" className="mt-4"><ChatTab /></TabsContent>
        <TabsContent value="reorder" className="mt-4"><ReorderTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// -------- 1. OCR --------
type OcrResult = {
  patient_name?: string | null;
  patient_age?: string | null;
  doctor_name?: string | null;
  date?: string | null;
  diagnosis?: string | null;
  medicines?: Array<{ name: string; generic_name?: string | null; dosage?: string | null; frequency?: string | null; duration?: string | null; quantity?: number | null; instructions?: string | null }>;
  notes?: string | null;
  confidence?: string;
};

function OcrTab() {
  const parse = useServerFn(parsePrescriptionImage);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8 MB");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setLoading(true);
      try {
        const r = (await parse({ data: { image_data_url: dataUrl } })) as OcrResult;
        setResult(r);
        toast.success("Prescription parsed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to parse");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload prescription</CardTitle>
          <CardDescription>Photo or scan. AI extracts patient, doctor and medicines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {preview && <img src={preview} alt="prescription" className="max-h-80 rounded-md border object-contain" />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Extracted data</CardTitle>
          {result?.confidence && <Badge variant={result.confidence === "high" ? "default" : "secondary"}>Confidence: {result.confidence}</Badge>}
        </CardHeader>
        <CardContent>
          {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…</div>}
          {!loading && !result && <p className="text-sm text-muted-foreground">Upload an image to see extracted details.</p>}
          {result && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Patient" value={result.patient_name} />
                <Field label="Age" value={result.patient_age} />
                <Field label="Doctor" value={result.doctor_name} />
                <Field label="Date" value={result.date} />
              </div>
              {result.diagnosis && <Field label="Diagnosis" value={result.diagnosis} />}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Medicines ({result.medicines?.length ?? 0})</div>
                <div className="space-y-2">
                  {(result.medicines ?? []).map((m, i) => (
                    <div key={i} className="rounded-md border p-2">
                      <div className="font-medium">{m.name} {m.generic_name && <span className="text-xs text-muted-foreground">({m.generic_name})</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}
                        {m.quantity ? ` · Qty ${m.quantity}` : ""}
                      </div>
                      {m.instructions && <div className="text-xs mt-1">{m.instructions}</div>}
                    </div>
                  ))}
                </div>
              </div>
              {result.notes && <Field label="Notes" value={result.notes} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

// -------- 2. Safety Check --------
type Issue = { severity: string; category: string; title: string; detail: string; recommendation: string };
type SafetyResult = { risk_level: string; summary: string; issues: Issue[] };

function SafetyTab() {
  const check = useServerFn(checkInteractions);
  const listData = useServerFn(listPickerData);
  const { data: picker } = useQuery({ queryKey: ["ai-picker"], queryFn: () => listData() });
  const [customerId, setCustomerId] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const run = async () => {
    if (!customerId || selected.length === 0) return toast.error("Choose a patient and at least one medicine");
    setLoading(true);
    setResult(null);
    try {
      const r = (await check({ data: { customer_id: customerId, medicine_ids: selected } })) as SafetyResult;
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (l: string) =>
    l === "danger" ? "destructive" : l === "warning" ? "destructive" : l === "caution" ? "secondary" : "default";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Patient & medicines</CardTitle>
          <CardDescription>AI checks interactions, allergies and contraindications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Patient</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {picker?.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Medicines to dispense</label>
            <div className="max-h-72 overflow-auto rounded-md border p-2 space-y-1">
              {picker?.medicines.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                  <span>{m.name}{m.generic_name && <span className="text-xs text-muted-foreground"> ({m.generic_name})</span>}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : "Run safety check"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assessment</CardTitle>
          {result && <Badge variant={riskColor(result.risk_level)}>Risk: {result.risk_level}</Badge>}
        </CardHeader>
        <CardContent>
          {!result && !loading && <p className="text-sm text-muted-foreground">Results appear here.</p>}
          {result && (
            <div className="space-y-3">
              <p className="text-sm">{result.summary}</p>
              {result.issues.length === 0 && <p className="text-sm text-green-600">No issues detected.</p>}
              {result.issues.map((i, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{i.title}</div>
                    <Badge variant={riskColor(i.severity)}>{i.severity}</Badge>
                  </div>
                  <div className="text-xs uppercase text-muted-foreground">{i.category}</div>
                  <div className="text-sm">{i.detail}</div>
                  <div className="text-sm text-primary"><strong>Recommendation:</strong> {i.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -------- 3. Chat --------
type ChatMsg = { role: "user" | "assistant"; text: string };

function ChatTab() {
  const ask = useServerFn(inventoryAssistant);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", text: "Hi! Ask me about inventory, expiries, top sellers, or stock levels. For example: \"What's expiring next month?\" or \"Top 5 selling meds this week?\"" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const r = (await ask({ data: { question: q } })) as { answer: string };
      setMessages((m) => [...m, { role: "assistant", text: r.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: e instanceof Error ? e.message : "Failed" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[calc(100vh-16rem)] flex flex-col">
      <CardHeader>
        <CardTitle>Inventory chat</CardTitle>
        <CardDescription>Natural-language queries over your live pharmacy data.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</div></div>}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about stock, expiries, sales…"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------- 4. Reorder --------
type ReorderResult = {
  insight: string;
  orders: Array<{
    supplier: string;
    total_estimated_cost_zar: number;
    items: Array<{ medicine: string; on_hand: number; recommended_qty: number; reason: string; estimated_cost_zar: number }>;
  }>;
};

function ReorderTab() {
  const run = useServerFn(suggestReorders);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReorderResult | null>(null);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = (await run()) as ReorderResult;
      setResult(r);
      toast.success("Reorder plan generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Smart reorder suggestions</CardTitle>
          <CardDescription>AI analyses 60-day sales velocity and stock levels to draft purchase orders per supplier (45-day cover target).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generate} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : "Generate reorder plan"}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <>
          <Card>
            <CardHeader><CardTitle>Insight</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{result.insight}</p></CardContent>
          </Card>
          {result.orders.map((o, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>{o.supplier}</span>
                  <span className="text-primary">R {Math.round(o.total_estimated_cost_zar).toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2">Medicine</th>
                        <th>On hand</th>
                        <th>Order qty</th>
                        <th>Reason</th>
                        <th className="text-right">Cost (R)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.items.map((it, j) => (
                        <tr key={j} className="border-t">
                          <td className="py-2 font-medium">{it.medicine}</td>
                          <td>{it.on_hand}</td>
                          <td><Badge>{it.recommended_qty}</Badge></td>
                          <td className="text-xs text-muted-foreground">{it.reason}</td>
                          <td className="text-right">{Math.round(it.estimated_cost_zar).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
