import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { guessCategory } from "@/lib/auto-categorize";
import { toLocalInput } from "@/lib/format";
import type { BudgetingType, Transaction, TxType } from "@/lib/finance-types";
import { useFinance, useFinanceMutations, type TransactionInput } from "@/lib/finance-data";

const BUDGETING: BudgetingType[] = ["Kebutuhan", "Keinginan", "Tabungan"];

export function TransactionDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Transaction | null;
}) {
  const { data } = useFinance();
  const { createTransaction, updateTransaction, deleteTransaction } = useFinanceMutations();

  const [type, setType] = useState<TxType>("pengeluaran");
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [destWalletId, setDestWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgeting, setBudgeting] = useState<BudgetingType>("Kebutuhan");
  const [autoHint, setAutoHint] = useState<string | null>(null);

  const wallets = data?.wallets ?? [];
  const categories = useMemo(
    () => (data?.categories ?? []).filter((c) => (type === "pemasukan" ? c.type === "pemasukan" : c.type === "pengeluaran")),
    [data?.categories, type],
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDate(toLocalInput(new Date(editing.date)));
      setDescription(editing.description);
      setAmount(String(editing.amount));
      setWalletId(editing.wallet_id ?? "");
      setDestWalletId(editing.destination_wallet_id ?? "");
      setCategoryId(editing.category_id ?? "");
      setBudgeting((editing.budgeting_type as BudgetingType) ?? "Kebutuhan");
    } else {
      setType("pengeluaran");
      setDate(toLocalInput(new Date()));
      setDescription("");
      setAmount("");
      setWalletId(wallets[0]?.id ?? "");
      setDestWalletId("");
      setCategoryId("");
      setBudgeting("Kebutuhan");
    }
    setAutoHint(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Smart auto-categorization from the description keywords.
  useEffect(() => {
    if (type === "transfer" || !description.trim() || !data) return;
    const guess = guessCategory(description);
    if (!guess) return;
    const match = data.categories.find((c) => c.subkategori === guess.subkategori);
    if (!match) return;
    setCategoryId(match.id);
    setBudgeting(guess.budgeting_type);
    setAutoHint(`${match.name} · ${guess.subkategori} · ${guess.budgeting_type}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, type, data?.categories]);

  const submit = async () => {
    const value = Number(amount);
    if (!value || value <= 0) { toast.error("Nominal harus lebih dari 0"); return; }
    if (!walletId) { toast.error("Pilih dompet sumber"); return; }
    if (type === "transfer" && (!destWalletId || destWalletId === walletId))
      { toast.error("Pilih dompet tujuan yang berbeda"); return; }

    const cat = data?.categories.find((c) => c.id === categoryId);
    const payload: TransactionInput = {
      date: new Date(date).toISOString(),
      description: description.trim() || (type === "transfer" ? "Transfer antar dompet" : "Tanpa keterangan"),
      type,
      amount: value,
      wallet_id: walletId,
      destination_wallet_id: type === "transfer" ? destWalletId : null,
      category_id: type === "transfer" ? null : categoryId || null,
      subkategori: type === "transfer" ? null : (cat?.subkategori ?? null),
      budgeting_type: type === "transfer" ? null : budgeting,
    };

    try {
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, values: payload });
        toast.success("Transaksi diperbarui");
      } else {
        const created = await createTransaction.mutateAsync(payload);
        const newId = Array.isArray(created) ? created[0]?.id : undefined;
        toast.success("Transaksi ditambahkan", {
          description: payload.description,
          action: newId
            ? {
                label: "Undo",
                onClick: () => {
                  deleteTransaction.mutate(newId, {
                    onSuccess: () => toast.info("Transaksi dibatalkan"),
                  });
                },
              }
            : undefined,
          duration: 8000,
        });
      }
      onOpenChange(false);
    } catch {
      toast.error("Gagal menyimpan transaksi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
          <DialogDescription>
            Catat pemasukan, pengeluaran, atau transfer antar dompet. Backdate didukung.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Jenis</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["pengeluaran", "pemasukan", "transfer"] as TxType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  className="capitalize"
                  onClick={() => setType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Tanggal & Waktu</Label>
              <Input id="tx-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">Nominal (Rp)</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-desc">Keterangan</Label>
            <Input
              id="tx-desc"
              placeholder="contoh: GoFood ayam geprek"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {autoHint && (
              <p className="text-primary flex items-center gap-1.5 text-xs">
                <Sparkles className="size-3.5" /> Auto-kategori: {autoHint}
              </p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{type === "transfer" ? "Dari Dompet" : "Dompet"}</Label>
              <Select value={walletId} onValueChange={setWalletId}>
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

            {type === "transfer" ? (
              <div className="grid gap-2">
                <Label>Ke Dompet</Label>
                <Select value={destWalletId} onValueChange={setDestWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.subkategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {type !== "transfer" && (
            <div className="grid gap-2">
              <Label>Tipe Budgeting</Label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGETING.map((b) => (
                  <Button
                    key={b}
                    type="button"
                    variant={budgeting === b ? "secondary" : "outline"}
                    onClick={() => setBudgeting(b)}
                  >
                    {b}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteTransaction.mutateAsync(editing.id);
                toast.success("Transaksi dihapus");
                onOpenChange(false);
              }}
            >
              Hapus
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={createTransaction.isPending || updateTransaction.isPending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
