import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ChevronRight, Building2, MoreVertical, PowerOff, Trash2, Power } from "lucide-react";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Client {
  id: string; name: string; document: string | null; email: string | null; phone: string | null; created_at: string; active: boolean;
}

export default function Clients() {
  const { canWrite } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("id, name, document, email, phone, created_at, active").order("name");
    setClients(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clients").update({ active: !currentStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(currentStatus ? "Cliente inativado" : "Cliente ativado");
    load();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Tem certeza que deseja excluir este cliente? Se houver histórico financeiro ou atividades, a exclusão será bloqueada. Nesses casos, recomendamos apenas inativar o cliente.")) return;
    
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      if (error.code === '23503') {
        return toast.error("Este cliente possui histórico financeiro. Não é possível excluí-lo. Recomendamos inativá-lo.");
      }
      return toast.error(error.message);
    }
    toast.success("Cliente excluído com sucesso!");
    load();
  };

  const activeClients = clients.filter(c => c.active !== false);
  const inactiveClients = clients.filter(c => c.active === false);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Clientes" 
        subtitle={`${clients.length} cliente(s) cadastrado(s)`}
      >
        {canWrite && (
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo cliente</Button>
        )}
      </PageHeader>

      <Tabs defaultValue="ativos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ativos">Ativos ({activeClients.length})</TabsTrigger>
          <TabsTrigger value="inativos">Inativos ({inactiveClients.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="grid gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (
          <>
            <TabsContent value="ativos" className="mt-0">
              {activeClients.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum cliente ativo encontrado.</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {activeClients.map((c) => (
                    <Link key={c.id} to={`/clientes/${c.id}`}>
                      <Card className="hover:shadow-card hover:border-primary/30 transition-all cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-semibold">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.document || "Sem documento"} · {c.email || "Sem email"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground hidden md:block">Desde {formatDate(c.created_at)}</span>
                          
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleToggleStatus(c.id, c.active, e)}>
                                  <PowerOff className="h-4 w-4 mr-2" /> Inativar Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDelete(c.id, e)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!canWrite && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inativos" className="mt-0">
              {inactiveClients.length === 0 ? (
                <Card><CardContent className="py-16 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Nenhum cliente inativo.</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-3">
                  {inactiveClients.map((c) => (
                    <Link key={c.id} to={`/clientes/${c.id}`}>
                      <Card className="hover:shadow-card hover:border-primary/30 transition-all cursor-pointer opacity-70">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-muted-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.document || "Sem documento"} · {c.email || "Sem email"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground hidden md:block">Desde {formatDate(c.created_at)}</span>
                          
                          {canWrite && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleToggleStatus(c.id, c.active, e)}>
                                  <Power className="h-4 w-4 mr-2" /> Ativar Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleDelete(c.id, e)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!canWrite && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      <ClientFormDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </div>
  );
}
