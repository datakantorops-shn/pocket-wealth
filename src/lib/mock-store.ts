import type { Category, SavingsGoal, Transaction, Wallet, CategoryBudget } from "./finance-types";
import { monthKey } from "./format";

// Fallback interactive dataset used when the cloud database is unreachable
// (e.g. backend keys not configured yet). Everything stays in memory.
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const now = new Date();
const som = new Date(now.getFullYear(), now.getMonth(), 1);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const day = (base: Date, d: number, h = 10) =>
  new Date(base.getFullYear(), base.getMonth(), d, h).toISOString();

const wallets: Wallet[] = [
  { id: "w-cash", name: "Cash", initial_balance: 500000 },
  { id: "w-bca", name: "BCA", initial_balance: 7500000 },
  { id: "w-mandiri", name: "Mandiri", initial_balance: 3200000 },
  { id: "w-gopay", name: "GoPay", initial_balance: 250000 },
  { id: "w-spay", name: "ShopeePay", initial_balance: 150000 },
];

const rawCategories: Array<[string, "pengeluaran" | "pemasukan", string, Category["budgeting_type"]]> = [
  ["Makan & Minum", "pengeluaran", "Makan Harian", "Kebutuhan"],
  ["Makan & Minum", "pengeluaran", "Jajan", "Keinginan"],
  ["Makan & Minum", "pengeluaran", "Kopi & Cafe", "Keinginan"],
  ["Transportasi", "pengeluaran", "Angkutan Umum", "Kebutuhan"],
  ["Transportasi", "pengeluaran", "Bensin", "Kebutuhan"],
  ["Transportasi", "pengeluaran", "Ojek Online", "Kebutuhan"],
  ["Belanja Bulanan", "pengeluaran", "Groceries", "Kebutuhan"],
  ["Belanja", "pengeluaran", "Fashion", "Keinginan"],
  ["Belanja", "pengeluaran", "Elektronik", "Keinginan"],
  ["Tagihan & Utilitas", "pengeluaran", "Listrik & Air", "Kebutuhan"],
  ["Tagihan & Utilitas", "pengeluaran", "Internet & Pulsa", "Kebutuhan"],
  ["Tagihan & Utilitas", "pengeluaran", "Sewa / Kost", "Kebutuhan"],
  ["Hiburan", "pengeluaran", "Langganan Streaming", "Keinginan"],
  ["Hiburan", "pengeluaran", "Nonton & Rekreasi", "Keinginan"],
  ["Kesehatan", "pengeluaran", "Obat & Dokter", "Kebutuhan"],
  ["Pendidikan", "pengeluaran", "Kursus & Buku", "Kebutuhan"],
  ["Investasi", "pengeluaran", "Reksadana / Saham", "Tabungan"],
  ["Tabungan", "pengeluaran", "Dana Darurat", "Tabungan"],
  ["Donasi", "pengeluaran", "Zakat & Sedekah", "Kebutuhan"],
  ["Gaji", "pemasukan", "Gaji Pokok", "Tabungan"],
  ["Gaji", "pemasukan", "Bonus & THR", "Tabungan"],
  ["Freelance", "pemasukan", "Proyek", "Tabungan"],
  ["Cashback", "pemasukan", "Promo & Refund", "Tabungan"],
];

const categories: Category[] = rawCategories.map(([name, type, sub, bt]) => ({
  id: `c-${sub.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  name,
  type,
  subkategori: sub,
  budgeting_type: bt,
}));

const catBySub = (sub: string) => categories.find((c) => c.subkategori === sub)!;

function tx(
  date: string,
  description: string,
  type: Transaction["type"],
  amount: number,
  walletId: string,
  sub?: string,
  destination?: string,
): Transaction {
  const cat = sub ? catBySub(sub) : undefined;
  return {
    id: uid(),
    date,
    description,
    type,
    amount,
    wallet_id: walletId,
    destination_wallet_id: destination ?? null,
    category_id: cat?.id ?? null,
    subkategori: cat?.subkategori ?? null,
    budgeting_type: cat?.budgeting_type ?? null,
  };
}

const transactions: Transaction[] = [
  tx(day(som, 1, 9), "Gaji Bulanan PT Maju Jaya", "pemasukan", 12500000, "w-bca", "Gaji Pokok"),
  tx(day(som, 1, 11), "Bayar Kost bulan ini", "pengeluaran", 2200000, "w-bca", "Sewa / Kost"),
  tx(day(som, 2), "Tagihan Listrik PLN", "pengeluaran", 425000, "w-bca", "Listrik & Air"),
  tx(day(som, 2, 18), "Belanja Indomaret", "pengeluaran", 187000, "w-gopay", "Groceries"),
  tx(day(som, 3), "GoFood Ayam Geprek", "pengeluaran", 48000, "w-gopay", "Jajan"),
  tx(day(som, 3, 15), "Kopi Kenangan", "pengeluaran", 32000, "w-spay", "Kopi & Cafe"),
  tx(day(som, 4), "Gojek ke kantor", "pengeluaran", 27000, "w-gopay", "Ojek Online"),
  tx(day(som, 4, 12), "Makan siang warteg", "pengeluaran", 22000, "w-cash", "Makan Harian"),
  tx(day(som, 5), "Netflix + Spotify", "pengeluaran", 119000, "w-bca", "Langganan Streaming"),
  tx(day(som, 5, 16), "Belanja bulanan Superindo", "pengeluaran", 764000, "w-mandiri", "Groceries"),
  tx(day(som, 6), "Beli sepatu Shopee", "pengeluaran", 389000, "w-spay", "Fashion"),
  tx(day(som, 6, 14), "Internet IndiHome", "pengeluaran", 350000, "w-bca", "Internet & Pulsa"),
  tx(day(som, 7), "Setor Dana Darurat", "pengeluaran", 1500000, "w-bca", "Dana Darurat"),
  tx(day(som, 7, 17), "Freelance desain logo", "pemasukan", 1750000, "w-mandiri", "Proyek"),
  tx(day(som, 8), "Cashback ShopeePay", "pemasukan", 25000, "w-spay", "Promo & Refund"),
  tx(day(som, 8, 19), "Bensin Pertamina", "pengeluaran", 100000, "w-cash", "Bensin"),
  tx(day(som, 9), "Top up GoPay dari BCA", "transfer", 300000, "w-bca", undefined, "w-gopay"),
  tx(day(lastMonth, 1), "Gaji Bulanan PT Maju Jaya", "pemasukan", 12500000, "w-bca", "Gaji Pokok"),
  tx(day(lastMonth, 2), "Bayar Kost bulan lalu", "pengeluaran", 2200000, "w-bca", "Sewa / Kost"),
  tx(day(lastMonth, 4), "Belanja bulanan Alfamart", "pengeluaran", 1120000, "w-mandiri", "Groceries"),
  tx(day(lastMonth, 6), "GoFood mingguan", "pengeluaran", 420000, "w-gopay", "Jajan"),
  tx(day(lastMonth, 9), "Starbucks meeting", "pengeluaran", 165000, "w-bca", "Kopi & Cafe"),
  tx(day(lastMonth, 12), "Tagihan Listrik PLN", "pengeluaran", 468000, "w-bca", "Listrik & Air"),
  tx(day(lastMonth, 15), "Tiket konser", "pengeluaran", 750000, "w-bca", "Nonton & Rekreasi"),
  tx(day(lastMonth, 18), "Obat apotek", "pengeluaran", 96000, "w-cash", "Obat & Dokter"),
  tx(day(lastMonth, 20), "Setor Reksadana", "pengeluaran", 2000000, "w-bca", "Reksadana / Saham"),
  tx(day(lastMonth, 22), "Bonus proyek", "pemasukan", 900000, "w-mandiri", "Proyek"),
];

const budgets: CategoryBudget[] = (
  [
    ["Makan Harian", 1500000],
    ["Jajan", 600000],
    ["Kopi & Cafe", 400000],
    ["Ojek Online", 500000],
    ["Groceries", 1800000],
    ["Fashion", 700000],
    ["Langganan Streaming", 250000],
    ["Listrik & Air", 600000],
  ] as Array<[string, number]>
).map(([sub, limit]) => ({
  id: uid(),
  category_id: catBySub(sub).id,
  monthly_limit: limit,
  period: monthKey(),
}));

const goals: SavingsGoal[] = [
  { id: uid(), name: "Dana Darurat", target_amount: 30000000, current_amount: 8500000, deadline: "2027-06-30" },
  { id: uid(), name: "Liburan Bali", target_amount: 12000000, current_amount: 3200000, deadline: "2026-12-20" },
  { id: uid(), name: "Laptop Baru", target_amount: 20000000, current_amount: 4500000, deadline: null },
];

export const mockStore = { wallets, categories, transactions, budgets, goals, uid };

export let usingMockData = false;
export function markMockData() {
  usingMockData = true;
}
