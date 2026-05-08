import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL, formatPercent } from "@/lib/format";
import { toast } from "sonner";
import { Info } from "lucide-react";

interface BudgetProgressProps {
  startDate?: Date;
  endDate?: Date;
}

export function BudgetProgress({ startDate: propStart, endDate: propEnd }: BudgetProgressProps) {
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<{ revenue_target: number; expense_limit: number } | null>(null);
  const [current, setCurrent] = useState({ revenue: 0, expenses: 0, pendingRevenue: 0 });

  useEffect(() => {
    load();
  }, [propStart, propEnd]);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const startDate = propStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = propEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all budgets in the range
    const isoStartMonth = startDate.toISOString().slice(0, 7);
    const isoEndMonth = endDate.toISOString().slice(0, 7);

    const { data: budgets } = await supabase
      .from("monthly_budgets")
      .select("revenue_target, expense_limit, year_month")
      .gte("year_month", isoStartMonth)
      .lte("year_month", isoEndMonth);

    const totalBudget = (budgets || []).reduce(
      (acc, b) => ({
        revenue_target: acc.revenue_target + (b.revenue_target || 0),
        expense_limit: acc.expense_limit + (b.expense_limit || 0),
      }),
      { revenue_target: 0, expense_limit: 0 }
    );

    setBudget(totalBudget.revenue_target > 0 || totalBudget.expense_limit > 0 ? totalBudget : null);

    // Fetch transactions in the range
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount, status, payment_date, due_date")
      .in("status", ["PAID", "PENDING"]);

    if (txs) {
      let rev = 0;
      let exp = 0;
      let pendingRev = 0;
      
      const isoStartStr = startDate.toISOString().slice(0, 10);
      const isoEndStr = endDate.toISOString().slice(0, 10);

      txs.forEach((t) => {
        const date = t.status === "PAID" ? (t.payment_date || t.due_date) : t.due_date;
        if (date && date >= isoStartStr && date <= isoEndStr) {
          if (t.type === "INCOME") {
            if (t.status === "PAID") rev += Number(t.amount);
            else pendingRev += Number(t.amount);
          }
          if (t.type === "EXPENSE" && t.status === "PAID") exp += Number(t.amount);
        }
      });
      setCurrent({ revenue: rev, expenses: exp, pendingRevenue: pendingRev });

      if (totalBudget && totalBudget.expense_limit > 0) {
        const expPerc = exp / totalBudget.expense_limit;
        if (expPerc > 1) {
          toast.error("Atenção! Você ultrapassou 100% do teto de despesas deste período.", { duration: 6000 });
        } else if (expPerc >= 0.9) {
          toast.warning("Cuidado! Você atingiu mais de 90% do teto de despesas deste período.", { duration: 6000 });
        }
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-20 flex items-center justify-center text-muted-foreground">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Nenhuma meta definida</p>
              <p className="text-xs text-muted-foreground">Configure sua meta mensal em Configurações para acompanhar o progresso.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const revPerc = budget.revenue_target > 0 ? current.revenue / budget.revenue_target : 0;
  const expPerc = budget.expense_limit > 0 ? current.expenses / budget.expense_limit : 0;

  // Cor Despesas: Verde < 70%, Amarelo 70-90%, Vermelho > 90%
  let expColor = "bg-success";
  if (expPerc >= 0.9) expColor = "bg-destructive";
  else if (expPerc >= 0.7) expColor = "bg-warning";

  // Cor Receita: Verde >= 80%
  const revColor = revPerc >= 0.8 ? "bg-success" : "bg-primary";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">Acompanhamento do Mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-1">
            <span className="font-medium text-muted-foreground">Meta de Receita</span>
            <span className="text-xs sm:text-sm">
              <span className="font-bold text-primary">{formatBRL(current.revenue)}</span>
              <span className="text-muted-foreground mx-1">recebido •</span>
              <span className="font-bold text-primary/60">{formatBRL(current.pendingRevenue)}</span>
              <span className="text-muted-foreground mx-1">a receber /</span>
              <span className="text-muted-foreground font-medium">{formatBRL(budget.revenue_target)}</span>
            </span>
          </div>
          
          {/* Barra Empilhada Customizada */}
          <div className="h-2 w-full bg-secondary overflow-hidden rounded-full flex">
            {/* Parte Recebida (Solid) */}
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out" 
              style={{ width: `${Math.min((current.revenue / budget.revenue_target) * 100, 100)}%` }} 
            />
            {/* Parte a Receber (Mais clara) */}
            <div 
              className="h-full bg-primary/40 transition-all duration-500 ease-in-out" 
              style={{ width: `${Math.min((current.pendingRevenue / budget.revenue_target) * 100, 100 - Math.min((current.revenue / budget.revenue_target) * 100, 100))}%` }} 
            />
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-muted-foreground flex gap-2">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Recebido</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/40"></div> Projetado</span>
            </span>
            <p className="text-xs text-muted-foreground font-medium">
              {formatPercent((current.revenue + current.pendingRevenue) / budget.revenue_target)} projetado
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Teto de Despesas</span>
            <span>
              <span className="font-bold text-destructive">{formatBRL(current.expenses)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-muted-foreground font-medium">{formatBRL(budget.expense_limit)}</span>
            </span>
          </div>
          
          <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
            <div 
              className="h-full bg-destructive transition-all duration-500 ease-in-out" 
              style={{ width: `${Math.min((current.expenses / budget.expense_limit) * 100, 100)}%` }} 
            />
          </div>
          
          <p className="text-xs text-muted-foreground text-right font-medium">
            {formatPercent(current.expenses / budget.expense_limit)} utilizado
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
