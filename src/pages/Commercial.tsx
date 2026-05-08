import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, Target, TrendingUp, CheckCircle2, History, Calendar, AlertCircle, Settings, Pencil, Trash2, Layout as KanbanIcon, List, MessageSquare, Wallet, User as UserIcon, MoreHorizontal, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadModal } from "@/components/LeadModal";

interface Column {
  id: string;
  name: string;
  position: number;
  color?: string;
}

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  source: string;
  estimated_value: number;
  status: string;
  column_id: string;
  notes: string;
  next_contact_date: string | null;
  created_at: string;
  profiles?: {
    name: string;
  } | null;
}

export default function Commercial() {
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | undefined>();

  const loadData = async () => {
    try {
      const [{ data: cols }, { data: lds }] = await Promise.all([
        supabase.from("commercial_columns").select("*").order("position"),
        supabase.from("leads").select("*").order("created_at", { ascending: false })
      ]);
      setColumns(cols || []);
      setLeads((lds as any[]) || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const updatedLeads = [...leads];
    const leadIndex = updatedLeads.findIndex(l => l.id === draggableId);
    if (leadIndex !== -1) {
      updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], column_id: destination.droppableId };
      setLeads(updatedLeads);
    }

    const { error } = await supabase.from("leads").update({ column_id: destination.droppableId }).eq("id", draggableId);
    if (error) loadData();
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr + "T12:00:00");
    const today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  };

  // Status Filter Logic: Active (not WON/LOST) vs Archived (WON/LOST)
  const filterLeads = (l: Lead) => {
    const isArchivedStatus = l.status === 'WON' || l.status === 'LOST';
    return showArchived ? isArchivedStatus : !isArchivedStatus;
  };

  const activeLeads = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST');
  const pipelineValue = activeLeads.reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0);
  const wonThisMonth = leads.filter(l => {
    if (l.status !== 'WON') return false;
    const date = new Date(l.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const updateColumnColor = async (col: Column, color: string) => {
    setColumns(prev => prev.map(c => c.id === col.id ? { ...c, color } : c));
    const { error } = await supabase.from("commercial_columns").update({ color }).eq("id", col.id);
    if (error) loadData();
  };

  if (loading) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 overflow-hidden">
      <PageHeader title="Pipeline Comercial" subtitle="Gestão proativa de oportunidades.">
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md p-1 bg-muted/50 mr-2">
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setView("kanban")}>
              <KanbanIcon className="h-4 w-4 mr-1.5" /> Kanban
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setView("list")}>
              <List className="h-4 w-4 mr-1.5" /> Lista
            </Button>
          </div>
          <Button variant={showArchived ? "secondary" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)}>
            <History className="h-4 w-4 mr-1.5" /> {showArchived ? "Ver Ativos" : "Ver Arquivados"}
          </Button>
          <Button size="sm" onClick={() => { setSelectedLeadId(null); setTargetColumnId(undefined); setLeadModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Lead
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leads Ativos</span>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0 font-bold text-2xl text-primary">{activeLeads.length}</CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor em Pipeline</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0 font-bold text-2xl text-green-600">R$ {pipelineValue.toLocaleString('pt-BR')}</CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-primary/10">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendas (Mês)</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0 font-bold text-2xl text-blue-600">{wonThisMonth}</CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-auto min-h-0 pb-4">
        {view === "kanban" ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full px-1 min-w-max">
              {columns.map(col => (
                <div key={col.id} className="w-[310px] flex flex-col bg-muted/30 rounded-xl border shrink-0">
                  <div className={`flex items-center justify-between p-3 border-b bg-background/50 rounded-t-xl ${col.color && col.color !== 'default' ? 'border-t-4' : ''}`}
                    style={col.color && col.color !== 'default' ? { borderTopColor: col.color } : {}}>
                    <h3 className="font-bold text-xs flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                      {col.name}
                      <Badge variant="secondary" className="bg-muted text-[10px] h-4 px-1.5">{leads.filter(l => l.column_id === col.id && filterLeads(l)).length}</Badge>
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={async () => {
                          const n = window.prompt("Novo nome:", col.name);
                          if (n?.trim()) { await supabase.from("commercial_columns").update({ name: n.trim() }).eq("id", col.id); loadData(); }
                        }}><Pencil className="h-3 w-3 mr-2" /> Renomear</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Cor da coluna</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['default', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].map(c => (
                              <button key={c} onClick={() => updateColumnColor(col, c)} className={`w-5 h-5 rounded-full border shadow-sm ${c === 'default' ? 'bg-muted border-dashed' : ''} ${col.color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={c !== 'default' ? { backgroundColor: c } : {}} />
                            ))}
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={async () => {
                          if (confirm("Excluir coluna?")) { await supabase.from("commercial_columns").delete().eq("id", col.id); loadData(); }
                        }}><Trash2 className="h-3 w-3 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                        {leads
                          .filter(l => l.column_id === col.id && filterLeads(l))
                          .map((l, idx) => {
                            const overdue = isOverdue(l.next_contact_date);
                            const initials = l.company_name?.substring(0, 1).toUpperCase() || "?";
                            return (
                              <Draggable key={l.id} draggableId={l.id} index={idx}>
                                {(p) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => { setSelectedLeadId(l.id); setLeadModalOpen(true); }}
                                    className={`bg-background border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all group cursor-pointer overflow-hidden flex flex-col ${overdue ? 'ring-1 ring-red-500/30 border-red-500/30' : ''}`}>
                                    
                                    {/* Top Bar with Source Tags */}
                                    <div className="px-3 py-2 border-b bg-muted/10 flex items-center justify-between gap-2 overflow-hidden">
                                      <div className="flex gap-1 overflow-hidden">
                                        <Badge variant="outline" className="text-[9px] font-bold h-4 border-muted-foreground/20 bg-background text-muted-foreground whitespace-nowrap">
                                          {l.source || "Geral"}
                                        </Badge>
                                        <Badge variant="outline" className="text-[9px] font-bold h-4 border-primary/20 bg-primary/5 text-primary whitespace-nowrap">
                                          CRM
                                        </Badge>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        {l.status === 'WON' && <Badge className="bg-green-500 h-4 text-[8px] font-bold">GANHO</Badge>}
                                        {l.status === 'LOST' && <Badge variant="destructive" className="h-4 text-[8px] font-bold">PERDIDO</Badge>}
                                      </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="p-4 space-y-4">
                                      <div className="flex gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                                          {initials}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-base font-bold leading-tight group-hover:text-primary transition-colors truncate mb-1">{l.company_name}</h4>
                                          <p className="text-xs text-muted-foreground font-medium truncate">{l.contact_name}</p>
                                        </div>
                                        {overdue && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 animate-pulse mt-0.5" />}
                                      </div>

                                      {/* Info Grid */}
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                                          <UserIcon className="h-3.5 w-3.5" />
                                          <span className="truncate">Responsável: <span className="font-bold text-foreground">{l.profiles?.name || "Sem Atribuição"}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-[11px] text-primary font-bold">
                                          <Wallet className="h-3.5 w-3.5" />
                                          <span>R$ {Number(l.estimated_value).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className={`flex items-center gap-2.5 text-[11px] font-bold ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                          <Calendar className="h-3.5 w-3.5" />
                                          <span>{l.next_contact_date ? new Date(l.next_contact_date + "T12:00:00").toLocaleDateString('pt-BR') : "Sem data"}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground italic">
                                          <MessageSquare className="h-3.5 w-3.5" />
                                          <span className="truncate text-[10px]">Ver histórico de atividades...</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bottom Bar / Quick Actions */}
                                    <div className="px-3 py-2 bg-muted/5 flex items-center justify-between border-t border-muted/50 mt-auto">
                                      <span className="text-[9px] text-muted-foreground font-mono">REF: {l.id.substring(0, 5).toUpperCase()}</span>
                                      <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-green-50 hover:text-green-600" onClick={(e) => {
                                          e.stopPropagation();
                                          if (l.phone) window.open(`https://wa.me/55${l.phone.replace(/\D/g, "")}`, "_blank");
                                        }}>
                                          <MessageSquare className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setSelectedLeadId(l.id); setLeadModalOpen(true); }}>
                                          <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        {provided.placeholder}
                        <Button variant="ghost" className="w-full justify-start text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 h-10 border border-dashed rounded-xl" 
                          onClick={() => { setSelectedLeadId(null); setTargetColumnId(col.id); setLeadModalOpen(true); }}>
                          <Plus className="h-3 w-3 mr-2" /> Adicionar Lead
                        </Button>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              <Button variant="ghost" className="w-[310px] h-12 border border-dashed rounded-xl shrink-0 text-muted-foreground hover:text-primary" 
                onClick={async () => {
                  const n = window.prompt("Nome:");
                  if (n?.trim()) { await supabase.from("commercial_columns").insert({ name: n.trim(), position: columns.length + 1 }); loadData(); }
                }}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Estágio
              </Button>
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest px-6 h-10">Lead / Empresa</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest h-10">Responsável</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest h-10">Estágio</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest h-10 text-right">Valor</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest h-10">Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nenhum lead encontrado.</TableCell></TableRow>
                ) : (
                  leads.filter(filterLeads).map((l) => (
                    <TableRow key={l.id} className="cursor-pointer hover:bg-muted/20 transition-colors group" onClick={() => { setSelectedLeadId(l.id); setLeadModalOpen(true); }}>
                      <TableCell className="px-6 py-3 font-medium text-sm group-hover:text-primary transition-colors">{l.company_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">{l.profiles?.name || "Sem atribuição"}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary/80">{columns.find(c => c.id === l.column_id)?.name}</Badge></TableCell>
                      <TableCell className="text-right font-bold text-sm">R$ {Number(l.estimated_value).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className={`text-xs font-medium ${isOverdue(l.next_contact_date) ? 'text-red-500' : ''}`}>
                        {l.next_contact_date ? new Date(l.next_contact_date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <LeadModal open={leadModalOpen} onOpenChange={setLeadModalOpen} leadId={selectedLeadId} columnId={targetColumnId} onSaved={loadData} />
    </div>
  );
}
