import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileDown, FileText, Table as TableIcon, Calendar as CalendarIcon, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";

export default function Reports() {
  const [reportType, setReportType] = useState("cashflow");
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [clientId, setClientId] = useState<string>("all");
  const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setClients(data || []));
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          report_type: reportType,
          date_from: dateFrom,
          date_to: dateTo,
          format: format,
          client_id: clientId === "all" ? undefined : clientId
        }
      });

      if (error) throw error;

      // The invoke utility might return data differently for binary/text
      // For binary (PDF), we might need to handle the blob
      // However, if the function returns a response with content-type, we handle it:
      
      const blob = new Blob([data], { type: format === "pdf" ? "application/pdf" : "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${reportType}-${todayISO()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Relatório gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Relatórios" 
        subtitle="Exporte dados financeiros em PDF ou CSV"
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Configurar Exportação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashflow">Fluxo de Caixa</SelectItem>
                    <SelectItem value="profitability">Lucratividade</SelectItem>
                    <SelectItem value="dre">DRE Simplificado</SelectItem>
                    <SelectItem value="accounts">Contas a Pagar/Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>De</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="date" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Até</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="date" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filtrar por Cliente (Opcional)</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Formato do Arquivo</Label>
                <RadioGroup value={format} onValueChange={(v) => setFormat(v as "pdf" | "csv")} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex items-center gap-1 cursor-pointer">
                      <FileText className="h-4 w-4 text-red-500" /> PDF
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv" className="flex items-center gap-1 cursor-pointer">
                      <TableIcon className="h-4 w-4 text-green-600" /> CSV
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  "Gerando..."
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" /> Gerar Relatório
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Dicas e Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">Fluxo de Caixa</h4>
              <p>Visão detalhada de todas as entradas e saídas no período selecionado, ideal para conciliação bancária.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">Lucratividade por Cliente</h4>
              <p>Compara a receita gerada contra os custos diretos alocados a cada projeto ou cliente.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-foreground mb-1">DRE Simplificado</h4>
              <p>Demonstrativo de resultados para análise rápida de saúde financeira da agência.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
