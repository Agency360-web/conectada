import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, Trash2, Pencil, X, Target } from "lucide-react";

interface CommercialGoal {
  id?: string;
  year_month: string;
  leads_target: number;
}

export function CommercialGoalSettings() {
  const { canWrite } = useAuth();
  const [goals, setGoals] = useState<CommercialGoal[]>([]);
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [leadsTarget, setLeadsTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("commercial_goals" as any)
      .select("*")
      .order("year_month", { ascending: false })
      .limit(6);

    if (error) {
      // Se der erro de tabela não encontrada, não mostramos toast toda hora
      console.error("Erro ao carregar metas comerciais:", error);
      return;
    }
    if (data) setGoals(data as CommercialGoal[]);
  };

  useEffect(() => {
    load();
  }, []);

  const clearForm = () => {
    const d = new Date();
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setLeadsTarget("");
    setEditingId(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearMonth) return toast.error("Mês/Ano inválido");

    setLoading(true);

    const payload = {
      year_month: yearMonth,
      leads_target: Number(leadsTarget) || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("commercial_goals" as any)
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("commercial_goals" as any)
        .upsert(payload, { onConflict: "year_month" }));
    }

    setLoading(false);

    if (error) {
      console.error("Erro ao salvar meta comercial:", error);
      return toast.error("Erro ao salvar: Certifique-se de que a tabela 'commercial_goals' foi criada no Supabase.");
    }

    toast.success("Meta comercial salva com sucesso!");
    clearForm();
    load();
  };

  const startEdit = (g: CommercialGoal) => {
    setEditingId(g.id || null);
    setYearMonth(g.year_month);
    setLeadsTarget(g.leads_target?.toString() || "");
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta meta comercial?")) return;
    const { error } = await supabase.from("commercial_goals" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Meta removida");
    load();
  };

  return (
    <div className="space-y-6 pt-6 border-t border-dashed">
      {canWrite && (
        <Card className={editingId ? "border-blue-500/50 ring-1 ring-blue-500/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              {editingId ? "✏️ Editando Meta de Prospecção" : "Definir Metas de Prospecção"}
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
                <Label>Quantidade de Leads (Meta)</Label>
                <Input
                  type="number"
                  min="0"
                  value={leadsTarget}
                  onChange={(e) => setLeadsTarget(e.target.value)}
                  placeholder="Ex: 50"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Histórico de Prospecção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Mês</th>
                  <th className="px-4 py-3">Meta de Leads</th>
                  <th className="px-4 py-3 text-right rounded-tr-md">Ações</th>
                </tr>
              </thead>
              <tbody>
                {goals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted-foreground">
                      Nenhuma meta comercial cadastrada.
                    </td>
                  </tr>
                )}
                {goals.map((g) => (
                  <tr
                    key={g.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${editingId === g.id ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{g.year_month}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{g.leads_target || 0} leads</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(g)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(g.id!)}>
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
