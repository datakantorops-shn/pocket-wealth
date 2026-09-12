import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Category,
  CategoryBudget,
  SavingsGoal,
  Transaction,
  Wallet,
  WalletBalance,
} from "./finance-types";

export interface FinanceSnapshot {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: SavingsGoal[];
}

async function fetchSnapshot(): Promise<FinanceSnapshot> {
  const [w, c, t, b, g] = await Promise.all([
    supabase.from("wallets").select("*").order("created_at"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("transactions").select("*").order("date", { ascending: false }).limit(2000),
    supabase.from("category_budgets").select("*"),
    supabase.from("savings_goals").select("*").order("created_at"),
  ]);
  const error = w.error || c.error || t.error || b.error || g.error;
  if (error) throw error;
  return {
    wallets: (w.data ?? []) as Wallet[],
    categories: (c.data ?? []) as Category[],
    transactions: (t.data ?? []) as Transaction[],
    budgets: (b.data ?? []) as CategoryBudget[],
    goals: (g.data ?? []) as SavingsGoal[],
  };
}

export const financeKey = ["finance"] as const;

export function useFinance() {
  return useQuery({ queryKey: financeKey, queryFn: fetchSnapshot, staleTime: 10_000 });
}

export function walletBalances(snap: FinanceSnapshot): WalletBalance[] {
  return snap.wallets.map((w) => {
    let bal = Number(w.initial_balance) || 0;
    for (const t of snap.transactions) {
      const amt = Number(t.amount) || 0;
      if (t.wallet_id === w.id) {
        if (t.type === "pemasukan") bal += amt;
        else bal -= amt;
      }
      if (t.type === "transfer" && t.destination_wallet_id === w.id) bal += amt;
    }
    return { ...w, realtime_balance: bal };
  });
}

export type TransactionInput = Omit<Transaction, "id" | "created_at">;

export function useFinanceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: financeKey });

  const createTransaction = useMutation({
    mutationFn: async (input: TransactionInput | TransactionInput[]) => {
      const rows = Array.isArray(input) ? input : [input];
      const { data, error } = await supabase.from("transactions").insert(rows).select();
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    onSuccess: invalidate,
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TransactionInput> }) => {
      const { error } = await supabase.from("transactions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createWallet = useMutation({
    mutationFn: async (values: { name: string; initial_balance: number }) => {
      const { error } = await supabase.from("wallets").insert(values);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateWallet = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: { name?: string; initial_balance?: number };
    }) => {
      const { error } = await supabase.from("wallets").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createCategory = useMutation({
    mutationFn: async (values: {
      name: string;
      type: "pengeluaran" | "pemasukan";
      subkategori: string;
      budgeting_type: string | null;
    }) => {
      const { data, error } = await supabase.from("categories").insert(values).select();
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    onSuccess: invalidate,
  });

  const deleteWallet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveBudget = useMutation({
    mutationFn: async (values: {
      id?: string;
      category_id: string;
      monthly_limit: number;
      period: string;
    }) => {
      if (values.id) {
        const { error } = await supabase
          .from("category_budgets")
          .update({ monthly_limit: values.monthly_limit })
          .eq("id", values.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("category_budgets").insert({
        category_id: values.category_id,
        monthly_limit: values.monthly_limit,
        period: values.period,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveGoal = useMutation({
    mutationFn: async (values: {
      id?: string;
      name: string;
      target_amount: number;
      current_amount: number;
      deadline: string | null;
    }) => {
      if (values.id) {
        const { id, ...rest } = values;
        const { error } = await supabase.from("savings_goals").update(rest).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("savings_goals").insert(values);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createWallet,
    updateWallet,
    deleteWallet,
    createCategory,
    saveBudget,
    saveGoal,
    deleteGoal,
  };
}
