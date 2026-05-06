import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  return (
    <header className="h-14 flex items-center gap-3 border-b bg-card/60 backdrop-blur px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="h-4 w-px bg-border" />
      <span className="text-sm text-muted-foreground font-medium">Gestão Financeira</span>
    </header>
  );
}
