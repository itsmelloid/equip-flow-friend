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
  equipment?: { equipment_name: string; asset_code: string } | null;
};

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Overdue is computed at render time, never trusted from the stored status. */
export function displayStatus(t: { status: string; due_date: string }) {
  if (t.status === "Returned") return "Returned";
  return t.due_date < todayISO() ? "Overdue" : t.status;
}
