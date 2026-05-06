import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  clientId: string;
  cost?: { id: string; amount_allocated: number; description: string; cost_date: string } | null;
}

export function CostFormDialog({ open, onOpenChange, onSaved, clientId, cost }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cost) {
      setAmount(cost.amount_allocated.toString());
      setDate(cost.cost_date);
      setDescription(cost.description);
    } else {
      setAmount("");
      setDate(todayISO());
      setDescription("");
    }
  }, [cost, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      client_id: clientId,
      amount_allocated: parseFloat(amount),
      cost_date: date,
      description: description || "Custo direto",
      created_by: user?.id || null,
    };

    let error;
    if (cost) {
      const { error: err } = await supabase.from("client_costs").update(payload).eq("id", cost.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("client_costs").insert(payload);
      error = err;
    }

    setSaving(false);
    if (error) return toast.error(error.message);

    toast.success(cost ? "Custo atualizado" : "Custo alocado");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cost ? "Editar custo" : "Alocar novo custo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Tráfego Pago, Freelancer..." required />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
