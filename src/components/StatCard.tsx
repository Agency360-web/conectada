import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  subValue?: string | React.ReactNode;
  trend?: "up" | "down";
  accent?: "success" | "destructive" | "warning" | "primary" | "info";
  className?: string;
  size?: "default" | "small";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subValue,
  accent = "primary",
  className,
  size = "default"
}: StatCardProps) {
  const accents = {
    success: "bg-success-soft text-success",
    destructive: "bg-destructive-soft text-destructive",
    warning: "bg-warning-soft text-warning-foreground",
    primary: "bg-primary-soft text-primary",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-muted-foreground font-medium", size === "small" ? "text-xs" : "text-sm")}>
            {label}
          </p>
          <p className={cn("font-display font-bold mt-1 text-foreground", size === "small" ? "text-xl" : "text-2xl")}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg flex items-center justify-center shrink-0",
            size === "small" ? "h-9 w-9" : "h-10 w-10",
            accents[accent]
          )}>
            <Icon className={size === "small" ? "h-4 w-4" : "h-5 w-5"} />
          </div>
        )}
      </div>
      {subValue && (
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          {subValue}
        </div>
      )}
    </div>
  );
}
