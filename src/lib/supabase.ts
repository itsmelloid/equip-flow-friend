import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vpxlvdepsdkyzmaajxnh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_hGm2UF5g0pCfIO2EufTH2Q_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  },
});

export type Equipment = {
  id: string;
  equipment_name: string;
  category: string | null;
  asset_code: string;
  condition: string | null;
  availability: string;
  created_at?: string;
};

export type BorrowTransaction = {
  id: string;
  equipment_id: string;
  borrower_name: string;
  borrower_type: string;
  department: string | null;
  date_borrowed: string;
  due_date: string;
  date_returned: string | null;
  status: string;
  created_at?: string;
  equipment?: Pick<Equipment, "equipment_name" | "asset_code"> | null;
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Overdue is computed at render time, not trusted from the stored status. */
export function displayStatus(t: { status: string; due_date: string }) {
  if (t.status === "Returned") return "Returned";
  return t.due_date < todayISO() ? "Overdue" : t.status;
}
