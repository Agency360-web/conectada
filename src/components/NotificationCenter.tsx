import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Target, Wallet, AlertCircle, Loader2 } from "lucide-react";
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
  type: 'commercial' | 'finance' | 'creative';
  title: string;
  description: string;
  date: string;
  link: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const alerts: Notification[] = [];

    try {
      // 1. Comercial
      try {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, company_name, next_contact_date")
          .neq("status", "WON")
          .neq("status", "LOST")
          .lte("next_contact_date", today);

        leads?.forEach(l => {
          if (l.next_contact_date) {
            alerts.push({
              id: `lead-${l.id}`,
              type: 'commercial',
              title: "Follow-up Pendente",
              description: l.company_name,
              date: l.next_contact_date,
              link: "/departamentos/comercial"
            });
          }
        });
      } catch (e) { console.error("Erro leads:", e); }

      // 2. Financeiro
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

      // 3. Criativo
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commercial': return <Target className="h-4 w-4 text-blue-500" />;
      case 'finance': return <Wallet className="h-4 w-4 text-green-500" />;
      case 'creative': return <Calendar className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-accent">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 border-2 border-background text-[10px]">
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="font-bold text-sm">Central de Alertas</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Tudo em dia!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.link)}
                  className="flex gap-3 p-4 hover:bg-muted/50 transition-colors text-left border-b last:border-0"
                >
                  <div className="mt-1">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-none mb-1">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">{n.description}</p>
                    <p className="text-[9px] font-mono text-primary">{new Date(n.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
