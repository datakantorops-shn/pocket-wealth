import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  PiggyBank,
  Wallet as WalletIcon,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, GlassPanel } from "@/components/AppShell";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFinance, walletBalances } from "@/lib/finance-data";
import {
  endOfMonth,
  formatIDR,
  monthLabel,
  percentChange,
  startOfMonth,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Keuangan — Hepeng History App" },
      {
        name: "description",
        content:
          "Pantau saldo semua dompet, pemasukan vs pengeluaran bulanan, dan pembagian 50/30/20 secara real-time.",
      },
      { property: "og:title", content: "Dashboard Keuangan — Hepeng History App" },
      {
        property: "og:description",
        content: "Saldo dompet, arus kas bulanan, dan budget 50/30/20 dalam satu tampilan.",
      },
    ],
  }),
  component: Dashboard,
});

function ScoreCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "primary" | "success" | "danger";
  delay?: number;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "danger"
        ? "bg-destructive/15 text-destructive"
        : "bg-primary/15 text-primary";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass min-w-0 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", toneClass)}>{icon}</span>
      </div>
      <p className="num mt-3 truncate text-2xl font-bold sm:text-[26px]">{value}</p>
      {hint && <div className="mt-2 text-xs">{hint}</div>}
    </motion.div>
  );
}

function Dashboard() {
  const { data, isLoading } = useFinance();
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const thisStart = startOfMonth(now);
    const thisEnd = endOfMonth(now);
    const lastStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastEnd = endOfMonth(lastStart);

    const inRange = (d: string, a: Date, b: Date) => {
      const x = +new Date(d);
      return x >= +a && x <= +b;
    };

    const monthTx = data.transactions.filter((t) => inRange(t.date, thisStart, thisEnd));
    const lastTx = data.transactions.filter((t) => inRange(t.date, lastStart, lastEnd));

    const sum = (list: typeof monthTx, type: string) =>
      list.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);

    const income = sum(monthTx, "pemasukan");
    const expense = sum(monthTx, "pengeluaran");
    const lastIncome = sum(lastTx, "pemasukan");
    const lastExpense = sum(lastTx, "pengeluaran");

    const balances = walletBalances(data);
    const total = balances.reduce((a, w) => a + w.realtime_balance, 0);

    const byBudget = (bt: string) =>
      monthTx
        .filter((t) => t.type === "pengeluaran" && t.budgeting_type === bt)
        .reduce((a, t) => a + Number(t.amount), 0);

    const topExpenses = Object.entries(
      monthTx
        .filter((t) => t.type === "pengeluaran")
        .reduce<Record<string, number>>((acc, t) => {
          const key = t.subkategori ?? "Lainnya";
          acc[key] = (acc[key] ?? 0) + Number(t.amount);
          return acc;
        }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const days = Array.from({ length: thisEnd.getDate() }, (_, i) => i + 1);
    const daily = days.map((d) => {
      const dayTx = monthTx.filter((t) => new Date(t.date).getDate() === d);
      return {
        day: String(d),
        Pemasukan: sum(dayTx, "pemasukan"),
        Pengeluaran: sum(dayTx, "pengeluaran"),
      };
    });

    return {
      income,
      expense,
      lastIncome,
      lastExpense,
      net: income - expense,
      lastNet: lastIncome - lastExpense,
      total,
      balances,
      topExpenses,
      maxTop: topExpenses[0]?.[1] ?? 1,
      daily,
      rule: {
        Kebutuhan: byBudget("Kebutuhan"),
        Keinginan: byBudget("Keinginan"),
        Tabungan: byBudget("Tabungan"),
      },
      monthName: monthLabel(now),
    };
  }, [data]);

  const ruleRows = stats
    ? ([
        ["Kebutuhan", 0.5, stats.rule.Kebutuhan, "bg-primary"],
        ["Keinginan", 0.3, stats.rule.Keinginan, "bg-warning"],
        ["Tabungan", 0.2, stats.rule.Tabungan, "bg-success"],
      ] as Array<[string, number, number, string]>)
    : [];

  return (
    <AppShell
      title="Dashboard"
      subtitle={stats ? `Ringkasan ${stats.monthName}` : "Memuat data keuangan"}
      actions={
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="size-4" /> <span className="hidden sm:inline">Transaksi</span>
        </Button>
      }
    >
      {data?.mock && (
        <div className="glass mb-5 rounded-2xl p-4 text-sm">
          Menampilkan data contoh interaktif. Semua perubahan tersimpan sementara di perangkat ini.
        </div>
      )}

      {isLoading || !stats ? (
        <div className="text-muted-foreground py-20 text-center text-sm">Memuat data…</div>
      ) : (
        <div className="grid gap-5">
          {/* Scorecards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ScoreCard
              label="Total Saldo Semua Dompet"
              value={formatIDR(stats.total)}
              icon={<WalletIcon className="size-4" />}
              hint={
                <span className="text-muted-foreground">
                  {stats.balances.length} dompet aktif
                </span>
              }
            />
            <ScoreCard
              label="Pemasukan Bulan Ini"
              value={formatIDR(stats.income)}
              tone="success"
              delay={0.05}
              icon={<ArrowUpRight className="size-4" />}
              hint={<GrowthHint value={percentChange(stats.income, stats.lastIncome)} positiveIsGood />}
            />
            <ScoreCard
              label="Pengeluaran Bulan Ini"
              value={formatIDR(stats.expense)}
              tone="danger"
              delay={0.1}
              icon={<ArrowDownRight className="size-4" />}
              hint={<GrowthHint value={percentChange(stats.expense, stats.lastExpense)} />}
            />
            <ScoreCard
              label="Net Savings Bulan Ini"
              value={formatIDR(stats.net)}
              tone={stats.net >= 0 ? "success" : "danger"}
              delay={0.15}
              icon={<PiggyBank className="size-4" />}
              hint={
                <Badge variant="outline" className={stats.net >= 0 ? "text-success" : "text-destructive"}>
                  {stats.net >= 0 ? "✅ Keuangan Sehat" : "🔴 Defisit"}
                </Badge>
              }
            />
          </div>

          {/* Chart + 50/30/20 */}
          <div className="grid gap-5 lg:grid-cols-3">
            <GlassPanel className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="text-primary size-4" />
                <h2 className="text-base font-semibold">Arus Kas Harian</h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.daily} margin={{ left: -12, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-destructive)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-destructive)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                      tickFormatter={(v: number) => formatIDR(v, { compact: true })}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--color-popover-foreground)",
                      }}
                      formatter={(v) => formatIDR(Number(v))}
                    />
                    <Area
                      type="monotone"
                      dataKey="Pemasukan"
                      stroke="var(--color-success)"
                      fill="url(#gIn)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Pengeluaran"
                      stroke="var(--color-destructive)"
                      fill="url(#gOut)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel>
              <h2 className="text-base font-semibold">Aturan 50 / 30 / 20</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Target dihitung dari pemasukan bulan ini ({formatIDR(stats.income, { compact: true })}).
              </p>
              <div className="mt-4 grid gap-4">
                {ruleRows.map(([label, share, realized, bar]) => {
                  const target = stats.income * share;
                  const pct = target ? Math.min((realized / target) * 100, 100) : 0;
                  const over = target > 0 && realized > target;
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {label}{" "}
                          <span className="text-muted-foreground text-xs">({share * 100}%)</span>
                        </span>
                        <span className={cn("num text-xs", over && "text-destructive font-semibold")}>
                          {formatIDR(realized, { compact: true })} / {formatIDR(target, { compact: true })}
                        </span>
                      </div>
                      <div className="bg-muted mt-2 h-2.5 overflow-hidden rounded-full">
                        <div
                          className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          </div>

          {/* Wallets */}
          <GlassPanel>
            <h2 className="text-base font-semibold">Dompet Saya</h2>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {stats.balances.map((w) => {
                const status =
                  w.realtime_balance > 0 ? "Positif" : w.realtime_balance === 0 ? "Kosong" : "Negatif";
                return (
                  <div
                    key={w.id}
                    className="glass min-w-[220px] shrink-0 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{w.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          status === "Positif" && "text-success",
                          status === "Negatif" && "text-destructive",
                          status === "Kosong" && "text-muted-foreground",
                        )}
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="num mt-3 text-xl font-bold">{formatIDR(w.realtime_balance)}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Saldo awal {formatIDR(Number(w.initial_balance), { compact: true })}
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Top 5 */}
          <GlassPanel>
            <h2 className="text-base font-semibold">Top 5 Pengeluaran Bulan Ini</h2>
            {stats.topExpenses.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">Belum ada pengeluaran bulan ini.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {stats.topExpenses.map(([name, value], i) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {i + 1}. {name}
                      </span>
                      <span className="num">{formatIDR(value)}</span>
                    </div>
                    <Progress value={(value / stats.maxTop) * 100} className="mt-2 h-2" />
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      <TransactionDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function GrowthHint({ value, positiveIsGood }: { value: number; positiveIsGood?: boolean }) {
  const up = value >= 0;
  const good = positiveIsGood ? up : !up;
  return (
    <span className={cn("num font-medium", good ? "text-success" : "text-destructive")}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}% vs bulan lalu
    </span>
  );
}
