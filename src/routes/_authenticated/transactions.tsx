import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayStatus, todayISO, type BorrowTransaction, type Equipment } from "@/lib/eqm";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — EquipTrack" },
      { name: "description", content: "Record borrowings, process returns and spot overdue items." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    borrower_name: "",
    borrower_type: "Student",
    department: "",
    equipment_id: "",
    date_borrowed: todayISO(),
    due_date: todayISO(),
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrow_transactions")
        .select("*, equipment:equipment_id (equipment_name, asset_code)")
        .order("date_borrowed", { ascending: false });
      if (error) throw error;
      return data as unknown as BorrowTransaction[];
    },
  });

  const { data: availableEquipment = [] } = useQuery({
    queryKey: ["equipment", "available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("availability", "Available")
        .order("equipment_name");
      if (error) throw error;
      return data as Equipment[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["equipment"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!form.borrower_name.trim()) throw new Error("Borrower name is required.");
      if (!form.equipment_id) throw new Error("Please choose an available equipment.");
      if (form.due_date < form.date_borrowed)
        throw new Error("Due date cannot be before the date borrowed.");

      const { error } = await supabase.from("borrow_transactions").insert({
        borrower_name: form.borrower_name.trim(),
        borrower_type: form.borrower_type,
        department: form.department.trim() || null,
        equipment_id: form.equipment_id,
        date_borrowed: form.date_borrowed,
        due_date: form.due_date,
        status: "Borrowed",
      });
      if (error) throw new Error(error.message);

      const upd = await supabase
        .from("equipment")
        .update({ availability: "Borrowed" })
        .eq("id", form.equipment_id);
      if (upd.error) throw new Error(upd.error.message);
    },
    onSuccess: () => {
      toast.success("Borrowing recorded.");
      setOpen(false);
      setForm({
        borrower_name: "",
        borrower_type: "Student",
        department: "",
        equipment_id: "",
        date_borrowed: todayISO(),
        due_date: todayISO(),
      });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const returnItem = useMutation({
    mutationFn: async (t: BorrowTransaction) => {
      if (t.status === "Returned") throw new Error("This item was already returned.");
      const { error } = await supabase
        .from("borrow_transactions")
        .update({ date_returned: todayISO(), status: "Returned" })
        .eq("id", t.id)
        .neq("status", "Returned");
      if (error) throw new Error(error.message);
      const upd = await supabase
        .from("equipment")
        .update({ availability: "Available" })
        .eq("id", t.equipment_id);
      if (upd.error) throw new Error(upd.error.message);
    },
    onSuccess: () => {
      toast.success("Equipment returned.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch = !q || t.borrower_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || displayStatus(t) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transactions, search, statusFilter]);

  return (
    <AppShell title="Transactions" subtitle="Borrowings, returns and overdue monitoring.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by borrower name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="Borrowed">Borrowed</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New borrowing transaction
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Borrower</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Department</th>
                <th className="p-3 font-medium">Equipment</th>
                <th className="p-3 font-medium">Borrowed</th>
                <th className="p-3 font-medium">Due</th>
                <th className="p-3 font-medium">Returned</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={9}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const status = displayStatus(t);
                  return (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="p-3 font-medium">{t.borrower_name}</td>
                      <td className="p-3 text-muted-foreground">{t.borrower_type}</td>
                      <td className="p-3 text-muted-foreground">{t.department ?? "—"}</td>
                      <td className="p-3">
                        {t.equipment?.equipment_name ?? "—"}
                        <span className="block font-mono text-xs text-muted-foreground">
                          {t.equipment?.asset_code}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{t.date_borrowed}</td>
                      <td className="p-3 text-muted-foreground">{t.due_date}</td>
                      <td className="p-3 text-muted-foreground">{t.date_returned ?? "—"}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            status === "Returned"
                              ? "default"
                              : status === "Overdue"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {status !== "Returned" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={returnItem.isPending}
                            onClick={() => returnItem.mutate(t)}
                          >
                            Return equipment
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New borrowing transaction</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="borrower">Borrower name *</Label>
              <Input
                id="borrower"
                required
                value={form.borrower_name}
                onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Borrower type</Label>
                <Select
                  value={form.borrower_type}
                  onValueChange={(v) => setForm({ ...form, borrower_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Faculty">Faculty</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept">Department</Label>
                <Input
                  id="dept"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Equipment (available only) *</Label>
              <Select
                value={form.equipment_id}
                onValueChange={(v) => setForm({ ...form, equipment_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose equipment" />
                </SelectTrigger>
                <SelectContent>
                  {availableEquipment.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available equipment.
                    </div>
                  ) : (
                    availableEquipment.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.equipment_name} ({e.asset_code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="borrowed">Date borrowed</Label>
                <Input
                  id="borrowed"
                  type="date"
                  value={form.date_borrowed}
                  onChange={(e) => setForm({ ...form, date_borrowed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due date</Label>
                <Input
                  id="due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Record borrowing"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
