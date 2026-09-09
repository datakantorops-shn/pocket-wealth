import type { BudgetingType } from "./finance-types";

interface Rule {
  keywords: string[];
  subkategori: string;
  budgeting_type: BudgetingType;
}

// Smart auto-categorization: description keywords -> subcategory + budgeting type.
const RULES: Rule[] = [
  { keywords: ["gofood", "grabfood", "shopeefood", "jajan", "bakso", "seblak", "geprek", "martabak"], subkategori: "Jajan", budgeting_type: "Keinginan" },
  { keywords: ["kopi", "coffee", "starbucks", "kenangan", "janji jiwa", "cafe", "tuku"], subkategori: "Kopi & Cafe", budgeting_type: "Keinginan" },
  { keywords: ["warteg", "makan siang", "nasi", "padang", "catering", "sarapan"], subkategori: "Makan Harian", budgeting_type: "Kebutuhan" },
  { keywords: ["indomaret", "alfamart", "superindo", "hypermart", "groceries", "belanja bulanan", "sayur", "pasar"], subkategori: "Groceries", budgeting_type: "Kebutuhan" },
  { keywords: ["gojek", "grabbike", "grabcar", "maxim", "ojol", "ojek"], subkategori: "Ojek Online", budgeting_type: "Kebutuhan" },
  { keywords: ["transjakarta", "krl", "mrt", "busway", "angkot", "kereta"], subkategori: "Angkutan Umum", budgeting_type: "Kebutuhan" },
  { keywords: ["pertamina", "shell", "bensin", "pertalite", "solar", "spbu"], subkategori: "Bensin", budgeting_type: "Kebutuhan" },
  { keywords: ["pln", "listrik", "pdam", "air"], subkategori: "Listrik & Air", budgeting_type: "Kebutuhan" },
  { keywords: ["indihome", "wifi", "internet", "pulsa", "telkomsel", "by.u", "kuota"], subkategori: "Internet & Pulsa", budgeting_type: "Kebutuhan" },
  { keywords: ["kost", "kos", "sewa", "kontrakan", "apartemen"], subkategori: "Sewa / Kost", budgeting_type: "Kebutuhan" },
  { keywords: ["netflix", "spotify", "disney", "youtube premium", "vidio", "langganan"], subkategori: "Langganan Streaming", budgeting_type: "Keinginan" },
  { keywords: ["nonton", "cinema", "xxi", "cgv", "konser", "tiket", "wisata", "liburan"], subkategori: "Nonton & Rekreasi", budgeting_type: "Keinginan" },
  { keywords: ["shopee", "tokopedia", "lazada", "zalora", "sepatu", "baju", "fashion", "uniqlo"], subkategori: "Fashion", budgeting_type: "Keinginan" },
  { keywords: ["laptop", "hp ", "handphone", "gadget", "elektronik", "headset"], subkategori: "Elektronik", budgeting_type: "Keinginan" },
  { keywords: ["apotek", "klinik", "dokter", "obat", "rumah sakit", "bpjs"], subkategori: "Obat & Dokter", budgeting_type: "Kebutuhan" },
  { keywords: ["kursus", "buku", "gramedia", "les", "seminar", "udemy"], subkategori: "Kursus & Buku", budgeting_type: "Kebutuhan" },
  { keywords: ["reksadana", "saham", "bibit", "emas", "crypto", "investasi"], subkategori: "Reksadana / Saham", budgeting_type: "Tabungan" },
  { keywords: ["dana darurat", "tabungan", "nabung", "setor"], subkategori: "Dana Darurat", budgeting_type: "Tabungan" },
  { keywords: ["zakat", "sedekah", "donasi", "infaq"], subkategori: "Zakat & Sedekah", budgeting_type: "Kebutuhan" },
  { keywords: ["gaji", "payroll", "salary"], subkategori: "Gaji Pokok", budgeting_type: "Tabungan" },
  { keywords: ["bonus", "thr"], subkategori: "Bonus & THR", budgeting_type: "Tabungan" },
  { keywords: ["freelance", "proyek", "project", "invoice", "klien"], subkategori: "Proyek", budgeting_type: "Tabungan" },
  { keywords: ["cashback", "refund", "promo", "reward"], subkategori: "Promo & Refund", budgeting_type: "Tabungan" },
];

export function guessCategory(description: string): Rule | null {
  const text = description.toLowerCase();
  if (!text.trim()) return null;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule;
  }
  return null;
}
