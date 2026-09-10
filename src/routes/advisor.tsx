import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell, GlassPanel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAdvice } from "@/lib/ai.functions";
import { useFinance, walletBalances } from "@/lib/finance-data";
import { formatIDR, monthLabel } from "@/lib/format";

export const Route = createFileRoute("/advisor")({
  head: () => ({
    meta: [
      { title: "AI Financial Advisor — Hepeng History App" },
      {
        name: "description",
        content:
          "Analisis kebiasaan belanja, kebocoran terbesar, dan 3 aksi hemat dengan estimasi rupiah dari AI.",
      },
      { property: "og:title", content: "AI Financial Advisor — Hepeng History App" },
      {
        property: "og:description",
        content: "Insight keuangan otomatis untuk satu bulan, rentang bulan, atau setahun penuh.",
      },
    ],
  }),
  component: AdvisorPage,
});

type Mode = "month" | "range" | "year";

function monthOptions() {
  const out: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: monthLabel(d) });
  }
  return out;
}

function parseMonth(value: string) {
  const [y, m] = value.split("-").map(Number);
  return new Date(y!, m!, 1);
}

function AdvisorPage() {
  const { data } = useFinance();
  const advise = useServerFn(generateAdvice);
  const months = useMemo(monthOptions, []);
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const t of data?.transactions ?? []) set.add(new Date(t.date).getFullYear());
    if (set.size === 0) set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [data?.transactions]);

  const [mode, setMode] = useState<Mode>("month");
  const [single, setSingle] = useState(months[0]!.value);
  const [rangeFrom, setRangeFrom] = useState(months[2]?.value ?? months[0]!.value);
  const [rangeTo, setRangeTo] = useState(months[0]!.value);
  const [year, setYear] = useState(String(years[0]));
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const window = () => {
    if (mode === "year") {
      const y = Number(year);
      return {
        start: new Date(y, 0, 1),
        end: new Date(y, 11, 31, 23, 59, 59),
        label: `Tahun ${y}`,
      };
    }
    if (mode === "range") {
      const a = parseMonth(rangeFrom);
      const b = parseMonth(rangeTo);
      const start = a <= b ? a : b;
      const endBase = a <= b ? b : a;
      const end = new Date(endBase.getFullYear(), endBase.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: `${monthLabel(start)} – ${monthLabel(endBase)}` };
    }
    const d = parseMonth(single);
    return {
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      label: monthLabel(d),
    };
  };

  const run = async () => {
    if (!data) return;
    const { start, end, label } = window();
    const list = data.transactions.filter((t) => {
      const x = +new Date(t.date);
      return x >= +start && x <= +end;
    });
    if (list.length === 0) return toast.error("Tidak ada transaksi pada periode ini");

    const sum = (type: string) =>
      list.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
    const bySub = Object.entries(
      list
        .filter((t) => t.type === "pengeluaran")
        .reduce<Record<string, number>>((acc, t) => {
          const key = t.subkategori ?? "Lainnya";
          acc[key] = (acc[key] ?? 0) + Number(t.amount);
          return acc;
        }, {}),
    ).sort((a, b) => b[1] - a[1]);
    const byBudget = (bt: string) =>
      list
        .filter((t) => t.type === "pengeluaran" && t.budgeting_type === bt)
        .reduce((a, t) => a + Number(t.amount), 0);
    const walletName = (id: string | null) => data.wallets.find((w) => w.id === id)?.name ?? "?";
    const transfers = list
      .filter((t) => t.type === "transfer")
      .map(
        (t) =>
          `${walletName(t.wallet_id)} -> ${walletName(t.destination_wallet_id)}: ${formatIDR(Number(t.amount))}`,
      );

    const summary = [
      `Total pemasukan: ${formatIDR(sum("pemasukan"))}`,
      `Total pengeluaran: ${formatIDR(sum("pengeluaran"))}`,
      `Net savings: ${formatIDR(sum("pemasukan") - sum("pengeluaran"))}`,
      `Jumlah transaksi: ${list.length}`,
      "",
      "Pengeluaran per subkategori:",
      ...bySub.map(([k, v]) => `- ${k}: ${formatIDR(v)}`),
      "",
      "Pembagian budgeting:",
      `- Kebutuhan: ${formatIDR(byBudget("Kebutuhan"))}`,
      `- Keinginan: ${formatIDR(byBudget("Keinginan"))}`,
      `- Tabungan: ${formatIDR(byBudget("Tabungan"))}`,
      "",
      "Transfer antar dompet:",
      ...(transfers.length ? transfers.map((t) => `- ${t}`) : ["- tidak ada"]),
      "",
      "Saldo dompet saat ini:",
      ...walletBalances(data).map((w) => `- ${w.name}: ${formatIDR(w.realtime_balance)}`),
      "",
      "Target tabungan:",
      ...data.goals.map(
        (g) => `- ${g.name}: ${formatIDR(Number(g.current_amount))} dari ${formatIDR(Number(g.target_amount))}`,
      ),
    ].join("\n");

    setLoading(true);
    setResult(null);
    try {
      const res = await advise({ data: { periodLabel: label, summary } });
      setResult(res.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat analisis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="AI Financial Advisor" subtitle="Analisis keuangan otomatis berbasis data kamu">
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-1">
          <h2 className="text-base font-semibold">Pilih Periode</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Satu bulan</SelectItem>
                  <SelectItem value="range">Rentang bulan</SelectItem>
                  <SelectItem value="year">Setahun penuh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "month" && (
              <div className="grid gap-2">
                <Label>Bulan</Label>
                <Select value={single} onValueChange={setSingle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "range" && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Dari bulan</Label>
                  <Select value={rangeFrom} onValueChange={setRangeFrom}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sampai bulan</Label>
                  <Select value={rangeTo} onValueChange={setRangeTo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {mode === "year" && (
              <div className="grid gap-2">
                <Label>Tahun</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={run} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Menganalisis…" : "Buat Insight"}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Bot className="text-primary size-5" />
            <h2 className="text-base font-semibold">Insight AI</h2>
          </div>

          {loading && (
            <p className="text-muted-foreground mt-6 text-sm">
              AI sedang membaca transaksimu dan menyusun rekomendasi…
            </p>
          )}

          {!loading && !result && (
            <p className="text-muted-foreground mt-6 text-sm">
              Pilih periode lalu tekan “Buat Insight” untuk melihat ringkasan kebiasaan belanja,
              kebocoran terbesar, analisis transfer, dan 3 aksi hemat dengan estimasi rupiah.
            </p>
          )}

          {result && <Markdownish text={result} />}
        </GlassPanel>
      </div>
    </AppShell>
  );
}

function Markdownish({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="mt-4 grid gap-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const clean = line.replace(/\*\*(.+?)\*\*/g, "$1");
        if (!clean.trim()) return <div key={i} className="h-1" />;
        if (/^#{1,6}\s/.test(clean))
          return (
            <h3 key={i} className="mt-3 text-base font-semibold">
              {clean.replace(/^#{1,6}\s/, "")}
            </h3>
          );
        if (/^\s*[-*]\s/.test(clean))
          return (
            <p key={i} className="text-muted-foreground pl-4">
              • {clean.replace(/^\s*[-*]\s/, "")}
            </p>
          );
        if (/^\s*\d+\.\s/.test(clean))
          return (
            <p key={i} className="pl-2 font-medium">
              {clean}
            </p>
          );
        return <p key={i}>{clean}</p>;
      })}
    </div>
  );
}
