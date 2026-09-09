
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO anon, authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets open access" ON public.wallets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pengeluaran',
  subkategori text,
  budgeting_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories open access" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'pengeluaran',
  amount numeric NOT NULL DEFAULT 0,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  destination_wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  subkategori text,
  budgeting_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_date_idx ON public.transactions(date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions open access" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit numeric NOT NULL DEFAULT 0,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_budgets TO anon, authenticated;
GRANT ALL ON public.category_budgets TO service_role;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_budgets open access" ON public.category_budgets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO anon, authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "savings_goals open access" ON public.savings_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE VIEW public.wallet_balances
WITH (security_invoker = true)
AS
SELECT w.id,
       w.name,
       w.initial_balance,
       w.created_at,
       w.initial_balance
         + COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.wallet_id = w.id AND t.type = 'pemasukan'), 0)
         - COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.wallet_id = w.id AND t.type = 'pengeluaran'), 0)
         - COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.wallet_id = w.id AND t.type = 'transfer'), 0)
         + COALESCE((SELECT sum(t.amount) FROM public.transactions t WHERE t.destination_wallet_id = w.id AND t.type = 'transfer'), 0)
       AS realtime_balance
FROM public.wallets w;
GRANT SELECT ON public.wallet_balances TO anon, authenticated, service_role;

INSERT INTO public.wallets (name, initial_balance) VALUES
  ('Cash', 500000),
  ('BCA', 7500000),
  ('Mandiri', 3200000),
  ('GoPay', 250000),
  ('ShopeePay', 150000);

INSERT INTO public.categories (name, type, subkategori, budgeting_type) VALUES
  ('Makan & Minum', 'pengeluaran', 'Makan Harian', 'Kebutuhan'),
  ('Makan & Minum', 'pengeluaran', 'Jajan', 'Keinginan'),
  ('Makan & Minum', 'pengeluaran', 'Kopi & Cafe', 'Keinginan'),
  ('Transportasi', 'pengeluaran', 'Angkutan Umum', 'Kebutuhan'),
  ('Transportasi', 'pengeluaran', 'Bensin', 'Kebutuhan'),
  ('Transportasi', 'pengeluaran', 'Ojek Online', 'Kebutuhan'),
  ('Belanja Bulanan', 'pengeluaran', 'Groceries', 'Kebutuhan'),
  ('Belanja', 'pengeluaran', 'Fashion', 'Keinginan'),
  ('Belanja', 'pengeluaran', 'Elektronik', 'Keinginan'),
  ('Tagihan & Utilitas', 'pengeluaran', 'Listrik & Air', 'Kebutuhan'),
  ('Tagihan & Utilitas', 'pengeluaran', 'Internet & Pulsa', 'Kebutuhan'),
  ('Tagihan & Utilitas', 'pengeluaran', 'Sewa / Kost', 'Kebutuhan'),
  ('Hiburan', 'pengeluaran', 'Langganan Streaming', 'Keinginan'),
  ('Hiburan', 'pengeluaran', 'Nonton & Rekreasi', 'Keinginan'),
  ('Kesehatan', 'pengeluaran', 'Obat & Dokter', 'Kebutuhan'),
  ('Pendidikan', 'pengeluaran', 'Kursus & Buku', 'Kebutuhan'),
  ('Investasi', 'pengeluaran', 'Reksadana / Saham', 'Tabungan'),
  ('Tabungan', 'pengeluaran', 'Dana Darurat', 'Tabungan'),
  ('Donasi', 'pengeluaran', 'Zakat & Sedekah', 'Kebutuhan'),
  ('Gaji', 'pemasukan', 'Gaji Pokok', 'Tabungan'),
  ('Gaji', 'pemasukan', 'Bonus & THR', 'Tabungan'),
  ('Freelance', 'pemasukan', 'Proyek', 'Tabungan'),
  ('Cashback', 'pemasukan', 'Promo & Refund', 'Tabungan'),
  ('Lainnya', 'pemasukan', 'Pendapatan Lain', 'Tabungan');

INSERT INTO public.savings_goals (name, target_amount, current_amount, deadline) VALUES
  ('Dana Darurat', 30000000, 8500000, '2027-06-30'),
  ('Liburan Bali', 12000000, 3200000, '2026-12-20'),
  ('Laptop Baru', 20000000, 4500000, NULL);
