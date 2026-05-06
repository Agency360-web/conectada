import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Log {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  changes: Record<string, unknown> | null;
}

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  INSERT: { label: "Criou", variant: "default" },
  UPDATE: { label: "Alterou", variant: "secondary" },
  DELETE: { label: "Removeu", variant: "destructive" },
};

const ENTITY_LABELS: Record<string, string> = {
  transactions: "transação",
  clients: "cliente",
  categories: "categoria",
  monthly_budgets: "meta mensal",
};

function formatAction(log: Log): string {
  const who = log.user_email || "Sistema";
  const action = ACTION_LABELS[log.action]?.label || log.action;
  const entity = ENTITY_LABELS[log.entity_type] || log.entity_type;
  const label = log.entity_label ? `"${log.entity_label}"` : "";

  if (log.action === "UPDATE" && log.changes) {
    const oldData = (log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> }).old || {};
    const newData = (log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> }).new || {};
    const changed = Object.keys(newData).filter(
      (k) => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]) && k !== "updated_at"
    );
    if (changed.length > 0) {
      const details = changed
        .slice(0, 2)
        .map((k) => `${k}: "${oldData[k]}" → "${newData[k]}"`)
        .join(", ");
      return `${who} ${action} ${entity} ${label}: ${details}`;
    }
  }
  return `${who} ${action} ${entity} ${label}`;
}

export default function ActivityLogs() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");

  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [page, actionFilter, entityFilter]);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (actionFilter !== "ALL") query = query.eq("action", actionFilter);
    if (entityFilter !== "ALL") query = query.eq("entity_type", entityFilter);

    const { data, count } = await query;
    setLogs((data as Log[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log de Atividades"
        subtitle="Histórico completo de ações realizadas no sistema."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-lg">Registros ({total})</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Criações</SelectItem>
                <SelectItem value="UPDATE">Alterações</SelectItem>
                <SelectItem value="DELETE">Exclusões</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as entidades</SelectItem>
                <SelectItem value="transactions">Transações</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhum registro encontrado.</p>
              <p className="text-xs mt-1">Realize alguma ação (criar/editar transação ou cliente) para gerar logs.</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const actionMeta = ACTION_LABELS[log.action] || { label: log.action, variant: "secondary" as const };
                return (
                  <div key={log.id} className="flex items-start gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <Badge variant={actionMeta.variant} className="mt-0.5 shrink-0 text-xs">
                      {actionMeta.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{formatAction(log)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                        {log.user_email && ` · ${log.user_email}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
