import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Palette, Clock, CheckCircle2, AlertCircle, 
  BarChart3, Users, Layout, Calendar
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, PieChart, Pie, Cell 
} from "recharts";

interface CreativeStats {
  totalTasks: number;
  inProgress: number;
  completed: number;
  delayed: number;
  productivity: { name: string; value: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export default function CreativeDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreativeStats>({
    totalTasks: 0,
    inProgress: 0,
    completed: 0,
    delayed: 0,
    productivity: [],
    statusDistribution: []
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    
    // Buscar o departamento Criativo (ou o primeiro disponível para teste)
    const { data: dept } = await supabase
      .from("departments")
      .select("id")
      .eq("name", "Criativo")
      .maybeSingle();

    if (!dept) {
      setLoading(false);
      return;
    }

    // Buscar tarefas do departamento
    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        id, 
        status, 
        due_date,
        user:assigned_to ( name )
      `)
      .eq("department_id", dept.id);

    if (tasks) {
      const now = new Date();
      const total = tasks.length;
      const progress = tasks.filter(t => t.status === "DOING").length;
      const done = tasks.filter(t => t.status === "DONE").length;
      const delayed = tasks.filter(t => t.status !== "DONE" && t.due_date && new Date(t.due_date) < now).length;

      // Distribuição por Status
      const statusMap = tasks.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const statusLabels: any = {
        "TODO": "A Fazer",
        "DOING": "Em Produção",
        "REVIEW": "Em Revisão",
        "DONE": "Finalizado"
      };

      const statusColors: any = {
        "TODO": "hsl(var(--muted))",
        "DOING": "hsl(var(--primary))",
        "REVIEW": "hsl(var(--warning))",
        "DONE": "hsl(var(--success))"
      };

      const statusDistribution = Object.keys(statusMap).map(key => ({
        name: statusLabels[key] || key,
        value: statusMap[key],
        color: statusColors[key] || "hsl(var(--primary))"
      }));

      // Produtividade por Usuário
      const userMap = tasks.reduce((acc: any, t) => {
        const userName = (t.user as any)?.name || "Sem Responsável";
        acc[userName] = (acc[userName] || 0) + 1;
        return acc;
      }, {});

      const productivity = Object.keys(userMap).map(name => ({
        name,
        value: userMap[name]
      })).sort((a, b) => b.value - a.value);

      setData({
        totalTasks: total,
        inProgress: progress,
        completed: done,
        delayed: delayed,
        productivity,
        statusDistribution
      });
    }

    setLoading(false);
  };

  if (loading) return <div className="p-8">Carregando indicadores criativos...</div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard Criativo" 
        subtitle="Monitore a produção e entregas do time de design."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Total de Projetos" 
          value={data.totalTasks.toString()} 
          icon={Layout} 
          accent="primary"
        />
        <StatCard 
          label="Em Produção" 
          value={data.inProgress.toString()} 
          icon={Palette} 
          accent="warning"
        />
        <StatCard 
          label="Finalizados (Mês)" 
          value={data.completed.toString()} 
          icon={CheckCircle2} 
          accent="success"
        />
        <StatCard 
          label="Tarefas Atrasadas" 
          value={data.delayed.toString()} 
          icon={AlertCircle} 
          accent="destructive"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Distribuição de Carga de Trabalho */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Volume de Trabalho por Designer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.productivity} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    fontSize={12}
                    fontFamily="inherit"
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 8, 8, 0]} 
                    barSize={24}
                    name="Tarefas"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status dos Projetos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Status da Operação
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              {data.statusDistribution.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
