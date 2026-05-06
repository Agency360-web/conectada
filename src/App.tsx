import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/clientes/:id" element={<ClientDetail />} />
              <Route path="/financeiro" element={<Finance />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/atividades" element={<ActivityLogs />} />
              <Route path="/departamentos" element={<Departments />} />
              <Route path="/departamentos/:id/board" element={<DepartmentBoard />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
