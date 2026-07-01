import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ 1. Prescription OCR & Parser ============
const OcrInput = z.object({
  image_data_url: z.string().min(20), // data:image/...;base64,...
});

export const parsePrescriptionImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => OcrInput.parse(v))
  .handler(async ({ data }) => {
    const { callAiGateway, parseJsonLoose } = await import("./ai-gateway.server");

    const system = `You are a medical prescription parser. Extract structured data from prescription photos or scans.
Return ONLY valid JSON matching this shape:
{
  "patient_name": string | null,
  "patient_age": string | null,
  "doctor_name": string | null,
  "doctor_license": string | null,
  "date": string | null,
  "diagnosis": string | null,
  "medicines": [
    { "name": string, "generic_name": string | null, "dosage": string | null, "frequency": string | null, "duration": string | null, "quantity": number | null, "instructions": string | null }
  ],
  "notes": string | null,
  "confidence": "high" | "medium" | "low"
}
If the image is not a prescription, set confidence to "low" and medicines to []. Do not invent data.`;

    const content = await callAiGateway({
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the prescription details from this image." },
            { type: "image_url", image_url: { url: data.image_data_url } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    return parseJsonLoose(content);
  });

// ============ 2. Drug interaction & allergy checker ============
const InteractionInput = z.object({
  customer_id: z.string().uuid(),
  medicine_ids: z.array(z.string().uuid()).min(1),
});

export const checkInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InteractionInput.parse(v))
  .handler(async ({ data, context }) => {
    const { callAiGateway, parseJsonLoose } = await import("./ai-gateway.server");
    const { supabase } = context;

    const [{ data: customer }, { data: meds }] = await Promise.all([
      supabase
        .from("customers")
        .select("full_name, date_of_birth, allergies, chronic_conditions")
        .eq("id", data.customer_id)
        .maybeSingle(),
      supabase
        .from("medicines")
        .select("id, name, generic_name")
        .in("id", data.medicine_ids),
    ]);

    if (!customer) throw new Error("Customer not found");
    const age = customer.date_of_birth
      ? Math.floor((Date.now() - new Date(customer.date_of_birth).getTime()) / (365.25 * 86400_000))
      : null;

    const system = `You are a clinical pharmacist reviewing a prescription for safety. Analyze:
1. Drug-drug interactions between the NEW medicines
2. Contraindications with the patient's ALLERGIES
3. Contraindications with the patient's CHRONIC CONDITIONS
4. Age-related concerns

Return ONLY valid JSON:
{
  "risk_level": "safe" | "caution" | "warning" | "danger",
  "summary": string,
  "issues": [
    { "severity": "info" | "caution" | "warning" | "danger", "category": "interaction" | "allergy" | "contraindication" | "dosage" | "age", "title": string, "detail": string, "recommendation": string }
  ]
}
Base your reasoning on standard clinical knowledge. If no issues found, return risk_level "safe" and issues: [].`;

    const userMsg = `PATIENT:
Name: ${customer.full_name}
Age: ${age ?? "unknown"}
Allergies: ${customer.allergies ?? "none recorded"}
Chronic conditions: ${customer.chronic_conditions ?? "none recorded"}

NEW MEDICINES TO DISPENSE:
${(meds ?? []).map((m) => `- ${m.name}${m.generic_name ? ` (${m.generic_name})` : ""}`).join("\n")}`;

    const content = await callAiGateway({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    return parseJsonLoose(content);
  });

// ============ 3. Inventory assistant (chat with data context) ============
const ChatInput = z.object({
  question: z.string().min(1).max(500),
});

export const inventoryAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ChatInput.parse(v))
  .handler(async ({ data, context }) => {
    const { callAiGateway } = await import("./ai-gateway.server");
    const { supabase } = context;

    // Pull compact snapshots of the data the assistant may need.
    const today = new Date();
    const in60 = new Date(today.getTime() + 60 * 86400_000).toISOString().slice(0, 10);
    const last30 = new Date(today.getTime() - 30 * 86400_000).toISOString();

    const [
      { data: medicines },
      { data: expiring },
      { data: lowStock },
      { data: recentSales },
    ] = await Promise.all([
      supabase.from("medicines").select("name, generic_name, quantity, reorder_level, selling_price, expiry_date, status").limit(200),
      supabase.from("medicines").select("name, quantity, expiry_date").lte("expiry_date", in60).order("expiry_date").limit(50),
      supabase.from("medicines").select("name, quantity, reorder_level").limit(200),
      supabase.from("sale_items").select("quantity, unit_price, medicines(name), sales!inner(created_at)").gte("sales.created_at", last30).limit(500),
    ]);

    const lowStockFiltered = (lowStock ?? []).filter((m) => m.quantity <= m.reorder_level);

    // Aggregate sales by medicine
    const salesByMed: Record<string, { qty: number; revenue: number }> = {};
    for (const s of recentSales ?? []) {
      const name = (s as unknown as { medicines: { name: string } | null }).medicines?.name ?? "Unknown";
      const qty = Number(s.quantity ?? 0);
      const rev = qty * Number(s.unit_price ?? 0);
      salesByMed[name] = salesByMed[name] ?? { qty: 0, revenue: 0 };
      salesByMed[name].qty += qty;
      salesByMed[name].revenue += rev;
    }
    const topSellers = Object.entries(salesByMed)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 15)
      .map(([name, v]) => ({ name, units_sold_30d: v.qty, revenue_zar_30d: Math.round(v.revenue) }));

    const context_snapshot = {
      inventory: (medicines ?? []).slice(0, 100),
      expiring_within_60_days: expiring ?? [],
      low_stock: lowStockFiltered,
      top_selling_last_30_days: topSellers,
      today: today.toISOString().slice(0, 10),
    };

    const system = `You are the Greenacres Hospital Pharmacy inventory assistant. Answer questions about inventory, expiries, sales, and stock levels using ONLY the JSON snapshot provided.
- Currency is ZAR (R). Format amounts as R 1,234.
- Be concise, use bullet lists and short tables when helpful.
- If the data does not contain the answer, say so briefly.
- Do not invent medicines that are not in the snapshot.`;

    const answer = await callAiGateway({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `DATA SNAPSHOT:\n${JSON.stringify(context_snapshot)}\n\nQUESTION: ${data.question}` },
      ],
      temperature: 0.3,
    });
    return { answer };
  });

// ============ 4. Smart reorder suggestions ============
export const suggestReorders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { callAiGateway, parseJsonLoose } = await import("./ai-gateway.server");
    const { supabase } = context;

    const last60 = new Date(Date.now() - 60 * 86400_000).toISOString();
    const [{ data: meds }, { data: saleItems }] = await Promise.all([
      supabase
        .from("medicines")
        .select("id, name, generic_name, quantity, reorder_level, cost_price, expiry_date, supplier_id, suppliers(name)")
        .limit(500),
      supabase
        .from("sale_items")
        .select("medicine_id, quantity, sales!inner(created_at)")
        .gte("sales.created_at", last60)
        .limit(2000),
    ]);

    // velocity (units/day, last 60d)
    const velocity: Record<string, number> = {};
    for (const s of saleItems ?? []) {
      const mid = (s as { medicine_id: string | null }).medicine_id;
      if (!mid) continue;
      velocity[mid] = (velocity[mid] ?? 0) + Number(s.quantity ?? 0);
    }

    const candidates = (meds ?? [])
      .map((m) => {
        const sold60 = velocity[m.id] ?? 0;
        const perDay = sold60 / 60;
        const daysCover = perDay > 0 ? m.quantity / perDay : 999;
        return {
          id: m.id,
          name: m.name,
          generic: m.generic_name,
          on_hand: m.quantity,
          reorder_level: m.reorder_level,
          cost_price: Number(m.cost_price ?? 0),
          expiry: m.expiry_date,
          supplier: (m as unknown as { suppliers: { name: string } | null }).suppliers?.name ?? "Unassigned",
          supplier_id: m.supplier_id,
          units_per_day: Number(perDay.toFixed(2)),
          days_of_cover: Math.round(daysCover),
          sold_last_60d: sold60,
        };
      })
      .filter((m) => m.on_hand <= m.reorder_level || m.days_of_cover < 21)
      .sort((a, b) => a.days_of_cover - b.days_of_cover)
      .slice(0, 40);

    if (candidates.length === 0) {
      return { orders: [], insight: "All stock levels are healthy. No reorders needed at this time." };
    }

    const system = `You are a pharmacy procurement analyst. Given medicines with sales velocity and stock, recommend a purchase order per supplier for a 45-day cover target.
Return ONLY valid JSON:
{
  "insight": string,  // one paragraph explaining the plan
  "orders": [
    {
      "supplier": string,
      "total_estimated_cost_zar": number,
      "items": [
        { "medicine": string, "on_hand": number, "recommended_qty": number, "reason": string, "estimated_cost_zar": number }
      ]
    }
  ]
}
Rules: recommend whole units only. Round order quantities up to nearest 10 for items <100 units. Skip items where on_hand > reorder_level AND days_of_cover >= 21. Prioritize items with days_of_cover < 14.`;

    const content = await callAiGateway({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `CANDIDATES:\n${JSON.stringify(candidates)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    return parseJsonLoose(content);
  });

// ============ Helper: list customers & medicines for pickers ============
export const listPickerData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: customers }, { data: medicines }] = await Promise.all([
      context.supabase.from("customers").select("id, full_name, age, allergies, chronic_conditions").order("full_name").limit(500),
      context.supabase.from("medicines").select("id, name, generic_name").order("name").limit(500),
    ]);
    return { customers: customers ?? [], medicines: medicines ?? [] };
  });
