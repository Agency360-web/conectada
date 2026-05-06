import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Client {
  id: string;
  name: string;
  asaas_customer_id: string | null;
}

interface ChargeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultClientId?: string;
}

export function ChargeFormDialog({ open, onOpenChange, onSaved, defaultClientId }: ChargeFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [chargeType, setChargeType] = useState<"AVULSA" | "RECORRENTE">("AVULSA");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY">("MONTHLY");

  useEffect(() => {
    if (open) {
      loadClients();
      if (defaultClientId) setClientId(defaultClientId);
    }
  }, [open, defaultClientId]);

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name, asaas_customer_id")
      .order("name");
    if (data) setClients(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error("Selecione um cliente");
    if (!value || isNaN(Number(value))) return toast.error("Valor inválido");
    if (!dueDate) return toast.error("Data de vencimento é obrigatória");

    const selectedClient = clients.find(c => c.id === clientId);
    if (!selectedClient?.asaas_customer_id) {
      return toast.error("O cliente selecionado precisa estar sincronizado com o Asaas antes de gerar cobranças.");
    }

    setLoading(true);
    try {
      const payload = {
        action: chargeType === "AVULSA" ? "create_payment" : "create_subscription",
        client_id: clientId,
        value: Number(value),
        description,
        billing_type: billingType,
        ...(chargeType === "AVULSA" 
            ? { due_date: dueDate } 
            : { next_due_date: dueDate, billing_cycle: billingCycle }
        )
      };

      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(chargeType === "AVULSA" ? "Cobrança gerada com sucesso!" : "Assinatura criada com sucesso!");
      onSaved();
      onOpenChange(false);
      
      // Reset form
      setValue("");
      setDescription("");
      setDueDate("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cobrança");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Cobrança (Asaas)</DialogTitle>
          <DialogDescription>
            Gere um PIX, Boleto ou cobrança no Cartão via Asaas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente sincronizado" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id} disabled={!c.asaas_customer_id}>
                    {c.name} {!c.asaas_customer_id && "(Não sincronizado)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={chargeType} onValueChange={(v: any) => setChargeType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVULSA">Avulsa</SelectItem>
                  <SelectItem value="RECORRENTE">Assinatura (Recorrente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={billingType} onValueChange={(v: any) => setBillingType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {chargeType === "RECORRENTE" && (
            <div className="space-y-2">
              <Label>Ciclo de Cobrança</Label>
              <Select value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>{chargeType === "AVULSA" ? "Vencimento" : "Primeiro Vencimento"}</Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Input 
              placeholder="Ex: Mensalidade - Ref. Abril" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-primary">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {chargeType === "AVULSA" ? "Gerar Cobrança" : "Criar Assinatura"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
