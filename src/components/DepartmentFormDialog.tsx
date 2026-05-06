import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  department?: { id: string; name: string; description: string | null } | null;
}

export function DepartmentFormDialog({ open, onOpenChange, onSaved, department }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      // Carregar usuários para seleção
      const { data: profiles } = await supabase.from("profiles").select("id, name, email").order("name");
      setUsers(profiles?.map(p => ({ id: p.id, email: p.email || "", name: p.name || p.email || "" })) || []);

      if (department) {
        setName(department.name);
        setDescription(department.description || "");
        
        // Carregar membros atuais
        const { data: members } = await supabase
          .from("department_members")
          .select("user_id")
          .eq("department_id", department.id);
        
        setSelectedUsers(members?.map(m => m.user_id) || []);
      } else {
        setName("");
        setDescription("");
        setSelectedUsers([]);
      }
    };

    loadData();
  }, [open, department]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório");

    setSaving(true);
    try {
      let deptId = department?.id;

      if (department) {
        const { error } = await supabase
          .from("departments")
          .update({ name, description })
          .eq("id", department.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("departments")
          .insert({ name, description })
          .select("id")
          .single();
        if (error) throw error;
        deptId = data.id;
      }

      // Atualizar membros (Delete e Insert para simplificar)
      await supabase.from("department_members").delete().eq("department_id", deptId);
      
      if (selectedUsers.length > 0) {
        const { error: memberError } = await supabase
          .from("department_members")
          .insert(selectedUsers.map(userId => ({
            department_id: deptId,
            user_id: userId,
            role: "member"
          })));
        if (memberError) throw memberError;
      }

      toast.success(department ? "Departamento atualizado" : "Departamento criado");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{department ? "Editar Departamento" : "Novo Departamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Setor</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Criação, Social Media..." required />
          </div>
          
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que este departamento faz?" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Membros da Equipe ({selectedUsers.length})</Label>
            <div className="border rounded-md p-2 min-h-[100px]">
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map(id => {
                  const u = users.find(user => user.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1">
                      {u?.name || "Usuário"}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleUser(id)} />
                    </Badge>
                  );
                })}
                {selectedUsers.length === 0 && <span className="text-xs text-muted-foreground p-1">Selecione os membros abaixo</span>}
              </div>
              <ScrollArea className="h-40 border-t pt-2">
                <div className="grid gap-1">
                  {users.map(u => (
                    <div 
                      key={u.id} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-sm cursor-pointer text-sm hover:bg-muted transition-colors",
                        selectedUsers.includes(u.id) && "bg-primary/10 text-primary font-medium"
                      )}
                      onClick={() => toggleUser(u.id)}
                    >
                      <span>{u.name}</span>
                      {selectedUsers.includes(u.id) && <Check className="h-4 w-4" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
