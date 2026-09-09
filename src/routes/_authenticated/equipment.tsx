import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayStatus, type BorrowTransaction, type Equipment } from "@/lib/eqm";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment — EquipTrack" },
      { name: "description", content: "Add, edit and monitor every item in your inventory." },
    ],
  }),
  component: EquipmentPage,
});

type FormState = {
  equipment_name: string;
  category: string;
  asset_code: string;
  condition: string;
  availability: string;
};

const emptyForm: FormState = {
  equipment_name: "",
  category: "",
  asset_code: "",
  condition: "Good",
  availability: "Available",
};

function EquipmentPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [selected, setSelected] = useState<Equipment | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["equipment-history", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrow_transactions")
        .select("*")
        .eq("equipment_id", selected!.id)
        .order("date_borrowed", { ascending: false });
      if (error) throw error;
      return data as BorrowTransaction[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        equipment_name: form.equipment_name.trim(),
        category: form.category.trim() || null,
        asset_code: form.asset_code.trim(),
        condition: form.condition.trim() || null,
        availability: form.availability,
      };
      if (!payload.equipment_name) throw new Error("Equipment name is required.");
      if (!payload.asset_code) throw new Error("Asset code is required.");
      const res = editing
        ? await supabase.from("equipment").update(payload).eq("id", editing.id)
        : await supabase.from("equipment").insert(payload);
      if (res.error) {
        throw new Error(
          res.error.code === "23505"
            ? "That asset code is already used by another item."
            : res.error.message,
        );
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Equipment updated." : "Equipment added.");
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (item: Equipment) => {
      const { error } = await supabase.from("equipment").delete().eq("id", item.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Equipment deleted.");
      setToDelete(null);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["equipment"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        !q ||
        i.equipment_name.toLowerCase().includes(q) ||
        i.asset_code.toLowerCase().includes(q);
      const matchesFilter = filter === "All" || i.availability === filter;
      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setForm({
      equipment_name: item.equipment_name,
      category: item.category ?? "",
      asset_code: item.asset_code,
      condition: item.condition ?? "",
      availability: item.availability,
    });
    setFormOpen(true);
  }

  return (
    <AppShell title="Equipment" subtitle="Click any row to see its borrowing history.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or asset code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All availability</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Borrowed">Borrowed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New equipment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Asset code</th>
                  <th className="p-3 font-medium">Condition</th>
                  <th className="p-3 font-medium">Availability</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={6}>
                      No equipment found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/60 ${
                        selected?.id === item.id ? "bg-accent" : ""
                      }`}
                    >
                      <td className="p-3 font-medium">{item.equipment_name}</td>
                      <td className="p-3 text-muted-foreground">{item.category ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{item.asset_code}</td>
                      <td className="p-3 text-muted-foreground">{item.condition ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant={item.availability === "Available" ? "default" : "secondary"}>
                          {item.availability}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(item);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setToDelete(item);
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `History — ${selected.equipment_name}` : "Borrowing history"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Select an equipment row to see everyone who borrowed it.
              </p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No borrowing records yet.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{h.borrower_name}</p>
                    <StatusBadge status={displayStatus(h)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.date_borrowed} → due {h.due_date}
                    {h.date_returned ? ` · returned ${h.date_returned}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit equipment" : "New equipment"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Equipment name *</Label>
              <Input
                id="name"
                required
                value={form.equipment_name}
                onChange={(e) => setForm({ ...form, equipment_name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset">Asset code *</Label>
                <Input
                  id="asset"
                  required
                  value={form.asset_code}
                  onChange={(e) => setForm({ ...form, asset_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={form.availability}
                  onValueChange={(v) => setForm({ ...form, availability: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Borrowed">Borrowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this equipment?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.equipment_name} and all of its borrowing history will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Returned" ? "default" : status === "Overdue" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}
