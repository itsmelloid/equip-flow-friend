import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CheckCircle2, PackageCheck, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayStatus, type BorrowTransaction, type Equipment } from "@/lib/eqm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EquipTrack" },
      { name: "description", content: "Live equipment and borrowing totals at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const [eq, tx] = await Promise.all([
        supabase.from("equipment").select("id, availability"),
        supabase.from("borrow_transactions").select("id, status, due_date"),
      ]);
      if (eq.error) throw eq.error;
      if (tx.error) throw tx.error;
      return {
        equipment: (eq.data ?? []) as Pick<Equipment, "id" | "availability">[],
        transactions: (tx.data ?? []) as Pick<BorrowTransaction, "id" | "status" | "due_date">[],
      };
    },
  });

  const equipment = data?.equipment ?? [];
  const transactions = data?.transactions ?? [];

  const cards = [
    { label: "Total Equipment", value: equipment.length, icon: Boxes, tone: "text-primary" },
    {
      label: "Available",
      value: equipment.filter((e) => e.availability === "Available").length,
      icon: PackageCheck,
      tone: "text-success",
    },
    {
      label: "Borrowed",
      value: equipment.filter((e) => e.availability === "Borrowed").length,
      icon: PackageOpen,
      tone: "text-warning",
    },
    {
      label: "Returned Transactions",
      value: transactions.filter((t) => t.status === "Returned").length,
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: "Overdue",
      value: transactions.filter((t) => displayStatus(t) === "Overdue").length,
      icon: AlertTriangle,
      tone: "text-destructive",
    },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Live totals from your equipment and borrowing records.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`size-4 ${c.tone}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{isLoading ? "—" : c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
