import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Wallet, Settings, LogOut, FileBarChart,
  Shield, ClipboardList, FolderKanban, ChevronLeft, ChevronRight, Briefcase, Target, Palette
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar, SidebarTrigger, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut, roles, isAdmin, isFinanceiro, isCriacao, isMembro, isComercial, isDesigner } = useAuth();

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const initials = (user?.user_metadata?.name || user?.email || "U")
    .split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const showAdminFinance = isAdmin || isFinanceiro;
  const showDepartments = isAdmin || isCriacao || isMembro;
  const showCommercial = isAdmin || isComercial;
  const showSystemMgmt = isAdmin;

  const [criacaoId, setCriacaoId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      // Admin: busca qualquer departamento (primeiro disponível)
      supabase
        .from("departments")
        .select("id")
        .limit(1)
        .single()
        .then(({ data }) => { if (data) setCriacaoId(data.id); });
    } else {
      // Criacao/Designer/Membro: busca o departamento que o usuário pertence
      supabase
        .from("department_members")
        .select("department_id")
        .eq("user_id", user.id)
        .limit(1)
        .single()
        .then(({ data }) => { if (data) setCriacaoId(data.department_id); });
    }
  }, [user, isAdmin]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b relative">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-5 transition-all duration-200`}>
          {!collapsed && <img src="/logo-conecta.png" alt="Conecta Logo" className="h-8 w-auto object-contain animate-fade-in" />}
          <SidebarTrigger className="h-8 w-8 hover:bg-accent transition-transform duration-200">
            <ChevronLeft className={`h-5 w-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-1 pt-3">
        {showAdminFinance && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild className="text-sm font-semibold">
                <CollapsibleTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-between cursor-pointer">
                  Administrativo & Financeiro
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard" size="sm" className="text-sm">
                        <NavLink to="/">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/clientes")} tooltip="Clientes" size="sm" className="text-sm">
                        <NavLink to="/clientes">
                          <Users className="h-4 w-4" />
                          <span>Clientes</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/financeiro")} tooltip="Financeiro" size="sm" className="text-sm">
                        <NavLink to="/financeiro">
                          <Wallet className="h-4 w-4" />
                          <span>Financeiro</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/relatorios")} tooltip="Relatórios" size="sm" className="text-sm">
                        <NavLink to="/relatorios">
                          <FileBarChart className="h-4 w-4" />
                          <span>Relatórios</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {(isAdmin || isCriacao || isMembro || isDesigner) && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild className="text-sm font-semibold">
                <CollapsibleTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-between cursor-pointer">
                  Departamento Criativo
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/departamentos/criativo/dashboard"} tooltip="Dashboard" size="sm" className="text-sm">
                        <NavLink to="/departamentos/criativo/dashboard">
                          <Palette className="h-4 w-4" />
                          <span>Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.includes("/board") && pathname.includes(criacaoId || "")} tooltip="Projetos / Tarefas" size="sm" className="text-sm">
                        <NavLink to={criacaoId ? `/departamentos/${criacaoId}/board` : "/departamentos"}>
                          <FolderKanban className="h-4 w-4" />
                          <span>Projetos / Tarefas</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}



        {showCommercial && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild className="text-sm font-semibold">
                <CollapsibleTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-between cursor-pointer">
                  Departamento Comercial
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/departamentos/comercial/dashboard"} tooltip="Dashboard" size="sm" className="text-sm">
                        <NavLink to="/departamentos/comercial/dashboard">
                          <Target className="h-4 w-4" />
                          <span>Dashboard</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/departamentos/comercial"} tooltip="Pipeline / Kanban" size="sm" className="text-sm">
                        <NavLink to="/departamentos/comercial">
                          <FolderKanban className="h-4 w-4" />
                          <span>Pipeline / Kanban</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {showSystemMgmt && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup className="py-0">
              <SidebarGroupLabel asChild className="text-sm font-semibold">
                <CollapsibleTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-between cursor-pointer">
                  Gestão do Sistema
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/usuarios")} tooltip="Usuários" size="sm" className="text-sm">
                        <NavLink to="/usuarios">
                          <Shield className="h-4 w-4" />
                          <span>Usuários</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/atividades")} tooltip="Atividades" size="sm" className="text-sm">
                        <NavLink to="/atividades">
                          <ClipboardList className="h-4 w-4" />
                          <span>Atividades</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive("/configuracoes")} tooltip="Configurações" size="sm" className="text-sm">
                        <NavLink to="/configuracoes">
                          <Settings className="h-4 w-4" />
                          <span>Configurações</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
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
