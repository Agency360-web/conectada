import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Finance from "@/pages/Finance";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import ActivityLogs from "@/pages/ActivityLogs";
import Departments from "@/pages/Departments";
import DepartmentBoard from "@/pages/DepartmentBoard";
import BoardRedirect from "@/pages/BoardRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<RoleBasedRoute><AppLayout /></RoleBasedRoute>}>

              {/* Dashboard - apenas Admin e Financeiro */}
              <Route path="/" element={<RoleBasedRoute allowedRoles={["financeiro"]}><Dashboard /></RoleBasedRoute>} />

              {/* Redirect automático para o board do usuário (criacao/designer/membro) */}
              <Route path="/meu-board" element={<BoardRedirect />} />

              {/* Administrativo & Financeiro - Admin e Financeiro */}
              <Route path="/clientes" element={<RoleBasedRoute allowedRoles={["financeiro"]}><Clients /></RoleBasedRoute>} />
              <Route path="/clientes/:id" element={<RoleBasedRoute allowedRoles={["financeiro"]}><ClientDetail /></RoleBasedRoute>} />
              <Route path="/financeiro" element={<RoleBasedRoute allowedRoles={["financeiro"]}><Finance /></RoleBasedRoute>} />
              <Route path="/relatorios" element={<RoleBasedRoute allowedRoles={["financeiro"]}><Reports /></RoleBasedRoute>} />

              {/* Gestão de Sistema - Apenas Admin */}
              <Route path="/usuarios" element={<RoleBasedRoute allowedRoles={[]}><Users /></RoleBasedRoute>} />
              <Route path="/atividades" element={<RoleBasedRoute allowedRoles={[]}><ActivityLogs /></RoleBasedRoute>} />
              <Route path="/configuracoes" element={<RoleBasedRoute allowedRoles={[]}><Settings /></RoleBasedRoute>} />

              {/* Departamentos - listagem apenas para Admin */}
              <Route path="/departamentos" element={<RoleBasedRoute><Departments /></RoleBasedRoute>} />

              {/* Board - Admin, Criacao, Designer, Membro */}
              <Route path="/departamentos/:id/board" element={<RoleBasedRoute allowedRoles={["criacao", "membro", "designer"]}><DepartmentBoard /></RoleBasedRoute>} />



            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
