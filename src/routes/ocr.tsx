import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, ScanLine, Upload, Receipt, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { AppShell, GlassPanel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scanReceipt, scanStatement } from "@/lib/ai.functions";
import { useFinance, useFinanceMutations, type TransactionInput } from "@/lib/finance-data";
import { guessCategory } from "@/lib/auto-categorize";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/ocr")({
  head: () => ({
    meta: [
      { title: "AI OCR Scanner — Hepeng History App" },
      {
        name: "description",
        content:
          "Scan struk belanja atau screenshot mutasi rekening, AI mengekstrak nominalnya dan simpan sekali klik.",
      },
      { property: "og:title", content: "AI OCR Scanner — Hepeng History App" },
      {
        property: "og:description",
        content: "Upload struk atau mutasi bank, AI membaca detailnya jadi transaksi siap simpan.",
      },
    ],
  }),
  component: OcrPage,
});

interface ReceiptResult {
  store?: string | null;
  date?: string | null;
  total?: number | null;
  service_charge?: number | null;
  tax?: number | null;
  items: Array<{ name: string; qty?: number | null; price: number }>;
}

interface StatementRow {
  date?: string | null;
  description: string;
  amount: number;
  direction: "debit" | "kredit";
}

function OcrPage() {
  const { data } = useFinance();
  const { createTransaction } = useFinanceMutations();
  const runReceipt = useServerFn(scanReceipt);
  const runStatement = useServerFn(scanStatement);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"receipt" | "statement">("receipt");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [walletId, setWalletId] = useState("");

  const wallets = data?.wallets ?? [];
  const activeWallet = walletId || wallets[0]?.id || "";

  const pick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result));
      setReceipt(null);
      setRows(null);
    };
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    if (!preview) { toast.error("Upload gambar dulu"); return; }
    setLoading(true);
    setReceipt(null);
    setRows(null);
    try {
      if (mode === "receipt") {
        const res = await runReceipt({ data: { imageDataUrl: preview } });
        setReceipt(res as ReceiptResult);
        toast.success("Struk berhasil dibaca");
      } else {
        const res = await runStatement({ data: { imageDataUrl: preview } });
        setRows(res.transactions as StatementRow[]);
        toast.success(`${res.transactions.length} transaksi terbaca`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindai gambar");
    } finally {
      setLoading(false);
    }
  };

  const buildTx = (
    description: string,
    amount: number,
    type: "pengeluaran" | "pemasukan",
    date?: string | null,
  ): TransactionInput => {
    const guess = guessCategory(description);
    const cat = guess ? data?.categories.find((c) => c.subkategori === guess.subkategori) : undefined;
    return {
      date: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
      description,
      type,
      amount,
      wallet_id: activeWallet || null,
      destination_wallet_id: null,
      category_id: cat?.id ?? null,
      subkategori: cat?.subkategori ?? null,
      budgeting_type: guess?.budgeting_type ?? (type === "pemasukan" ? "Tabungan" : "Kebutuhan"),
    };
  };

  const saveReceiptTotal = async () => {
    if (!receipt) return;
    const total =
      Number(receipt.total) ||
      receipt.items.reduce((a, i) => a + Number(i.price), 0) +
        Number(receipt.service_charge ?? 0) +
        Number(receipt.tax ?? 0);
    if (!total) { toast.error("Nominal total tidak terbaca"); return; }
    await createTransaction.mutateAsync(
      buildTx(receipt.store ? `Belanja ${receipt.store}` : "Belanja struk", total, "pengeluaran", receipt.date),
    );
    toast.success("Tersimpan sebagai 1 transaksi total");
    setReceipt(null);
    setPreview(null);
  };

  const saveReceiptItemized = async () => {
    if (!receipt || receipt.items.length === 0) { toast.error("Tidak ada rincian item"); return; }
    const payload = receipt.items.map((i) =>
      buildTx(`${receipt.store ? receipt.store + " – " : ""}${i.name}`, Number(i.price), "pengeluaran", receipt.date),
    );
    await createTransaction.mutateAsync(payload);
    toast.success(`${payload.length} item tersimpan`);
    setReceipt(null);
    setPreview(null);
  };

  const saveStatement = async () => {
    if (!rows || rows.length === 0) return;
    const payload = rows.map((r) =>
      buildTx(r.description, Number(r.amount), r.direction === "kredit" ? "pemasukan" : "pengeluaran", r.date),
    );
    await createTransaction.mutateAsync(payload);
    toast.success(`${payload.length} transaksi disimpan`);
    setRows(null);
    setPreview(null);
  };

  return (
    <AppShell title="AI OCR Scanner" subtitle="Baca struk & mutasi rekening otomatis">
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel>
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="w-full">
              <TabsTrigger value="receipt" className="flex-1 gap-2">
                <Receipt className="size-4" /> Struk
              </TabsTrigger>
              <TabsTrigger value="statement" className="flex-1 gap-2">
                <ListChecks className="size-4" /> Mutasi Bank
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Dompet tujuan pencatatan</Label>
              <Select value={activeWallet} onValueChange={setWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih dompet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="border-border hover:border-primary/60 grid place-items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors"
            >
              <Upload className="text-muted-foreground size-6" />
              <span className="text-sm font-medium">
                {mode === "receipt" ? "Upload foto struk" : "Upload screenshot mutasi"}
              </span>
              <span className="text-muted-foreground text-xs">PNG atau JPG, maksimal 1 gambar</span>
            </button>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pick(f);
              }}
            />

            {preview && (
              <img
                src={preview}
                alt="Pratinjau gambar yang akan dipindai"
                className="max-h-72 w-full rounded-2xl object-contain"
              />
            )}

            <Button onClick={scan} disabled={loading || !preview} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {loading ? "Memindai…" : "Pindai dengan AI"}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 className="text-base font-semibold">Hasil Ekstraksi</h2>

          {!receipt && !rows && (
            <p className="text-muted-foreground mt-4 text-sm">
              Hasil bacaan AI akan muncul di sini untuk kamu review sebelum disimpan.
            </p>
          )}

          {receipt && (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Toko" value={receipt.store ?? "—"} />
                <Info label="Tanggal" value={receipt.date ?? "—"} />
                <Info label="Service charge" value={formatIDR(Number(receipt.service_charge ?? 0))} />
                <Info label="Pajak" value={formatIDR(Number(receipt.tax ?? 0))} />
              </div>
              <div className="bg-accent/40 rounded-xl p-3">
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="num text-xl font-bold">{formatIDR(Number(receipt.total ?? 0))}</p>
              </div>
              {receipt.items.length > 0 && (
                <div className="divide-border divide-y rounded-xl border">
                  {receipt.items.map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2">
                      <span className="truncate">
                        {i.name}
                        {i.qty ? ` ×${i.qty}` : ""}
                      </span>
                      <span className="num shrink-0">{formatIDR(Number(i.price))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveReceiptTotal}>Simpan sebagai Total</Button>
                <Button variant="outline" onClick={saveReceiptItemized}>
                  Simpan Rincian Item
                </Button>
              </div>
            </div>
          )}

          {rows && (
            <div className="mt-4 grid gap-3 text-sm">
              <p className="text-muted-foreground text-xs">{rows.length} baris terbaca — review dulu ya.</p>
              <div className="divide-border max-h-80 divide-y overflow-y-auto rounded-xl border">
                {rows.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.description}</p>
                      <p className="text-muted-foreground text-xs">{r.date ?? "tanpa tanggal"}</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-semibold">{formatIDR(Number(r.amount))}</p>
                      <Badge
                        variant="outline"
                        className={r.direction === "kredit" ? "text-success" : "text-destructive"}
                      >
                        {r.direction}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={saveStatement}>Simpan Semua ke Database</Button>
            </div>
          )}
        </GlassPanel>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-accent/30 rounded-xl p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}
