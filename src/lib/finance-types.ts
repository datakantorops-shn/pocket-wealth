export type TxType = "pengeluaran" | "pemasukan" | "transfer";
export type BudgetingType = "Kebutuhan" | "Keinginan" | "Tabungan";

export interface Wallet {
  id: string;
  name: string;
  initial_balance: number;
  created_at?: string;
}

export interface WalletBalance extends Wallet {
  realtime_balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: "pengeluaran" | "pemasukan";
  subkategori: string | null;
  budgeting_type: BudgetingType | null;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: TxType;
  amount: number;
  wallet_id: string | null;
  destination_wallet_id: string | null;
  category_id: string | null;
  subkategori: string | null;
  budgeting_type: BudgetingType | null;
  created_at?: string;
}

export interface CategoryBudget {
  id: string;
  category_id: string | null;
  monthly_limit: number;
  period: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}
