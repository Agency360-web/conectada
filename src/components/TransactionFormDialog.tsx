import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { FileUploader } from "@/components/FileUploader";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  defaultType?: "INCOME" | "EXPENSE";
  defaultClientId?: string | null;
  transactionId?: string | null;
}

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Valor deve ser maior que zero"),
  due_date: z.string().min(1, "Data obrigatória"),
  description: z.string().trim().max(300).optional(),
});

export function TransactionFormDialog({ 
  open, 
  onOpenChange, 
  onSaved, 
  defaultType = "INCOME", 
  defaultClientId = null,
  transactionId 
}: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<"INCOME" | "EXPENSE">(defaultType);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [paymentDate, setPaymentDate] = useState("");
  const [status, setStatus] = useState<"PENDING" | "PAID" | "OVERDUE" | "CANCELLED">("PENDING");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>(defaultClientId || "none");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [clients, setClients] = useState<{ id: string; name: string; email?: string | null; phone?: string | null }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState("");
  const [pixCode, setPixCode] = useState("");

  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      const [{ data: cli }, { data: cat }] = await Promise.all([
        supabase.from("clients").select("id, name, email, phone").eq("active", true).order("name"),
        supabase.from("categories").select("id, name, type").order("name"),
      ]);
      setClients(cli || []);
      setCategories(cat || []);

      if (transactionId) {
        const { data: tx } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
        if (tx) {
          setType(tx.type);
          setAmount(tx.amount.toString());
          setDueDate(tx.due_date);
          setPaymentDate(tx.payment_date || "");
          setStatus(tx.status);
          setDescription(tx.description || "");
          setClientId(tx.client_id || "none");
          setCategoryId(tx.category_id || "none");
          setPixCode(tx.pix_qr_code || "");
          setExistingFileUrl(tx.bank_slip_url || "");
          setFile(null);
        }
      } else {
        setType(defaultType);
        setAmount("");
        setDueDate(todayISO());
        setPaymentDate("");
        setStatus("PENDING");
        setDescription("");
        setClientId(defaultClientId || "none");
        setCategoryId("none");
        setFile(null);
        setPixCode("");
        setExistingFileUrl("");
      }
    };

    loadData();
  }, [open, defaultType, defaultClientId, transactionId]);

  const filteredCats = categories.filter((c) => c.type === type);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ type, amount: parseFloat(amount), due_date: dueDate, description });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    setSaving(true);
    const selectedClient = clients.find(c => c.id === clientId);

    const currentTxId = transactionId || crypto.randomUUID();
    let bankSlipUrl = existingFileUrl;

    if (file) {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `transaction/${currentTxId}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
        bankSlipUrl = publicUrl;

        await supabase.from('attachments').insert({
          entity_type: 'transaction',
          entity_id: currentTxId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
          created_by: user?.id
        });
      } catch (err: any) {
        setSaving(false);
        return toast.error("Erro ao fazer upload do anexo: " + err.message);
      }
    }

    const payload = {
      id: currentTxId,
      type,
      amount: parsed.data.amount,
      due_date: dueDate,
      payment_date: paymentDate || null,
      status: paymentDate ? "PAID" as const : status,
      description: description || null,
      client_id: clientId === "none" ? null : clientId,
      category_id: categoryId === "none" ? null : categoryId,
      created_by: user?.id || null,
      customer_name: selectedClient?.name || null,
      customer_phone: selectedClient?.phone || null,
      customer_email: selectedClient?.email || null,
      pix_qr_code: pixCode || null,
      ...(bankSlipUrl ? { bank_slip_url: bankSlipUrl } : {})
    };

    if (transactionId) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", transactionId);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
      toast.success("Lançamento atualizado");
    } else {
      const { data: tx, error } = await supabase.from("transactions").insert(payload).select("id").single();
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }

      // Se for despesa associada a cliente, cria também client_cost
      if (type === "EXPENSE" && payload.client_id && tx) {
        await supabase.from("client_costs").insert({
          client_id: payload.client_id,
          transaction_id: tx.id,
          amount_allocated: payload.amount,
          description: description || "Despesa",
          cost_date: dueDate,
          created_by: user?.id || null,
        });
      }
      toast.success("Lançamento criado");
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{transactionId ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data de pagamento</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cliente {type === "EXPENSE" && <span className="text-xs text-muted-foreground">(aloca custo)</span>}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem categoria —</SelectItem>
                  {filteredCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!paymentDate && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="OVERDUE">Vencido</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {type === 'INCOME' && (
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>PIX Copia e Cola</Label>
                <Input 
                  placeholder="Cole aqui o código PIX Copia e Cola..." 
                  value={pixCode} 
                  onChange={(e) => setPixCode(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Anexar Boleto/Fatura (PDF ou Imagem)</Label>
                <div className="flex items-center gap-2">
                  <FileUploader onFileSelect={(f) => setFile(f)} />
                  {file && <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={file.name}>{file.name}</span>}
                  {!file && existingFileUrl && (
                    <a href={existingFileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                      Ver anexo atual
                    </a>
                  )}
                </div>
                {status === 'PENDING' && !file && !existingFileUrl && (
                  <Alert className="mt-2 py-2 bg-amber-500/10 text-amber-500 border-amber-500/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Receitas pendentes devem idealmente possuir um boleto anexado.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
