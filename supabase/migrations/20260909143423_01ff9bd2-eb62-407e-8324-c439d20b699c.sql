
INSERT INTO public.category_budgets (category_id, monthly_limit, period)
SELECT c.id, v.lim, to_char(now(), 'MM-YYYY')
FROM (VALUES
  ('Makan Harian', 1500000::numeric),
  ('Jajan', 600000),
  ('Kopi & Cafe', 400000),
  ('Ojek Online', 500000),
  ('Groceries', 1800000),
  ('Fashion', 700000),
  ('Langganan Streaming', 250000),
  ('Listrik & Air', 600000)
) AS v(sub, lim)
JOIN public.categories c ON c.subkategori = v.sub;

WITH w AS (SELECT name, id FROM public.wallets),
c AS (SELECT subkategori, id, budgeting_type FROM public.categories)
INSERT INTO public.transactions (date, description, type, amount, wallet_id, category_id, subkategori, budgeting_type)
SELECT
  d.dt, d.descr, d.tp, d.amt,
  (SELECT id FROM w WHERE name = d.wal),
  (SELECT id FROM c WHERE subkategori = d.sub),
  d.sub,
  (SELECT budgeting_type FROM c WHERE subkategori = d.sub)
FROM (VALUES
  (date_trunc('month', now()) + interval '1 day', 'Gaji Bulanan PT Maju Jaya', 'pemasukan', 12500000::numeric, 'BCA', 'Gaji Pokok'),
  (date_trunc('month', now()) + interval '1 day 2 hour', 'Bayar Kost September', 'pengeluaran', 2200000, 'BCA', 'Sewa / Kost'),
  (date_trunc('month', now()) + interval '2 day', 'Tagihan Listrik PLN', 'pengeluaran', 425000, 'BCA', 'Listrik & Air'),
  (date_trunc('month', now()) + interval '2 day 3 hour', 'Belanja Indomaret', 'pengeluaran', 187000, 'GoPay', 'Groceries'),
  (date_trunc('month', now()) + interval '3 day', 'GoFood Ayam Geprek', 'pengeluaran', 48000, 'GoPay', 'Jajan'),
  (date_trunc('month', now()) + interval '3 day 5 hour', 'Kopi Kenangan', 'pengeluaran', 32000, 'ShopeePay', 'Kopi & Cafe'),
  (date_trunc('month', now()) + interval '4 day', 'Gojek ke kantor', 'pengeluaran', 27000, 'GoPay', 'Ojek Online'),
  (date_trunc('month', now()) + interval '4 day 6 hour', 'Makan siang warteg', 'pengeluaran', 22000, 'Cash', 'Makan Harian'),
  (date_trunc('month', now()) + interval '5 day', 'Netflix + Spotify', 'pengeluaran', 119000, 'BCA', 'Langganan Streaming'),
  (date_trunc('month', now()) + interval '5 day 4 hour', 'Belanja bulanan Superindo', 'pengeluaran', 764000, 'Mandiri', 'Groceries'),
  (date_trunc('month', now()) + interval '6 day', 'Beli sepatu Shopee', 'pengeluaran', 389000, 'ShopeePay', 'Fashion'),
  (date_trunc('month', now()) + interval '6 day 2 hour', 'Internet IndiHome', 'pengeluaran', 350000, 'BCA', 'Internet & Pulsa'),
  (date_trunc('month', now()) + interval '7 day', 'Setor Dana Darurat', 'pengeluaran', 1500000, 'BCA', 'Dana Darurat'),
  (date_trunc('month', now()) + interval '7 day 3 hour', 'Freelance desain logo', 'pemasukan', 1750000, 'Mandiri', 'Proyek'),
  (date_trunc('month', now()) + interval '8 day', 'Cashback ShopeePay', 'pemasukan', 25000, 'ShopeePay', 'Promo & Refund'),
  (date_trunc('month', now()) + interval '8 day 5 hour', 'Bensin Pertamina', 'pengeluaran', 100000, 'Cash', 'Bensin'),
  (date_trunc('month', now()) - interval '1 month' + interval '1 day', 'Gaji Bulanan PT Maju Jaya', 'pemasukan', 12500000, 'BCA', 'Gaji Pokok'),
  (date_trunc('month', now()) - interval '1 month' + interval '2 day', 'Bayar Kost Agustus', 'pengeluaran', 2200000, 'BCA', 'Sewa / Kost'),
  (date_trunc('month', now()) - interval '1 month' + interval '4 day', 'Belanja bulanan Alfamart', 'pengeluaran', 1120000, 'Mandiri', 'Groceries'),
  (date_trunc('month', now()) - interval '1 month' + interval '6 day', 'GoFood mingguan', 'pengeluaran', 420000, 'GoPay', 'Jajan'),
  (date_trunc('month', now()) - interval '1 month' + interval '9 day', 'Starbucks meeting', 'pengeluaran', 165000, 'BCA', 'Kopi & Cafe'),
  (date_trunc('month', now()) - interval '1 month' + interval '12 day', 'Tagihan Listrik PLN', 'pengeluaran', 468000, 'BCA', 'Listrik & Air'),
  (date_trunc('month', now()) - interval '1 month' + interval '15 day', 'Tiket konser', 'pengeluaran', 750000, 'BCA', 'Nonton & Rekreasi'),
  (date_trunc('month', now()) - interval '1 month' + interval '18 day', 'Obat apotek', 'pengeluaran', 96000, 'Cash', 'Obat & Dokter'),
  (date_trunc('month', now()) - interval '1 month' + interval '20 day', 'Setor Reksadana', 'pengeluaran', 2000000, 'BCA', 'Reksadana / Saham'),
  (date_trunc('month', now()) - interval '1 month' + interval '22 day', 'Bonus proyek', 'pemasukan', 900000, 'Mandiri', 'Proyek')
) AS d(dt, descr, tp, amt, wal, sub);

INSERT INTO public.transactions (date, description, type, amount, wallet_id, destination_wallet_id)
SELECT date_trunc('month', now()) + interval '9 day',
       'Top up GoPay dari BCA', 'transfer', 300000,
       (SELECT id FROM public.wallets WHERE name = 'BCA'),
       (SELECT id FROM public.wallets WHERE name = 'GoPay');
