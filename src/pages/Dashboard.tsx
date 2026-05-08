import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatPercent } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { BudgetProgress } from "@/components/BudgetProgress";

interface Kpi {
  revenue: number;
  expenses: number;
  clientCosts: number;
  receivable: number;
  payable: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("last_6_months");
  const [customStart, setCustomStart] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());
  const [kpi, setKpi] = useState<Kpi>({ revenue: 0, expenses: 0, clientCosts: 0, receivable: 0, payable: 0 });
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1), 
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) 
  });
  const [topClients, setTopClients] = useState<{ name: string; revenue: number; cost: number; profit: number; margin: number }[]>([]);
  const [monthly, setMonthly] = useState<{ month: string; receita: number; despesa: number }[]>([]);

  useEffect(() => {
    load();
  }, [period, customStart, customEnd]);

  const load = async () => {
    setLoading(true);
    const [{ data: txs }, { data: costs }, { data: clients }] = await Promise.all([
      supabase.from("transactions").select("id, type, amount, status, payment_date, due_date, client_id"),
      supabase.from("client_costs").select("client_id, amount_allocated, cost_date"),
      supabase.from("clients").select("id, name"),
    ]);

    let allTx = txs || [];
    let allCosts = costs || [];

    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date(now.getFullYear(), now.getMonth() + 12, 0);

    let numMonths = 6;
    if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      numMonths = 1;
    } else if (period === "last_3_months") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      numMonths = 3;
    } else if (period === "last_6_months") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      numMonths = 6;
    } else if (period === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      numMonths = now.getMonth() + 1;
    } else if (period === "custom" && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
      // Calculate months for the chart
      numMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
      if (numMonths <= 0) numMonths = 1;
    }

    const isoStart = startDate.toISOString().slice(0, 10);
    const isoEnd = endDate.toISOString().slice(0, 10);

    allTx = allTx.filter(t => {
      const date = t.status === "PAID" ? (t.payment_date || t.due_date) : t.due_date;
      return date >= isoStart && date <= isoEnd;
    });
    allCosts = allCosts.filter(c => c.cost_date >= isoStart && c.cost_date <= isoEnd);

    const revenue = allTx.filter((t) => t.type === "INCOME" && t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = allTx.filter((t) => t.type === "EXPENSE" && t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);
    const receivable = allTx.filter((t) => t.type === "INCOME" && t.status === "PENDING").reduce((s, t) => s + Number(t.amount), 0);
    const payable = allTx.filter((t) => t.type === "EXPENSE" && t.status === "PENDING").reduce((s, t) => s + Number(t.amount), 0);
    const clientCosts = allCosts.reduce((s, c) => s + Number(c.amount_allocated), 0);

    setKpi({ revenue, expenses, clientCosts, receivable, payable });
    setDateRange({ start: startDate, end: endDate });

    // Per-client profitability
    const map = new Map<string, { name: string; revenue: number; cost: number }>();
    (clients || []).forEach((c) => map.set(c.id, { name: c.name, revenue: 0, cost: 0 }));
    allTx.forEach((t) => {
      if (t.client_id && t.type === "INCOME" && t.status === "PAID") {
        const e = map.get(t.client_id);
        if (e) e.revenue += Number(t.amount);
      }
    });
    allCosts.forEach((c) => {
      const e = map.get(c.client_id);
      if (e) e.cost += Number(c.amount_allocated);
    });
    const ranked = Array.from(map.values())
      .filter((c) => c.revenue > 0 || c.cost > 0)
      .map((c) => ({
        ...c,
        profit: c.revenue - c.cost,
        margin: c.revenue > 0 ? (c.revenue - c.cost) / c.revenue : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    setTopClients(ranked);

    // Dynamic chart
    const months: { month: string; receita: number; despesa: number }[] = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      months.push({ month: label, receita: 0, despesa: 0 });
      allTx.forEach((t) => {
        const date = t.payment_date || t.due_date;
        if (date && date.startsWith(key)) {
          if (t.type === "INCOME" && t.status === "PAID") months[months.length - 1].receita += Number(t.amount);
          if (t.type === "EXPENSE" && t.status === "PAID") months[months.length - 1].despesa += Number(t.amount);
        }
      });
    }
    setMonthly(months);
    setLoading(false);
  };

  const profit = kpi.revenue - kpi.expenses;
  const totalCostForMargin = kpi.expenses + kpi.clientCosts;
  const margin = kpi.revenue > 0 ? (kpi.revenue - totalCostForMargin) / kpi.revenue : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle="Visão geral financeira da agência" 
      >
        <div className="w-[180px]">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
              <SelectItem value="this_year">Ano atual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
           <div className="flex items-center gap-2">
             <input 
               type="date" 
               className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               value={customStart?.toISOString().split('T')[0]}
               onChange={(e) => setCustomStart(new Date(e.target.value))}
             />
             <span className="text-muted-foreground">até</span>
             <input 
               type="date" 
               className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               value={customEnd?.toISOString().split('T')[0]}
               onChange={(e) => setCustomEnd(new Date(e.target.value))}
             />
           </div>
         )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Receita total" 
          value={formatBRL(kpi.revenue)} 
          icon={TrendingUp} 
          accent="success" 
          subValue={
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>A receber: {formatBRL(kpi.receivable)}</span>
            </div>
          } 
        />
        <StatCard 
          label="Despesas totais" 
          value={formatBRL(kpi.expenses)} 
          icon={TrendingDown} 
          accent="destructive" 
          subValue={
            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" />
              <span>A pagar: {formatBRL(kpi.payable)}</span>
            </div>
          } 
        />
        <StatCard 
          label="Lucro líquido" 
          value={formatBRL(profit)} 
          icon={Wallet} 
          accent={profit >= 0 ? "success" : "destructive"} 
          subValue={
            <div className="flex items-center gap-1">
              {profit >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              <span>Custos por cliente: {formatBRL(kpi.clientCosts)}</span>
            </div>
          } 
        />
        <StatCard 
          label="Margem média" 
          value={formatPercent(margin)} 
          icon={Percent} 
          accent={margin >= 0.2 ? "success" : "warning"} 
          subValue={
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>Receita - despesas - custos</span>
            </div>
          } 
        />
      </div>

      {/* Acompanhamento de Metas do Período */}
      <BudgetProgress startDate={dateRange.start} endDate={dateRange.end} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Fluxo dos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Legend />
                  <Bar dataKey="receita" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} name="Receita" />
                  <Bar dataKey="despesa" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} name="Despesa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Top clientes lucrativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topClients.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados ainda. Cadastre clientes e lance receitas.</p>
            )}
            {topClients.map((c) => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className={c.profit >= 0 ? "text-success text-sm font-semibold" : "text-destructive text-sm font-semibold"}>
                    {formatBRL(c.profit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Receita: {formatBRL(c.revenue)}</span>
                  <span>Margem: {formatPercent(c.margin)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${Math.max(0, Math.min(100, c.margin * 100))}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

