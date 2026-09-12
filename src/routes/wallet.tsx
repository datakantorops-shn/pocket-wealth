import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wallet as WalletIcon } from "lucide-react";
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
import { useFinance, useFinanceMutations, walletBalances } from "@/lib/finance-data";
import { formatIDR, startOfMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Dompet — Hepeng History App" },
      {
        name: "description",
        content: "Kelola dompet tunai, bank, dan e-wallet dengan saldo real-time dan status kesehatan.",
      },
      { property: "og:title", content: "Dompet — Hepeng History App" },
      {
        property: "og:description",
        content: "Saldo real-time tiap dompet, arus masuk dan keluar bulan ini.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data } = useFinance();
  const { createWallet, updateWallet, deleteWallet } = useFinanceMutations();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    const som = startOfMonth(new Date());
    return walletBalances(data).map((w) => {
      const monthTx = data.transactions.filter((t) => +new Date(t.date) >= +som);
      const income =
        monthTx
          .filter((t) => t.wallet_id === w.id && t.type === "pemasukan")
          .reduce((a, t) => a + Number(t.amount), 0) +
        monthTx
          .filter((t) => t.type === "transfer" && t.destination_wallet_id === w.id)
          .reduce((a, t) => a + Number(t.amount), 0);
      const expense = monthTx
        .filter((t) => t.wallet_id === w.id && t.type !== "pemasukan")
        .reduce((a, t) => a + Number(t.amount), 0);
      const count = data.transactions.filter(
        (t) => t.wallet_id === w.id || t.destination_wallet_id === w.id,
      ).length;
      return { ...w, income, expense, count };
    });
  }, [data]);

  const total = rows.reduce((a, w) => a + w.realtime_balance, 0);

  const submit = async () => {
    if (!name.trim()) { toast.error("Nama dompet wajib diisi"); return; }
    const values = { name: name.trim(), initial_balance: Number(initial) || 0 };
    if (editingId) {
      await updateWallet.mutateAsync({ id: editingId, values });
      toast.success("Dompet diperbarui");
    } else {
      await createWallet.mutateAsync(values);
      toast.success("Dompet ditambahkan");
    }
    setName("");
    setInitial("");
    setEditingId(null);
    setOpen(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setInitial("");
    setOpen(true);
  };

  const openEdit = (w: { id: string; name: string; initial_balance: number }) => {
    setEditingId(w.id);
    setName(w.name);
    setInitial(String(Number(w.initial_balance) || 0));
    setOpen(true);
  };

  return (
    <AppShell
      title="Wallet / Dompet"
      subtitle={`Total saldo ${formatIDR(total)}`}
      actions={
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Dompet</span>
        </Button>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((w) => {
          const status =
            w.realtime_balance > 0 ? "Positif" : w.realtime_balance === 0 ? "Kosong" : "Negatif";
          return (
            <GlassPanel key={w.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary grid size-10 place-items-center rounded-xl">
                    <WalletIcon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-muted-foreground text-xs">{w.count} transaksi</p>
                  </div>
                </div>
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

              <p className="num mt-4 text-2xl font-bold">{formatIDR(w.realtime_balance)}</p>
              <p className="text-muted-foreground text-xs">
                Saldo awal {formatIDR(Number(w.initial_balance))}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-success/10 rounded-xl p-3">
                  <p className="text-muted-foreground">Masuk bulan ini</p>
                  <p className="num text-success mt-1 font-semibold">{formatIDR(w.income)}</p>
                </div>
                <div className="bg-destructive/10 rounded-xl p-3">
                  <p className="text-muted-foreground">Keluar bulan ini</p>
                  <p className="num text-destructive mt-1 font-semibold">{formatIDR(w.expense)}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive mt-3 gap-2"
                onClick={async () => {
                  await deleteWallet.mutateAsync(w.id);
                  toast.success(`Dompet ${w.name} dihapus`);
                }}
              >
                <Trash2 className="size-4" /> Hapus dompet
              </Button>
            </GlassPanel>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Dompet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="w-name">Nama dompet</Label>
              <Input
                id="w-name"
                placeholder="contoh: BNI, DANA, OVO"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="w-init">Saldo awal (Rp)</Label>
              <Input
                id="w-init"
                type="number"
                placeholder="0"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
