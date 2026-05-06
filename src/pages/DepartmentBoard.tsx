import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Filter, List, Layout as KanbanIcon, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { TaskModal } from "@/components/TaskModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column {
  id: string;
  name: string;
  position: number;
  color?: string;
}

interface Task {
  id: string;
  title: string;
  column_id: string;
  position: number;
  priority: string;
  client_id?: string;
  due_date?: string;
  client?: { name: string };
  image_url?: string;
}

export default function DepartmentBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState<{ id: string; name: string } | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [targetCol, setTargetCol] = useState<string | undefined>();

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    
    const [{ data: dept }, { data: cols }, { data: tks }] = await Promise.all([
      supabase.from("departments").select("id, name").eq("id", id).single(),
      supabase.from("board_columns").select("*").eq("department_id", id).order("position"),
      supabase.from("tasks").select("*, client:clients(name)").eq("department_id", id).order("position"),
    ]);

    if (!dept) {
      toast.error("Departamento não encontrado");
      return navigate("/departamentos");
    }

    setDepartment(dept);
    setColumns(cols || []);
    
    // Buscar o primeiro anexo de imagem para cada tarefa para o preview
    const { data: atts } = await supabase
      .from("attachments")
      .select("entity_id, file_path")
      .eq("entity_type", "task")
      .ilike("content_type", "image/%");

    const tasksWithImages = (tks || []).map(task => ({
      ...task,
      image_url: atts?.find(a => a.entity_id === task.id)?.file_path
    }));

    setTasks(tasksWithImages);
    setLoading(false);
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Lógica de reordenação (Otimista no front)
    const newTasks = Array.from(tasks);
    const movedTask = newTasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    // Atualiza coluna e posição
    movedTask.column_id = destination.droppableId;
    
    // Simplificado: ordena as tarefas da coluna de destino e insere na nova posição
    const tasksInCol = newTasks.filter(t => t.column_id === destination.droppableId);
    // ... lógica real de reordenação de posições ...
    
    setTasks(newTasks);

    // Persistir no DB
    const { error } = await supabase
      .from("tasks")
      .update({ column_id: destination.droppableId, position: destination.index })
      .eq("id", draggableId);

    if (error) {
      toast.error("Erro ao mover tarefa");
      load(); // Reverte
    }
  };

  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setTaskModalOpen(true);
  };

  const newTask = (colId?: string) => {
    setTargetCol(colId);
    setTaskFormOpen(true);
  };

  const createFromTemplate = async () => {
    if (!columns.length) return toast.error("Crie ao menos uma coluna primeiro");
    
    setLoading(true);
    try {
      const { data: task, error: tError } = await supabase.from("tasks").insert({
        department_id: id,
        column_id: columns[0].id,
        title: "Novo Post Instagram (Template)",
        priority: "NORMAL",
        position: tasks.length,
        created_by: user?.id
      }).select("id").single();

      if (tError) throw tError;

      const subtasks = [
        { task_id: task.id, title: "Definição de Briefing", position: 1 },
        { task_id: task.id, title: "Criação de Arte/Vídeo", position: 2 },
        { task_id: task.id, title: "Revisão Interna", position: 3 },
        { task_id: task.id, title: "Aprovação do Cliente", position: 4 },
        { task_id: task.id, title: "Agendamento/Publicação", position: 5 },
      ];

      const { error: sError } = await supabase.from("task_subtasks").insert(subtasks);
      if (sError) throw sError;

      toast.success("Tarefa criada a partir do template!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addColumn = async () => {
    const name = window.prompt("Nome da nova coluna:");
    if (!name?.trim()) return;

    const { error } = await supabase.from("board_columns").insert({
      department_id: id,
      name: name.trim(),
      position: columns.length + 1
    });

    if (error) return toast.error(error.message);
    toast.success("Coluna adicionada");
    load();
  };

  const renameColumn = async (col: Column) => {
    const name = window.prompt("Novo nome da coluna:", col.name);
    if (!name?.trim() || name.trim() === col.name) return;
    const { error } = await supabase.from("board_columns").update({ name: name.trim() }).eq("id", col.id);
    if (error) return toast.error(error.message);
    toast.success("Coluna renomeada");
    load();
  };

  const deleteColumn = async (col: Column) => {
    const count = tasks.filter(t => t.column_id === col.id).length;
    const msg = count > 0
      ? `Esta coluna tem ${count} tarefa(s). Excluir a coluna também excluirá todas as tarefas. Confirma?`
      : `Excluir a coluna "${col.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("board_columns").delete().eq("id", col.id);
    if (error) return toast.error(error.message);
    toast.success("Coluna excluída");
    load();
  };

  const updateColumnColor = async (col: Column, color: string) => {
    // Atualização otimista
    setColumns(prev => prev.map(c => c.id === col.id ? { ...c, color } : c));
    const { error } = await supabase.from("board_columns").update({ color }).eq("id", col.id);
    if (error) {
      toast.error(error.message);
      load(); // Reverte se falhar
    }
  };

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate("/departamentos")}>
        <ArrowLeft className="h-4 w-4" /> Voltar aos Departamentos
      </div>

      <PageHeader
        title={department?.name || "Quadro"}
        subtitle="Gerencie tarefas e fluxo de trabalho."
      >
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md p-1 bg-muted/50 mr-2">
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setView("kanban")}>
              <KanbanIcon className="h-4 w-4 mr-1.5" /> Kanban
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => setView("list")}>
              <List className="h-4 w-4 mr-1.5" /> Lista
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => createFromTemplate()}><KanbanIcon className="h-4 w-4 mr-1.5" /> Criar de Template</Button>
          <Button size="sm" onClick={() => newTask()}><Plus className="h-4 w-4 mr-1.5" /> Nova Tarefa</Button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0 pb-4">
        {view === "kanban" ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full min-w-max px-1">
              {columns.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20 p-12 text-center">
                  <p className="text-muted-foreground mb-4">Este quadro ainda não tem colunas.</p>
                  <Button variant="outline" onClick={addColumn}><Plus className="h-4 w-4 mr-2" /> Adicionar Coluna (Ex: A Fazer)</Button>
                </div>
              )}

              {columns.map(col => (
                <div key={col.id} className="w-80 flex flex-col bg-muted/40 rounded-xl border p-3">
                  {/* Cabeçalho da coluna com cor personalizada */}
                  <div
                    className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg -mx-0 ${
                      col.color && col.color !== 'default'
                        ? `border-t-4`
                        : ''
                    }`}
                    style={col.color && col.color !== 'default' ? { borderTopColor: col.color } : {}}
                  >
                    <h3 className="font-semibold text-sm flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                      {col.name}
                      <Badge variant="secondary" className="bg-muted text-[10px] py-0 px-1.5 h-4">
                        {tasks.filter(t => t.column_id === col.id).length}
                      </Badge>
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => renameColumn(col)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear coluna
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/* Paleta de Cores */}
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Cor da coluna</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Padrão', value: 'default', bg: 'bg-muted border-2 border-dashed' },
                              { label: 'Vermelho', value: '#ef4444', bg: 'bg-red-500' },
                              { label: 'Laranja', value: '#f97316', bg: 'bg-orange-500' },
                              { label: 'Amarelo', value: '#eab308', bg: 'bg-yellow-400' },
                              { label: 'Verde', value: '#22c55e', bg: 'bg-green-500' },
                              { label: 'Azul', value: '#3b82f6', bg: 'bg-blue-500' },
                              { label: 'Roxo', value: '#a855f7', bg: 'bg-purple-500' },
                              { label: 'Rosa', value: '#ec4899', bg: 'bg-pink-500' },
                            ].map(option => (
                              <button
                                key={option.value}
                                title={option.label}
                                onClick={() => updateColumnColor(col, option.value)}
                                className={`w-6 h-6 rounded-full ${option.bg} transition-transform hover:scale-110 ${
                                  (col.color || 'default') === option.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteColumn(col)} className="text-destructive focus:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 space-y-3 min-h-[50px]"
                      >
                        {tasks
                          .filter(t => t.column_id === col.id)
                          .map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openTask(task.id)}
                                  className="bg-card border rounded-lg shadow-sm hover:border-primary/30 transition-all group cursor-pointer overflow-hidden"
                                >
                                  {task.image_url && (
                                    <div className="w-full h-32 overflow-hidden border-b bg-muted">
                                      <img 
                                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/attachments/${task.image_url}`} 
                                        alt="Preview"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      />
                                    </div>
                                  )}
                                  <div className="p-3 flex flex-col gap-2">
                                    <div className="flex items-start justify-between">
                                      <span className="text-sm font-medium leading-snug">{task.title}</span>
                                    </div>
                                    
                                    {task.client && (
                                      <span className="text-[10px] font-semibold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded w-fit">
                                        {task.client.name}
                                      </span>
                                    )}

                                    <div className="flex items-center justify-between mt-1">
                                      <Badge variant="outline" className="text-[9px] uppercase font-bold border-muted-foreground/30 text-muted-foreground py-0">
                                        {task.priority}
                                      </Badge>
                                      {task.due_date && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {new Date(task.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                        <Button variant="ghost" className="w-full justify-start text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 h-8" onClick={() => newTask(col.id)}>
                          <Plus className="h-3 w-3 mr-2" /> Adicionar tarefa
                        </Button>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
              
              {columns.length > 0 && (
                <Button variant="ghost" className="w-80 h-10 border border-dashed rounded-xl shrink-0 text-muted-foreground hover:text-primary" onClick={addColumn}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Coluna
                </Button>
              )}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest px-6">Tarefa</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Cliente</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Prioridade</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nenhuma tarefa encontrada.</TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow 
                      key={task.id} 
                      className="cursor-pointer hover:bg-muted/20 transition-colors group"
                      onClick={() => openTask(task.id)}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors">{task.title}</div>
                      </TableCell>
                      <TableCell>
                        {task.client ? (
                          <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20">
                            {task.client.name}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary/80">
                          {columns.find(c => c.id === task.column_id)?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          task.priority === 'URGENT' ? 'text-red-500 border-red-200' : 
                          task.priority === 'HIGH' ? 'text-orange-500 border-orange-200' : ''
                        }`}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TaskFormDialog 
        open={taskFormOpen} 
        onOpenChange={setTaskFormOpen} 
        onSaved={load} 
        departmentId={id!} 
        columnId={targetCol} 
      />
      
      <TaskModal 
        open={taskModalOpen} 
        onOpenChange={setTaskModalOpen} 
        taskId={selectedTaskId} 
        onChanged={load} 
      />
    </div>
  );
}
