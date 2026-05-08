import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "./NotificationCenter";

export function Header() {
  return (
    <header className="h-14 flex items-center justify-between border-b bg-card/60 backdrop-blur px-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden" />
      </div>
      
      <div className="flex items-center gap-4">
        <NotificationCenter />
      </div>
    </header>
  );
}
