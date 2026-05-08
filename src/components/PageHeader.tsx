import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string | ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 flex-wrap ${className}`}>
      <div>
        <h1 className="font-display text-[28px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <div className="text-muted-foreground mt-1">
            {subtitle}
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
