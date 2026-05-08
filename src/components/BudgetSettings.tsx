import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, Trash2, Pencil, X } from "lucide-react";
import { formatBRL } from "@/lib/format";

interface Budget {
  id: string;
  year_month: string;
  revenue_target: number;
  expense_limit: number;
}

export function BudgetSettings() {
  const { canWrite } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [revenueTarget, setRevenueTarget] = useState("");
  const [expenseLimit, setExpenseLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("monthly_budgets")
      .select("*")
      .order("year_month", { ascending: false })
      .limit(6);

    if (error) {
      toast.error("Erro ao carregar metas: " + error.message);
      return;
    }
    if (data) setBudgets(data);
  };

  useEffect(() => {
    load();
  }, []);

  const clearForm = () => {
    const d = new Date();
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setRevenueTarget("");
    setExpenseLimit("");
    setEditingId(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearMonth) return toast.error("Mês/Ano inválido");

    setLoading(true);

    let error;

    if (editingId) {
      // Modo edição: UPDATE pelo ID
      ({ error } = await supabase
        .from("monthly_budgets")
        .update({
          year_month: yearMonth,
          revenue_target: Number(revenueTarget) || 0,
          expense_limit: Number(expenseLimit) || 0,
        })
        .eq("id", editingId));
    } else {
      // Modo criação: UPSERT pelo year_month
      ({ error } = await supabase
        .from("monthly_budgets")
        .upsert(
          {
            year_month: yearMonth,
            revenue_target: Number(revenueTarget) || 0,
            expense_limit: Number(expenseLimit) || 0,
          },
          { onConflict: "year_month" }
        ));
    }

    setLoading(false);

    if (error) {
      console.error("Erro ao salvar meta:", error);
      return toast.error("Erro ao salvar: " + error.message);
    }

    toast.success(editingId ? "Meta atualizada com sucesso!" : "Meta salva com sucesso!");
    clearForm();
    load();
  };

  const startEdit = (b: Budget) => {
    setEditingId(b.id);
    setYearMonth(b.year_month);
    setRevenueTarget(b.revenue_target.toString());
    setExpenseLimit(b.expense_limit.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta meta?")) return;

    const { error } = await supabase
      .from("monthly_budgets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao remover meta:", error);
      return toast.error("Erro ao remover: " + error.message);
    }

    toast.success("Meta removida");
    if (editingId === id) clearForm();
    load();
  };

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className={editingId ? "border-primary/50 ring-1 ring-primary/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">
              {editingId ? "✏️ Editando Meta Financeira" : "Definir Metas Financeiras"}
            </CardTitle>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={clearForm}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Mês / Ano</Label>
                <Input
                  type="month"
                  value={yearMonth}
                  onChange={(e) => setYearMonth(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 flex-1 min-w-32">
                <Label>Meta de Receita (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(e.target.value)}
                  placeholder="Ex: 50000"
                  required
                />
              </div>
              <div className="space-y-2 flex-1 min-w-32">
                <Label>Teto de Despesas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseLimit}
                  onChange={(e) => setExpenseLimit(e.target.value)}
                  placeholder="Ex: 15000"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Histórico Financeiro (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Mês</th>
                  <th className="px-4 py-3">Meta de Receita</th>
                  <th className="px-4 py-3">Teto de Despesas</th>
                  <th className="px-4 py-3 text-right rounded-tr-md">Ações</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-muted-foreground">
                      Nenhuma meta cadastrada
                    </td>
                  </tr>
                )}
                {budgets.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${editingId === b.id ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{b.year_month}</td>
                    <td className="px-4 py-3 text-success font-bold">{formatBRL(b.revenue_target)}</td>
                    <td className="px-4 py-3 text-destructive font-bold">{formatBRL(b.expense_limit)}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startEdit(b)}
                            title="Editar meta"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => remove(b.id)}
                            title="Remover meta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
