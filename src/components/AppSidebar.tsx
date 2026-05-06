import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Wallet, Settings, LogOut, Receipt, Repeat, FileBarChart, Shield, ClipboardList, FolderKanban } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Projetos", url: "/departamentos", icon: FolderKanban },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
  { title: "Usuários", url: "/usuarios", icon: Shield, adminOnly: true },
  { title: "Atividades", url: "/atividades", icon: ClipboardList, adminOnly: true },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut, roles } = useAuth();

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const initials = (user?.user_metadata?.name || user?.email || "U")
    .split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-3 py-4">
          <img src="/logo-conecta.png" alt="Conecta Logo" className="h-10 w-auto object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.filter(item => !item.adminOnly || roles.includes("admin")).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary-soft text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.user_metadata?.name || user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize truncate">{roles[0] || "viewer"}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
