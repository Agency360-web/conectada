import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileList } from "@/components/FileList";
import { FileUploader } from "@/components/FileUploader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Calendar, Clock, User, Paperclip, MessageSquare, History, 
  CheckCircle2, Trash2, Activity, Send, Image as ImageIcon
} from "lucide-react";
import { formatDate } from "@/lib/format";

interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taskId: string | null;
  onChanged: () => void;
}

export function TaskModal({ open, onOpenChange, taskId, onChanged }: Props) {
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshFiles, setRefreshFiles] = useState(0);
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");

  useEffect(() => {
    if (open && taskId) load();
  }, [open, taskId]);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: st }, { data: ct }, { data: lg }] = await Promise.all([
      supabase.from("tasks").select("*, client:clients(name), column:board_columns(name)").eq("id", taskId).single(),
      supabase.from("task_subtasks").select("*").eq("task_id", taskId).order("position"),
      supabase.from("task_comments").select("*, user_email:profiles(email)").eq("task_id", taskId).order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").eq("entity_id", taskId).order("created_at", { ascending: false }),
    ]);

    setTask(t);
    setLocalTitle(t?.title || "");
    setLocalDesc(t?.description || "");
    setSubtasks(st || []);
    
    const combined = [
      ...(ct?.map(c => ({ ...c, type: 'comment', user_email: (c.user_email as any)?.email })) || []),
      ...(lg?.map(l => ({ ...l, type: 'log' })) || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setTimeline(combined);
    setLoading(false);
  };

  const updateField = async (field: string, value: any) => {
    if (!taskId) return;
    setTask((prev: any) => ({ ...prev, [field]: value }));
    const { error } = await supabase.from("tasks").update({ [field]: value }).eq("id", taskId);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else onChanged();
  };

  const deleteTask = async () => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return toast.error(error.message);
    toast.success("Tarefa excluída");
    onOpenChange(false);
    onChanged();
  };

  const toggleSubtask = async (id: string, current: boolean) => {
    const { error } = await supabase.from("task_subtasks").update({ is_completed: !current }).eq("id", id);
    if (!error) {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, is_completed: !current } : s));
      onChanged();
    }
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const { error } = await supabase.from("task_subtasks").insert({
      task_id: taskId,
      title: newSubtask,
      position: subtasks.length,
    });
    if (!error) {
      setNewSubtask("");
      load();
      onChanged();
    }
  };

  const addComment = async (content?: string) => {
    const textToSubmit = content || newComment;
    if (!textToSubmit.trim()) return;
    
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: user?.id,
      content: textToSubmit,
    });
    
    if (!error) {
      setNewComment("");
      load();
    }
  };

  const onChatFileUpload = async (filePath: string) => {
    const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/attachments/${filePath}`;
    const fileName = filePath.split('/').pop();
    const commentContent = `📎 Arquivo enviado: ${fileName}\n${fileUrl}`;
    await addComment(commentContent);
    setRefreshFiles(k => k + 1);
  };

  if (!task) return null;

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Conteúdo Principal */}
          <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                {/* Cabeçalho */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {task.column?.name}
                      </Badge>
                      <Badge variant="outline" className={
                        task.priority === 'URGENT' ? 'text-red-500 border-red-200' : 
                        task.priority === 'HIGH' ? 'text-orange-500 border-orange-200' : ''
                      }>
                        {task.priority || "NORMAL"}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={deleteTask}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input 
                    value={localTitle} 
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={() => updateField("title", localTitle)}
                    className="text-7xl font-bold border-none p-0 focus-visible:ring-0 h-auto bg-transparent tracking-tighter"
                  />
                </div>

                {/* Grade de Informações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Cliente
                    </Label>
                    <div className="text-sm font-medium">{task.client?.name || "Sem cliente"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Prazo
                    </Label>
                    <div className="text-sm font-medium">{task.due_date ? formatDate(task.due_date) : "Sem prazo"}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Criado em
                    </Label>
                    <div className="text-sm font-medium">{formatDate(task.created_at)}</div>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" /> Descrição
                  </h3>
                  <Textarea 
                    value={localDesc} 
                    onChange={(e) => setLocalDesc(e.target.value)}
                    onBlur={() => updateField("description", localDesc)}
                    placeholder="Escreva os detalhes da tarefa..."
                    className="min-h-[180px] text-sm leading-relaxed p-3 bg-background focus-visible:ring-1"
                  />
                </div>

                {/* Subtarefas */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Subtarefas
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{subtasks.length} ({Math.round(progress)}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  
                  <div className="space-y-1">
                    {subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox checked={s.is_completed} onCheckedChange={() => toggleSubtask(s.id, s.is_completed)} />
                        <span className={`text-sm ${s.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {s.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={addSubtask} className="flex gap-2 mt-2">
                    <Input 
                      placeholder="Adicionar subtarefa..." 
                      className="h-9 text-sm rounded-md bg-muted/20" 
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                    />
                    <Button type="submit" size="sm" variant="secondary" className="h-9 font-medium">Adicionar</Button>
                  </form>
                </div>

                {/* Anexos */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-primary" /> Anexos
                    </h3>
                    <FileUploader entityType="task" entityId={taskId!} onUploaded={() => setRefreshFiles(k => k + 1)} />
                  </div>
                  <FileList entityType="task" entityId={taskId!} refreshKey={refreshFiles} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Lateral Direita (Chat) */}
          <div className="w-80 bg-muted/20 flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2 bg-background/50">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Atividade e Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.id}>
                    {item.type === 'log' ? (
                      <div className="flex gap-2 py-1">
                        <Activity className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-[10px] text-muted-foreground italic">
                          <span className="font-semibold text-foreground/70">{item.user_email || "Sistema"}</span> {item.action === 'INSERT' ? 'criou' : 'alterou'} em {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-primary">{item.user_email}</span>
                          <span className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="bg-background border rounded-lg p-2 text-xs shadow-sm">
                          {item.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <div className="relative">
                <Textarea 
                  placeholder="Escreva algo..." 
                  className="min-h-[100px] text-xs resize-none pr-10 bg-muted/20 pb-10"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <FileUploader 
                    entityType="task" 
                    entityId={taskId!} 
                    onUploaded={onChatFileUpload}
                    className="p-1.5 h-8 w-8 hover:bg-muted rounded-md text-muted-foreground transition-colors"
                  />
                </div>
                <Button 
                  size="sm" 
                  className="absolute bottom-2 right-2 h-8 px-3 text-[10px]" 
                  onClick={() => addComment()}
                >
                  <Send className="h-3 w-3 mr-1.5" /> Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
