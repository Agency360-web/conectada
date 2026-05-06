import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PAID: "bg-success-soft text-success border-success/20",
  PENDING: "bg-warning-soft text-warning-foreground border-warning/30",
  OVERDUE: "bg-destructive-soft text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};
const labels: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] || "")}>
      {labels[status] || status}
    </Badge>
  );
}
