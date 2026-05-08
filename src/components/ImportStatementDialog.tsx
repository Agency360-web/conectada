import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  categories: { id: string, name: string, type: string }[];
  clients: { id: string, name: string }[];
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category_id?: string;
  client_id?: string;
}

export function ImportStatementDialog({ open, onOpenChange, onImported, categories, clients }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async () => {
    if (!file) return toast.error("Selecione um arquivo primeiro.");

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("process-bank-statement", {
        body: formData,
      });

      if (error) throw error;
      
      setTransactions(data.transactions || []);
      toast.success(`${data.transactions?.length || 0} transações encontradas.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar arquivo: " + (err.message || "Erro desconhecido"));
    } finally {
      setProcessing(false);
    }
  };

  const removeTransaction = (index: number) => {
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const updateTransaction = (index: number, field: keyof ParsedTransaction, value: any) => {
    setTransactions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    if (transactions.length === 0) return;

    setSaving(true);
    try {
      const payload = transactions.map(t => ({
        amount: t.amount,
        type: t.type,
        due_date: t.date,
        payment_date: t.date,
        status: "PAID",
        description: t.description,
        category_id: t.category_id || null,
        client_id: t.client_id || null,
      }));

      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;

      toast.success("Transações importadas com sucesso!");
      onImported();
      onOpenChange(false);
      setTransactions([]);
      setFile(null);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="mb-4">
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
        </DialogHeader>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl space-y-6 bg-muted/30">
            <div className="p-6 bg-primary/10 rounded-full ring-8 ring-primary/5">
              <Upload className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="text-lg font-semibold">Selecione o extrato</h3>
              <p className="text-sm text-muted-foreground mt-1">Sobe seu PDF, CSV ou Excel e a nossa IA fará o resto por você automaticamente.</p>
            </div>
            <div className="grid w-full max-w-xs items-center gap-1.5">
              <Label htmlFor="statement-file">Arquivo do Extrato</Label>
              <Input 
                id="statement-file"
                type="file" 
                accept=".pdf,.csv,.xls,.xlsx,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            <Button onClick={handleFileUpload} disabled={!file || processing} className="w-full max-w-xs">
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando com IA...
                </>
              ) : (
                "Começar Processamento"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4 flex items-center justify-between bg-muted/50 p-3 rounded-lg border flex-shrink-0">
              <div>
                <p className="text-sm font-medium">Revisão de Lançamentos</p>
                <p className="text-xs text-muted-foreground">
                  Identificamos {transactions.length} transações. Revise os dados abaixo.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTransactions([])} className="h-8">
                Trocar Arquivo
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto border rounded-md bg-background relative" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-20 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[140px] bg-muted">Data</TableHead>
                    <TableHead className="bg-muted">Descrição</TableHead>
                    <TableHead className="w-[130px] bg-muted">Valor</TableHead>
                    <TableHead className="w-[180px] bg-muted">Categoria</TableHead>
                    <TableHead className="w-[180px] bg-muted">Cliente</TableHead>
                    <TableHead className="w-[50px] bg-muted"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell>
                        <Input 
                          type="date" 
                          value={tx.date} 
                          onChange={(e) => updateTransaction(index, "date", e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={tx.description} 
                          onChange={(e) => updateTransaction(index, "description", e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </TableCell>
                      <TableCell>
                        <div className={`text-xs font-bold ${tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "INCOME" ? "+" : "-"}{formatBRL(tx.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Select 
                            value={tx.category_id || "none"} 
                            onValueChange={(v) => updateTransaction(index, "category_id", v === "none" ? undefined : v)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecione</SelectItem>
                              {categories.filter(c => c.type === tx.type).map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={tx.client_id || "none"} 
                          onValueChange={(v) => updateTransaction(index, "client_id", v === "none" ? undefined : v)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {clients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeTransaction(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {transactions.length > 0 && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Salvar {transactions.length} Lançamentos
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
