import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Wallet, AlertCircle, Loader2, X, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: 'finance' | 'creative';
  title: string;
  description: string;
  date: string;
  link: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dismissed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();

  const loadNotifications = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const alerts: Notification[] = [];

    try {
      // 1. Financeiro
      try {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("id, description, due_date, type")
          .eq("status", "PENDING")
          .lte("due_date", today);

        transactions?.forEach(t => {
          alerts.push({
            id: `trans-${t.id}`,
            type: 'finance',
            title: t.type === 'INCOME' ? "Recebimento" : "Pagamento",
            description: t.description || "Sem descrição",
            date: t.due_date,
            link: "/financeiro"
          });
        });
      } catch (e) { console.error("Erro financeiro:", e); }

      // 2. Criativo
      try {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, due_date, department_id")
          .lte("due_date", today);

        tasks?.forEach(tk => {
          if (tk.due_date) {
            alerts.push({
              id: `task-${tk.id}`,
              type: 'creative',
              title: "Tarefa Pendente",
              description: tk.title,
              date: tk.due_date,
              link: tk.department_id ? `/departamentos/${tk.department_id}/board` : "/meu-board"
            });
          }
        });
      } catch (e) { console.error("Erro tarefas:", e); }

      setNotifications(alerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (error) {
      console.error("Erro geral notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (link: string) => {
    navigate(link);
  };

  const dismissNotification = (id: string) => {
    const updatedDismissed = [...dismissedIds, id];
    setDismissedIds(updatedDismissed);
    localStorage.setItem("dismissed_notifications", JSON.stringify(updatedDismissed));
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    const updatedDismissed = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updatedDismissed);
    localStorage.setItem("dismissed_notifications", JSON.stringify(updatedDismissed));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'finance': return <Wallet className="h-4 w-4 text-green-500" />;
      case 'creative': return <Calendar className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {activeNotifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 border-2 border-background text-[10px]">
              {activeNotifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <h3 className="font-bold text-sm">Central de Alertas</h3>
          {activeNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="h-7 text-xs px-2 hover:bg-destructive-soft hover:text-destructive text-muted-foreground flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar tudo
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Tudo em dia!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {activeNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors group relative cursor-pointer"
                  onClick={() => handleNotificationClick(n.link)}
                >
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="mt-1">{getTypeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-none mb-1">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">{n.description}</p>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(n.date + "T12:00:00").toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive hover:bg-muted transition-all rounded-full ml-2 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.id);
                    }}
                    title="Remover alerta"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
