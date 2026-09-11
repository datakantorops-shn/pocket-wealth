import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Target, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, GlassPanel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinance, useFinanceMutations } from "@/lib/finance-data";
import { endOfMonth, formatDate, formatIDR, monthKey, monthLabel, startOfMonth } from "@/lib/format";
import type { SavingsGoal } from "@/lib/finance-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Budget & Goals — Hepeng History App" },
      {
        name: "description",
        content:
          "Atur limit bulanan per kategori dan pantau progres target tabungan seperti dana darurat dan liburan.",
      },
      { property: "og:title", content: "Budget & Goals — Hepeng History App" },
      {
        property: "og:description",
        content: "Limit kategori dengan peringatan overbudget dan tracker target tabungan.",
      },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const { data } = useFinance();
  const { saveBudget, saveGoal, deleteGoal } = useFinanceMutations();
  const period = monthKey();

  const [limitOpen, setLimitOpen] = useState(false);
  const [limitCategory, setLimitCategory] = useState("");
  const [limitValue, setLimitValue] = useState("");

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  const [moveGoal, setMoveGoal] = useState<SavingsGoal | null>(null);
  const [moveMode, setMoveMode] = useState<"deposit" | "withdraw">("deposit");
  const [moveAmount, setMoveAmount] = useState("");

  const budgetRows = useMemo(() => {
    if (!data) return [];
    const som = startOfMonth(new Date());
    const eom = endOfMonth(new Date());
    return data.budgets
      .filter((b) => b.period === period)
      .map((b) => {
        const cat = data.categories.find((c) => c.id === b.category_id);
        const spent = data.transactions
          .filter(
            (t) =>
              t.type === "pengeluaran" &&
              t.category_id === b.category_id &&
              +new Date(t.date) >= +som &&
              +new Date(t.date) <= +eom,
          )
          .reduce((a, t) => a + Number(t.amount), 0);
        const limit = Number(b.monthly_limit) || 0;
        const pct = limit ? (spent / limit) * 100 : 0;
        return { ...b, cat, spent, limit, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [data, period]);

  const submitLimit = async () => {
    if (!limitCategory) { toast.error("Pilih kategori"); return; }
    const value = Number(limitValue);
    if (!value || value <= 0) { toast.error("Limit harus lebih dari 0"); return; }
    const existing = data?.budgets.find((b) => b.category_id === limitCategory && b.period === period);
    await saveBudget.mutateAsync({
      id: existing?.id,
      category_id: limitCategory,
      monthly_limit: value,
      period,
    });
    toast.success("Limit kategori disimpan");
    setLimitOpen(false);
    setLimitCategory("");
    setLimitValue("");
  };

  const submitGoal = async () => {
    if (!goalName.trim()) { toast.error("Nama target wajib diisi"); return; }
    const target = Number(goalTarget);
    if (!target || target <= 0) { toast.error("Target harus lebih dari 0"); return; }
    await saveGoal.mutateAsync({
      name: goalName.trim(),
      target_amount: target,
      current_amount: 0,
      deadline: goalDeadline || null,
    });
    toast.success("Target tabungan dibuat");
    setGoalOpen(false);
    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
  };

  const submitMove = async () => {
    if (!moveGoal) return;
    const value = Number(moveAmount);
    if (!value || value <= 0) { toast.error("Nominal harus lebih dari 0"); return; }
    const next =
      moveMode === "deposit"
        ? Number(moveGoal.current_amount) + value
        : Math.max(0, Number(moveGoal.current_amount) - value);
    await saveGoal.mutateAsync({
      id: moveGoal.id,
      name: moveGoal.name,
      target_amount: Number(moveGoal.target_amount),
      current_amount: next,
      deadline: moveGoal.deadline,
    });
    toast.success(moveMode === "deposit" ? "Setoran dicatat" : "Penarikan dicatat");
    setMoveGoal(null);
    setMoveAmount("");
  };

  return (
    <AppShell
      title="Budget & Goals"
      subtitle={`Periode ${monthLabel(new Date())}`}
      actions={
        <Button className="gap-2" onClick={() => setLimitOpen(true)}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Limit</span>
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Limit per Kategori</h2>
            <Badge variant="outline">{budgetRows.length} kategori</Badge>
          </div>

          {budgetRows.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Belum ada limit bulan ini. Tambahkan lewat tombol Limit.
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {budgetRows.map((b) => {
                const state = b.pct >= 100 ? "over" : b.pct >= 80 ? "warn" : "ok";
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">
                        {b.cat?.subkategori ?? "Kategori"}{" "}
                        <span className="text-muted-foreground text-xs">{b.cat?.name}</span>
                      </span>
                      <span className="num shrink-0 text-xs">
                        {formatIDR(b.spent, { compact: true })} / {formatIDR(b.limit, { compact: true })}
                      </span>
                    </div>
                    <div className="bg-muted mt-2 h-2.5 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          state === "over"
                            ? "bg-destructive"
                            : state === "warn"
                              ? "bg-warning"
                              : "bg-success",
                        )}
                        style={{ width: `${Math.min(b.pct, 100)}%` }}
                      />
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        state === "over"
                          ? "text-destructive font-semibold"
                          : state === "warn"
                            ? "text-warning"
                            : "text-muted-foreground",
                      )}
                    >
                      {state === "over"
                        ? `🔴 OVERBUDGET ${b.pct.toFixed(0)}%`
                        : state === "warn"
                          ? `🟡 Hampir limit ${b.pct.toFixed(0)}%`
                          : `🟢 Aman ${b.pct.toFixed(0)}%`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Target Tabungan</h2>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setGoalOpen(true)}>
              <Target className="size-4" /> Target baru
            </Button>
          </div>

          <div className="mt-4 grid gap-4">
            {(data?.goals ?? []).map((g) => {
              const pct = Number(g.target_amount)
                ? (Number(g.current_amount) / Number(g.target_amount)) * 100
                : 0;
              return (
                <div key={g.id} className="bg-accent/40 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {g.deadline ? `Target selesai ${formatDate(g.deadline)}` : "Tanpa tenggat"}
                      </p>
                    </div>
                    <Badge variant="outline" className={pct >= 100 ? "text-success" : ""}>
                      {pct.toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="num mt-3 text-lg font-bold">
                    {formatIDR(Number(g.current_amount))}{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      dari {formatIDR(Number(g.target_amount))}
                    </span>
                  </p>
                  <div className="bg-muted mt-2 h-2.5 overflow-hidden rounded-full">
                    <div
                      className="bg-success h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMoveGoal(g);
                        setMoveMode("deposit");
                      }}
                    >
                      Setor
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMoveGoal(g);
                        setMoveMode("withdraw");
                      }}
                    >
                      Tarik
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        await deleteGoal.mutateAsync(g.id);
                        toast.success("Target dihapus");
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
            {(data?.goals ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">Belum ada target tabungan.</p>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Limit dialog */}
      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atur Limit Kategori</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={limitCategory} onValueChange={setLimitCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori pengeluaran" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.categories ?? [])
                    .filter((c) => c.type === "pengeluaran")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.subkategori}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="limit-value">Limit bulanan (Rp)</Label>
              <Input
                id="limit-value"
                type="number"
                placeholder="0"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitLimit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Target Tabungan Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="goal-name">Nama target</Label>
              <Input
                id="goal-name"
                placeholder="contoh: Dana Darurat"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-target">Nominal target (Rp)</Label>
              <Input
                id="goal-target"
                type="number"
                placeholder="0"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-deadline">Tenggat (opsional)</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitGoal}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit / withdraw dialog */}
      <Dialog open={!!moveGoal} onOpenChange={(v) => !v && setMoveGoal(null)}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {moveMode === "deposit" ? "Setor ke" : "Tarik dari"} {moveGoal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="move-amount">Nominal (Rp)</Label>
            <Input
              id="move-amount"
              type="number"
              placeholder="0"
              value={moveAmount}
              onChange={(e) => setMoveAmount(e.target.value)}
            />
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <WalletIcon className="size-3.5" /> Saldo target saat ini{" "}
              {formatIDR(Number(moveGoal?.current_amount ?? 0))}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveGoal(null)}>
              Batal
            </Button>
            <Button onClick={submitMove}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
