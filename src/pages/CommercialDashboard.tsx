import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Users, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { formatBRL } from "@/lib/format";

interface DashboardData {
  funnel: { stage: string; count: number; value: number }[];
  summary: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    activeValue: number;
    wonValue: number;
    conversionRate: number;
  };
  goal: {
    target: number;
    current: number;
    percent: number;
  };
}

export default function CommercialDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: cols }, { data: leads }] = await Promise.all([
        supabase.from("commercial_columns").select("*").order("position"),
        supabase.from("leads").select("*")
      ]);

      if (!cols || !leads) return;

      // Funnel stages (Active leads)
      const funnel = cols.map(c => {
        const stageLeads = leads.filter(l => l.column_id === c.id && l.status !== 'WON' && l.status !== 'LOST');
        return {
          stage: c.name,
          count: stageLeads.length,
          value: stageLeads.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0)
        };
      });

      // Summary metrics
      const won = leads.filter(l => l.status === 'WON');
      const lost = leads.filter(l => l.status === 'LOST');
      const active = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST');
      
      const totalLeads = leads.length;
      const wonLeads = won.length;
      const lostLeads = lost.length;
      const activeValue = active.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);
      const wonValue = won.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);
      
      // Meta de Prospecção Dinâmica (Nova Tabela Dedicada)
      const now = new Date();
      const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
      
      const { data: budgetData } = await supabase
        .from("commercial_goals" as any)
        .select("leads_target")
        .eq("year_month", currentMonthStr)
        .maybeSingle();

      const targetGoal = budgetData?.leads_target || 50; // Fallback para 50 se não definido
      
      // Prospecções realizadas este mês
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const currentMonthLeads = leads.filter(l => l.created_at >= firstDay).length;

      setData({
        funnel,
        summary: {
          totalLeads,
          wonLeads,
          lostLeads,
          activeValue,
          wonValue,
          conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0
        },
        goal: {
          target: targetGoal,
          current: currentMonthLeads,
          percent: Math.min(100, (currentMonthLeads / targetGoal) * 100)
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const conversionData = [
    { name: 'Ganhos', value: data.summary.wonLeads, color: '#10b981' },
    { name: 'Perdidos', value: data.summary.lostLeads, color: '#ef4444' },
    { name: 'Em Aberto', value: data.summary.totalLeads - data.summary.wonLeads - data.summary.lostLeads, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard Comercial" 
        subtitle="Analise a saúde do seu funil e performance de vendas."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          label="Vendas Fechadas" 
          value={data.summary.wonLeads.toString()} 
          icon={CheckCircle2} 
          accent="success"
          subValue={
            <div className="flex items-center gap-1 text-success font-medium">
              <ArrowUpRight className="h-3 w-3" />
              <span>{formatBRL(data.summary.wonValue)}</span>
            </div>
          }
        />
        <StatCard 
          label="Vendas Perdidas" 
          value={data.summary.lostLeads.toString()} 
          icon={XCircle} 
          accent="destructive"
          subValue={
            <div className="flex items-center gap-1 text-muted-foreground font-medium">
              Taxa de perda: {Math.round((data.summary.lostLeads / data.summary.totalLeads) * 100)}%
            </div>
          }
        />
        <StatCard 
          label="Conversão Geral" 
          value={`${data.summary.conversionRate.toFixed(1)}%`} 
          icon={TrendingUp} 
          accent="warning"
          subValue={
            <div className="flex items-center gap-1 text-muted-foreground font-medium">
              Base de {data.summary.totalLeads} leads
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de Vendas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Funil de Vendas (Leads Ativos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.funnel} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="stage" 
                    type="category" 
                    width={100} 
                    fontSize={12} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number, name: string) => [name === 'count' ? `${v} leads` : formatBRL(v), name === 'count' ? 'Quantidade' : 'Valor Estimado']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.funnel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Meta de Prospecção */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Acompanhamento de Meta Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Realizado', value: data.goal.current, color: 'hsl(var(--primary))' },
                      { name: 'Restante', value: Math.max(0, data.goal.target - data.goal.current), color: 'hsl(var(--muted))' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    startAngle={180}
                    endAngle={0}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--muted)/0.3)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                <span className="text-4xl font-black text-primary">{data.goal.current}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prospecções</span>
              </div>
            </div>
            <div className="w-full max-w-[200px] text-center -mt-8 space-y-1">
              <p className="text-sm font-bold">Sua meta é de {data.goal.target}</p>
              <p className="text-xs text-muted-foreground">Faltam {Math.max(0, data.goal.target - data.goal.current)} para o objetivo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Valor Potencial por Estágio</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {data.funnel
                  .filter(f => f.stage.toUpperCase() !== 'NOVOS')
                  .map((f, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-muted/20 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.stage}</p>
                    <p className="text-lg font-bold text-primary">{formatBRL(f.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{f.count} leads ativos</p>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
