import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

interface GatewayMessage {
  role: "system" | "user";
  content: unknown;
}

async function callGateway(messages: GatewayMessage[], jsonMode = false) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI belum dikonfigurasi.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI sedang sibuk, coba lagi sebentar.");
    if (res.status === 402) throw new Error("Kredit AI habis. Tambah kredit di workspace kamu.");
    throw new Error(`AI gagal (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start < 0) throw new Error("AI tidak mengembalikan data yang bisa dibaca.");
  return JSON.parse(cleaned.slice(start));
}

/* ----------------------------- Financial advisor ---------------------------- */

export const generateAdvice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        periodLabel: z.string(),
        summary: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const content = await callGateway([
      {
        role: "system",
        content:
          "Kamu adalah penasihat keuangan pribadi Indonesia yang ramah, tajam, dan praktis. " +
          "Jawab dalam Bahasa Indonesia, gunakan format markdown dengan heading pendek dan bullet. " +
          "Selalu sebut angka dalam Rupiah (contoh Rp1.250.000). " +
          "Struktur wajib: (1) Ringkasan Kebiasaan Belanja, (2) Kebocoran Terbesar, " +
          "(3) Analisis Arus Transfer Antar Dompet, (4) 3 Aksi Hemat dengan estimasi penghematan Rupiah per bulan, " +
          "(5) Skor kesehatan keuangan 0-100 dengan alasan singkat.",
      },
      {
        role: "user",
        content: `Periode analisis: ${data.periodLabel}\n\nData keuangan:\n${data.summary}`,
      },
    ]);
    return { content };
  });

/* --------------------------------- OCR scan -------------------------------- */

const receiptSchema = z.object({
  store: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  total: z.number().nullable().optional(),
  service_charge: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  items: z
    .array(z.object({ name: z.string(), qty: z.number().nullable().optional(), price: z.number() }))
    .default([]),
});

export const scanReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ imageDataUrl: z.string().min(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            "Kamu OCR struk belanja Indonesia. Balas HANYA JSON valid dengan bentuk: " +
            '{"store":string,"date":"YYYY-MM-DD","total":number,"service_charge":number,"tax":number,' +
            '"items":[{"name":string,"qty":number,"price":number}]}. ' +
            "Nominal berupa angka tanpa titik/koma pemisah ribuan. Jika tidak ada, pakai null atau 0.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Ekstrak isi struk ini." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      true,
    );
    return receiptSchema.parse(extractJson(raw));
  });

const statementSchema = z.object({
  transactions: z
    .array(
      z.object({
        date: z.string().nullable().optional(),
        description: z.string(),
        amount: z.number(),
        direction: z.enum(["debit", "kredit"]),
      }),
    )
    .default([]),
});

export const scanStatement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ imageDataUrl: z.string().min(20) }).parse(d))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            "Kamu OCR mutasi rekening / e-wallet Indonesia. Balas HANYA JSON valid: " +
            '{"transactions":[{"date":"YYYY-MM-DD","description":string,"amount":number,"direction":"debit"|"kredit"}]}. ' +
            "debit = uang keluar, kredit = uang masuk. Nominal angka murni tanpa pemisah ribuan. Ambil SEMUA baris transaksi.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Ekstrak semua transaksi dari screenshot mutasi ini." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      true,
    );
    return statementSchema.parse(extractJson(raw));
  });
