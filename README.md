# Pocket Wealth

Please build a modern, full-stack Personal Financial Management Web Application called "Hepeng History App" from scratch.

=========================================

1. AUTOMATED SUPABASE & DATABASE SETUP

=========================================

Automate the entire database initialization using Supabase migrations/SQL scripts:

1. Create Database Schema & Tables:

   - `wallets`:

     * id (uuid, primary key, default gen_random_uuid())

     * user_id (uuid, optional/auth.users)

     * name (text, e.g., 'BCA', 'BNI', 'GOPAY', 'SHOPEE PAY', 'CASH')

     * initial_balance (numeric, default 0)

     * created_at (timestamptz, default now())

   - `categories`:

     * id (uuid, primary key, default gen_random_uuid())

     * name (text, e.g., 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Gaji')

     * type (text: 'pengeluaran' | 'pemasukan')

     * subkategori (text, e.g., 'Jajan', 'Angkutan Umum', 'Gaji Pokok')

     * budgeting_type (text: 'Kebutuhan' | 'Keinginan' | 'Tabungan')

   - `transactions`:

     * id (uuid, primary key, default gen_random_uuid())

     * user_id (uuid, optional)

     * date (timestamptz)

     * description (text)

     * type (text: 'pengeluaran' | 'pemasukan' | 'transfer')

     * amount (numeric)

     * wallet_id (uuid, FK to wallets.id)

     * destination_wallet_id (uuid, nullable, FK to wallets.id for transfers)

     * category_id (uuid, nullable, FK to categories.id)

     * subkategori (text)

     * budgeting_type (text: 'Kebutuhan' | 'Keinginan' | 'Tabungan')

     * created_at (timestamptz, default now())

   - `category_budgets`:

     * id (uuid, primary key)

     * category_id (uuid, FK to categories.id)

     * monthly_limit (numeric)

     * period (text, format 'MM-YYYY')

   - `savings_goals`:

     * id (uuid, primary key)

     * name (text, e.g., 'Dana Darurat', 'Liburan')

     * target_amount (numeric)

     * current_amount (numeric, default 0)

     * deadline (date, nullable)

2. Create Database Views/Queries:

   - A SQL view or helper function to calculate real-time wallet balances dynamically:

     `realtime_balance = initial_balance + sum(pemasukan) - sum(pengeluaran) - sum(transfer_keluar) + sum(transfer_masuk)`

3. Auto-Seed Initial Data:

   - Automatically seed standard Indonesian financial categories into `categories` (e.g., Makan & Minum -> Keinginan/Kebutuhan, Transportasi -> Kebutuhan, Belanja Bulanan -> Kebutuhan, Tagihan & Utilitas -> Kebutuhan, Gaji -> Pemasukan, Cashback -> Pemasukan).

   - Seed default wallets into `wallets`: Cash, BCA, Mandiri, GoPay, ShopeePay.

4. Fallback Mock Data & Supabase Client:

   - Setup Supabase Client connecting via environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

   - Include a robust Mock Data State layer so that if Supabase keys are not yet connected, the application works 100% interactively with rich sample transactions and dashboard previews.

=========================================

2. UI/UX DESIGN & TECH STACK

=========================================

- Tech Stack: React (Vite/Next.js), Tailwind CSS, Lucide Icons, Recharts, Framer Motion, TypeScript, Supabase Client.

- Theme & Style: Modern Glassmorphism Dashboard, Mobile-first Responsive Layout, Dark/Light Mode toggle.

- Color Palette:

  * Income/Savings: Emerald Green (#10B981)

  * Expense/Warning: Rose Red (#EF4444) / Amber Yellow (#F59E0B)

  * Wallets/Budgets: Indigo (#6366F1) / Slate (#0F172A)

=========================================

3. CORE FEATURES & APPLICATION LOGIC

=========================================

1. Dashboard Overview:

   - Live Total Balance Scorecard (sum of all wallets).

   - Monthly Income vs Expense Scorecard with percentage growth vs last month.

   - Monthly Net Savings Scorecard with dynamic indicator badges ("✅ Keuangan Sehat" / "🔴 Defisit").

   - Wallet Carousel / Cards showing live balance & health status (Positif / Kosong / Negatif).

   - Top 5 Monthly Expenses Widget with progress indicators.

   - 50/30/20 Rule Budgeting Breakdown:

     * Kebutuhan (50% target) Realized vs Target.

     * Keinginan (30% target) Realized vs Target.

     * Tabungan (20% target) Realized vs Target.

2. Transaction Management:

   - Add/Edit/Delete Modal: Date/Time (with Backdate support), Description, Type (Pemasukan/Pengeluaran/Transfer), Amount, Source Wallet, Destination Wallet (if Transfer), Category, Subcategory, Budgeting Type.

   - Smart Auto-Categorization: Auto-matches description keywords to category & budgeting type (e.g., "Indomaret" -> Belanja/Kebutuhan, "GoFood" -> Jajan/Keinginan).

   - Filterable Transaction Table: Date range picker, Wallet filter, Category filter, Type filter, Search bar, and Pagination.

   - Quick Undo: Toast notification with 1-click Undo for recently created transactions.

3. AI OCR Receipt & Bank Statement Scanner (Gemini AI API):

   - Receipt OCR Mode: Upload receipt image -> Extract Store, Date, Nominal, Itemized list, Service Charge, Tax -> Save as Total or Itemized breakdown.

   - Bank Statement (Mutasi) Mode: Upload screenshot -> AI extracts all Debit/Credit transactions -> Review Modal -> Batch save into database.

4. Budgeting & Savings Goals:

   - Category Limit Progress Bars with color alerts (🟢 <50%, 🟡 80-99%, 🔴 >=100% OVERBUDGET).

   - Savings Goals Card Tracker with Deposit / Withdraw modal updates.

5. AI Financial Advisor & Analytics (Gemini AI):

   - Period Selector (Single Month, Month Range, Full Year).

   - AI Insight Generator: Spending habits summary, top leaks, transfer flow analysis, and 3 actionable savings tips with IDR estimated savings.

=========================================

4. NAVIGATION LAYOUT

=========================================

- Sidebar Navigation Items:

  1. 📊 Dashboard

  2. 📝 Transaksi

  3. 💳 Wallet / Dompet

  4. 🎯 Budget & Goals

  5. 🤖 AI Financial Advisor

  6. 📸 AI OCR Scanner

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dbf76a47-980b-4eed-bf53-6053975b1ce5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
