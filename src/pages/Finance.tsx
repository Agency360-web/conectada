import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wallet, CheckCircle2, Filter, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

interface Tx {
  id: string; type: string; amount: number; due_date: string; payment_date: string | null;
  status: string; description: string | null;
  client_id?: string | null; category_id?: string | null;
  client?: { name: string } | null; category?: { name: string } | null;
}

export default function Finance() {
  const { canWrite } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [defaultType, setDefaultType] = useState<"INCOME" | "EXPENSE">("INCOME");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id, type, amount, due_date, payment_date, status, description, client_id, category_id, client:clients(name), category:categories(name)")
      .order("due_date", { ascending: false });
    setTxs((data as unknown as Tx[]) || []);
    setLoading(false);
  };
  
  const loadFilters = async () => {
    const [{ data: cli }, { data: cat }] = await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name")
    ]);
    if (cli) setClients(cli);
    if (cat) setCategories(cat);
  };

  useEffect(() => { load(); loadFilters(); }, []);

  const filtered = txs.filter((t) => {
    if (filter !== "all" && t.type !== filter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (clientFilter !== "all" && t.client_id !== clientFilter) return false;
    if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
    if (dateFrom && t.due_date < dateFrom) return false;
    if (dateTo && t.due_date > dateTo) return false;
    return true;
  });
  
  const totalIn = filtered.filter((t) => t.type === "INCOME" && t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter((t) => t.type === "EXPENSE" && t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);

  const markPaid = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payments", {
        body: { action: "receive_in_cash", transaction_id: id, payment_date: todayISO() }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Marcado como pago no sistema e no Asaas");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao marcar como pago");
    }
  };

  const deleteTx = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento permanentemente?")) return;
    
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir: " + error.message);
    
    toast.success("Lançamento excluído");
    load();
  };

  const handleEdit = (id: string) => {
    setEditingTxId(id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Financeiro" 
        subtitle="Fluxo de caixa unificado"
      >
        {canWrite && (
          <Button onClick={() => { setEditingTxId(null); setDefaultType("INCOME"); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Novo lançamento
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Entradas (pago)" value={formatBRL(totalIn)} accent="success" size="small" />
        <StatCard label="Saídas (pago)" value={formatBRL(totalOut)} accent="destructive" size="small" />
        <StatCard label="Saldo" value={formatBRL(totalIn - totalOut)} accent={totalIn - totalOut >= 0 ? "success" : "destructive"} size="small" />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "INCOME" | "EXPENSE")}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="INCOME">Entradas</TabsTrigger>
          <TabsTrigger value="EXPENSE">Saídas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros Avançados
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="OVERDUE">Vencido</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Sem lançamentos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{formatDate(t.due_date)}</TableCell>
                    <TableCell className="text-sm font-medium">{t.description || (t.type === "INCOME" ? "Receita" : "Despesa")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.client?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.category?.name || "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className={`text-right font-semibold ${t.type === "INCOME" ? "text-success" : "text-destructive"}`}>
                      {t.type === "INCOME" ? "+" : "-"}{formatBRL(t.amount)}
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(t.id)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            
                            {t.status !== "PAID" && t.status !== "CANCELLED" && (
                              <DropdownMenuItem onClick={() => markPaid(t.id)} className="text-green-600 focus:text-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteTx(t.id)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog 
        open={open} 
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditingTxId(null);
        }} 
        onSaved={load} 
        defaultType={defaultType} 
        transactionId={editingTxId}
      />
    </div>
  );
}

