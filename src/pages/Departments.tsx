import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users, Layout, Trash2, Edit } from "lucide-react";
import { DepartmentFormDialog } from "@/components/DepartmentFormDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count?: number;
}

export default function Departments() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  useEffect(() => {
    if (!isAdmin) return; // Apenas admin carrega a lista
    load();
  }, [isAdmin]);

  const load = async () => {
    setLoading(true);
    const { data: depts, error } = await supabase
      .from("departments")
      .select(`
        *,
        member_count:department_members(count)
      `)
      .order("name");

    if (error) {
      toast.error(error.message);
    } else {
      setDepartments(depts.map(d => ({
        ...d,
        member_count: d.member_count?.[0]?.count || 0
      })));
    }
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este departamento? Todas as tarefas e colunas serão perdidas.")) return;
    
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    
    toast.success("Departamento removido");
    load();
  };

  const edit = (dept: Department) => {
    setSelectedDept(dept);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departamentos"
        subtitle="Gerencie os setores e as equipes de projetos da agência."
      >
        <Button onClick={() => { setSelectedDept(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Departamento
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/30">
            <Layout className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">Nenhum departamento cadastrado.</p>
            <Button variant="link" onClick={() => setFormOpen(true)}>Criar o primeiro</Button>
          </div>
        )}
        
        {departments.map((dept) => (
          <Card key={dept.id} className="group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="font-display text-xl">{dept.name}</CardTitle>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => edit(dept)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                {dept.description || "Sem descrição."}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {dept.member_count} membros
                </div>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/departamentos/${dept.id}/board`)}>
                  Ver Quadro
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DepartmentFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        onSaved={load} 
        department={selectedDept} 
      />
    </div>
  );
}
