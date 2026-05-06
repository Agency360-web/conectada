import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetSettings } from "@/components/BudgetSettings";

interface Cat { id: string; name: string; type: "INCOME" | "EXPENSE" }

export default function Settings() {
  const { canWrite, isAdmin } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("type").order("name");
    setCats((data as Cat[]) || []);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().min(2).max(60).safeParse(name);
    if (!parsed.success) return toast.error("Nome inválido");
    const { error } = await supabase.from("categories").insert({ name: parsed.data, type });
    if (error) return toast.error(error.message);
    toast.success("Categoria criada");
    setName("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria removida");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configurações" 
        subtitle="Gerencie o plano de contas e defina metas financeiras." 
      />

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="budgets">Metas e Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {canWrite && (
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Nova categoria</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-2 flex-1 min-w-48">
                    <Label>Nome</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Anúncios Meta" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">Receita</SelectItem>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit"><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Categorias cadastradas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {cats.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.type === "INCOME" ? "default" : "secondary"} className={c.type === "INCOME" ? "bg-success-soft text-success border-success/20" : "bg-destructive-soft text-destructive border-destructive/20"}>
                        {c.type === "INCOME" ? "Receita" : "Despesa"}
                      </Badge>
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    {isAdmin && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <BudgetSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
