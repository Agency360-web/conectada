import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Plus, TrendingUp, TrendingDown, Wallet, Percent, RefreshCw, CheckCircle2, Trash2 } from "lucide-react";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { ChargeFormDialog } from "@/components/ChargeFormDialog";
import { CostFormDialog } from "@/components/CostFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ClientWhatsAppIntegration } from "@/components/ClientWhatsAppIntegration";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { canWrite } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [txs, setTxs] = useState<{ id: string; type: string; amount: number; due_date: string; status: string; description: string | null }[]>([]);
  const [costs, setCosts] = useState<{ id: string; amount_allocated: number; description: string; cost_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<{ id: string; amount_allocated: number; description: string; cost_date: string } | null>(null);
  const [defaultType, setDefaultType] = useState<"INCOME" | "EXPENSE">("INCOME");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: cli }, { data: t }, { data: c }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("transactions").select("id, type, amount, due_date, status, description").eq("client_id", id).order("due_date", { ascending: false }),
      supabase.from("client_costs").select("id, amount_allocated, description, cost_date, transaction_id").eq("client_id", id).order("cost_date", { ascending: false }),
    ]);
    setClient(cli);
    setTxs(t || []);
    setCosts(c || []);
    setLoading(false);
  };

  const [syncing, setSyncing] = useState(false);
  const handleSyncAsaas = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-customers", {
        body: { action: "create", client_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Cliente sincronizado com sucesso no Asaas!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar com o Asaas");
    } finally {
      setSyncing(false);
    }
  };
  
  const handleCostDelete = async (costId: string) => {
    if (!confirm("Tem certeza que deseja remover este custo alocado?")) return;
    const { error } = await supabase.from("client_costs").delete().eq("id", costId);
    if (error) return toast.error(error.message);
    toast.success("Custo removido com sucesso!");
    load();
  };

  const handleCostEdit = (cost: any) => {
    setSelectedCost(cost);
    setCostOpen(true);
  };

  const handleTxDelete = async (txId: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento? Se for uma cobrança do Asaas, ela será cancelada lá também.")) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "delete_payment", transaction_id: txId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Lançamento excluído com sucesso!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir o lançamento");
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (!client) return <p className="text-muted-foreground">Cliente não encontrado.</p>;

  const revenuePaid = txs.filter((t) => t.type === "INCOME" && t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);
  const revenuePending = txs.filter((t) => t.type === "INCOME" && t.status !== "PAID").reduce((s, t) => s + Number(t.amount), 0);
  const revenueTotal = revenuePaid + revenuePending;
  
  const allocatedCosts = costs.reduce((s, c) => s + Number(c.amount_allocated), 0);
  
  const txExpenseExtra = txs
    .filter((t) => t.type === "EXPENSE" && !costs.some((c) => c.transaction_id === t.id))
    .reduce((s, t) => s + Number(t.amount), 0);

  const cost = allocatedCosts + txExpenseExtra;
  const profit = revenuePaid - cost; // Profit based on realized revenue
  const margin = revenuePaid > 0 ? profit / revenuePaid : 0;

  return (
    <div className="space-y-6">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader 
        title={client.name} 
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{client.document || "—"} · {client.email || "Sem email"} · {client.phone || "Sem telefone"}</span>
            {client.asaas_customer_id && (
              <Badge variant="outline" className="bg-success-soft text-success border-success/20 ml-2">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Asaas Sincronizado
              </Badge>
            )}
          </div>
        }
      >

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {!client.asaas_customer_id && (
              <Button onClick={handleSyncAsaas} disabled={syncing} variant="default" className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar Asaas
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditOpen(true)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
            <Button onClick={() => setChargeOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Cobrança</Button>
          </div>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          label="Receita" 
          value={formatBRL(revenuePaid)} 
          icon={TrendingUp} 
          accent="success" 
          size="small" 
          subValue={
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              A receber: {formatBRL(revenuePending)}
            </span>
          }
        />
        <StatCard label="Custos alocados" value={formatBRL(cost)} icon={TrendingDown} accent="destructive" size="small" />
        <StatCard label="Lucro" value={formatBRL(profit)} icon={Wallet} accent={profit >= 0 ? "success" : "destructive"} size="small" />
        <StatCard label="Margem" value={formatPercent(margin)} icon={Percent} accent={margin >= 0.2 ? "success" : "warning"} size="small" />
      </div>

      {client.notes && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground whitespace-pre-line">{client.notes}</CardContent></Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Informações Contratuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">Razão Social</span>
                <span className="text-sm font-medium">{client.razao_social || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Nome Fantasia</span>
                <span className="text-sm font-medium">{client.nome_fantasia || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Responsável</span>
                <span className="text-sm font-medium">{client.responsavel_nome || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Valor do Contrato</span>
                <span className="text-sm font-medium">{client.valor_total ? formatBRL(client.valor_total) : "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Prazo</span>
                <span className="text-sm font-medium">{client.prazo_contrato || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Vencimento</span>
                <span className="text-sm font-medium">{client.dia_vencimento ? `Dia ${client.dia_vencimento}` : "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">Serviços Contratados</span>
                <span className="text-sm font-medium">{client.servicos_contratados || "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Endereço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block">CEP</span>
                <span className="text-sm font-medium">{client.cep || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Logradouro</span>
                <span className="text-sm font-medium">{client.endereco_rua || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Número e Compl.</span>
                <span className="text-sm font-medium">
                  {client.endereco_numero || "—"} {client.endereco_complemento ? `- ${client.endereco_complemento}` : ""}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Bairro</span>
                <span className="text-sm font-medium">{client.endereco_bairro || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Cidade / UF</span>
                <span className="text-sm font-medium">
                  {client.endereco_cidade || "—"} {client.endereco_estado ? `/ ${client.endereco_estado}` : ""}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">

      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Lançamentos financeiros</CardTitle>
            {canWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setDefaultType("EXPENSE"); setEditingTxId(null); setTxOpen(true); }}>+ Custo/Despesa</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelectedCost(null); setCostOpen(true); }}>+ Alocar Custo</Button>
                <Button size="sm" onClick={() => setChargeOpen(true)}>+ Cobrança</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {txs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhum lançamento.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{formatDate(t.due_date)}</TableCell>
                      <TableCell className="text-sm">{t.description || (t.type === "INCOME" ? "Receita" : "Despesa")}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${t.type === "INCOME" ? "text-success" : "text-destructive"}`}>
                        {t.type === "INCOME" ? "+" : "-"}{formatBRL(t.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingTxId(t.id); setTxOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleTxDelete(t.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Custos diretos alocados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {costs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Nenhum custo alocado. Lance uma despesa associada a este cliente para registrar custos.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{formatDate(c.cost_date)}</TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-destructive">-{formatBRL(c.amount_allocated)}</TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleCostEdit(c)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCostDelete(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6">
        <ClientWhatsAppIntegration clientId={id!} />
      </div>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} client={client} />
      <TransactionFormDialog open={txOpen} onOpenChange={(v) => { setTxOpen(v); if (!v) setEditingTxId(null); }} onSaved={load} defaultType={defaultType} defaultClientId={id} transactionId={editingTxId} />
      <ChargeFormDialog open={chargeOpen} onOpenChange={setChargeOpen} onSaved={load} defaultClientId={id} />
      <CostFormDialog open={costOpen} onOpenChange={setCostOpen} onSaved={load} clientId={id!} cost={selectedCost} />
    </div>
  );
}

