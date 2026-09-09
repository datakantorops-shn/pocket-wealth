import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ArrowLeftRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AppShell, GlassPanel } from "@/components/AppShell";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinance } from "@/lib/finance-data";
import { formatDateTime, formatIDR } from "@/lib/format";
import type { Transaction } from "@/lib/finance-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transaksi")({
  head: () => ({
    meta: [
      { title: "Transaksi — Hepeng History App" },
      {
        name: "description",
        content:
          "Catat, cari, dan filter semua transaksi pemasukan, pengeluaran, dan transfer antar dompet.",
      },
      { property: "og:title", content: "Transaksi — Hepeng History App" },
      {
        property: "og:description",
        content: "Tabel transaksi lengkap dengan filter tanggal, dompet, kategori, dan pencarian.",
      },
    ],
  }),
  component: TransaksiPage,
});

const PER_PAGE = 12;

function TransaksiPage() {
  const { data } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [wallet, setWallet] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const walletName = (id: string | null) => data?.wallets.find((w) => w.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => {
    const c = data?.categories.find((x) => x.id === id);
    return c ? `${c.name} · ${c.subkategori}` : "—";
  };

  const filtered = useMemo(() => {
    let list = data?.transactions ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.subkategori ?? "").toLowerCase().includes(q),
      );
    }
    if (type !== "all") list = list.filter((t) => t.type === type);
    if (wallet !== "all")
      list = list.filter((t) => t.wallet_id === wallet || t.destination_wallet_id === wallet);
    if (category !== "all") list = list.filter((t) => t.category_id === category);
    if (from) list = list.filter((t) => +new Date(t.date) >= +new Date(from));
    if (to) list = list.filter((t) => +new Date(t.date) <= +new Date(`${to}T23:59:59`));
    return list;
  }, [data?.transactions, search, type, wallet, category, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const totals = useMemo(
    () => ({
      in: filtered.filter((t) => t.type === "pemasukan").reduce((a, t) => a + Number(t.amount), 0),
      out: filtered.filter((t) => t.type === "pengeluaran").reduce((a, t) => a + Number(t.amount), 0),
    }),
    [filtered],
  );

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <AppShell
      title="Transaksi"
      subtitle={`${filtered.length} transaksi · masuk ${formatIDR(totals.in, { compact: true })} · keluar ${formatIDR(totals.out, { compact: true })}`}
      actions={
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" /> <span className="hidden sm:inline">Tambah</span>
        </Button>
      }
    >
      <GlassPanel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5 lg:col-span-1">
            <Label>Cari</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Cari keterangan…"
                value={search}
                onChange={(e) => resetPage(setSearch)(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Jenis</Label>
            <Select value={type} onValueChange={resetPage(setType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua jenis</SelectItem>
                <SelectItem value="pemasukan">Pemasukan</SelectItem>
                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Dompet</Label>
            <Select value={wallet} onValueChange={resetPage(setWallet)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua dompet</SelectItem>
                {(data?.wallets ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={resetPage(setCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.subkategori}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Dari tanggal</Label>
            <Input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Sampai tanggal</Label>
            <Input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <div className="divide-border divide-y">
          {rows.length === 0 && (
            <p className="text-muted-foreground p-8 text-center text-sm">
              Tidak ada transaksi yang cocok dengan filter.
            </p>
          )}
          {rows.map((t) => {
            const isIn = t.type === "pemasukan";
            const isTransfer = t.type === "transfer";
            return (
              <button
                key={t.id}
                onClick={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                className="hover:bg-accent/40 flex w-full items-center gap-4 px-4 py-3 text-left transition-colors sm:px-5"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    isTransfer
                      ? "bg-primary/15 text-primary"
                      : isIn
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive",
                  )}
                >
                  {isTransfer ? (
                    <ArrowLeftRight className="size-4" />
                  ) : isIn ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {formatDateTime(t.date)} ·{" "}
                    {isTransfer
                      ? `${walletName(t.wallet_id)} → ${walletName(t.destination_wallet_id)}`
                      : `${walletName(t.wallet_id)} · ${categoryName(t.category_id)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "num text-sm font-semibold",
                      isTransfer ? "text-primary" : isIn ? "text-success" : "text-destructive",
                    )}
                  >
                    {isIn ? "+" : isTransfer ? "" : "-"}
                    {formatIDR(Number(t.amount))}
                  </p>
                  {t.budgeting_type && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {t.budgeting_type}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length > PER_PAGE && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm sm:px-5">
            <span className="text-muted-foreground text-xs">
              Halaman {current} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= totalPages}
                onClick={() => setPage(current + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </GlassPanel>

      <TransactionDialog open={open} onOpenChange={setOpen} editing={editing} />
    </AppShell>
  );
}
