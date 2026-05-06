import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  departmentId: string;
  columnId?: string;
}

export function TaskFormDialog({ open, onOpenChange, onSaved, departmentId, columnId }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"URGENT" | "HIGH" | "NORMAL" | "LOW">("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState<string>("none");
  const [targetColumnId, setTargetColumnId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [columns, setColumns] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setPriority("NORMAL");
    setDueDate("");
    setClientId("none");
    setTargetColumnId(columnId || "");

    const loadData = async () => {
      const [{ data: cli }, { data: cols }] = await Promise.all([
        supabase.from("clients").select("id, name").eq("active", true).order("name"),
        supabase.from("board_columns").select("id, name").eq("department_id", departmentId).order("position"),
      ]);
      setClients(cli || []);
      setColumns(cols || []);
      if (!columnId && cols && cols.length > 0) setTargetColumnId(cols[0].id);
    };

    loadData();
  }, [open, departmentId, columnId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Título é obrigatório");
    if (!targetColumnId) return toast.error("Selecione uma coluna");

    setSaving(true);
    
    // Pegar a última posição da coluna para inserir no final
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("column_id", targetColumnId);

    const payload = {
      department_id: departmentId,
      column_id: targetColumnId,
      title: title.trim(),
      description: description || null,
      priority,
      due_date: dueDate || null,
      client_id: clientId === "none" ? null : clientId,
      position: count || 0,
      created_by: user?.id || null,
    };

    const { error } = await supabase.from("tasks").insert(payload);
    setSaving(false);

    if (error) return toast.error(error.message);

    toast.success("Tarefa criada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">🚨 Urgente</SelectItem>
                  <SelectItem value="HIGH">🔴 Alta</SelectItem>
                  <SelectItem value="NORMAL">🔵 Normal</SelectItem>
                  <SelectItem value="LOW">⚪ Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo (Opcional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Coluna (Status)</Label>
              <Select value={targetColumnId} onValueChange={setTargetColumnId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar Tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
