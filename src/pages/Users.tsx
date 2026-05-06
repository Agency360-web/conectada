import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserCog, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  financeiro: "Financeiro",
  designer: "Designer Gráfico",
  video_editor: "Editor de Vídeo",
  traffic_manager: "Gestor de Tráfego",
  viewer: "Visualizador",
};

export default function Users() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    // Join profiles + user_roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .order("name");

    if (profilesError) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const roleMap = new Map<string, string>();
    (roles || []).forEach((r) => roleMap.set(r.user_id, r.role));

    const merged: UserRow[] = (profiles || []).map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: roleMap.get(p.id) || "viewer",
    }));

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin === false) {
      toast.error("Acesso restrito a administradores");
      navigate("/");
      return;
    }
    load();
  }, [isAdmin, navigate]);

  const handleRoleChange = async (targetId: string, newRole: string) => {
    if (targetId === user?.id) {
      toast.error("Você não pode alterar sua própria permissão");
      return;
    }

    // Delete existing role then insert new one (constraint is composite: user_id + role)
    await supabase.from("user_roles").delete().eq("user_id", targetId);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: targetId, role: newRole } as any);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Permissão atualizada!");
      load();
    }
  };

  const handleDelete = async (targetId: string) => {
    if (targetId === user?.id) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este usuário? Esta ação removerá o perfil e as permissões.")) return;

    await supabase.from("user_roles").delete().eq("user_id", targetId);
    const { error } = await supabase.from("profiles").delete().eq("id", targetId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Usuário removido!");
      load();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return toast.error("Preencha nome e email");

    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, name: inviteName, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Convite enviado com sucesso! O usuário receberá um email.");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao convidar usuário");
    } finally {
      setInviting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <ShieldCheck className="h-4 w-4 text-primary" />;
      case "financeiro": return <Shield className="h-4 w-4 text-blue-500" />;
      case "designer":
      case "video_editor":
      case "traffic_manager": return <UserCog className="h-4 w-4 text-purple-500" />;
      default: return <ShieldAlert className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Controle quem acessa e o que pode fazer no sistema"
      >
        <Button onClick={() => setInviteOpen(true)}>
          <UserCog className="h-4 w-4 mr-2" /> Convidar Usuário
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                        {u.id === user?.id && <Badge variant="outline" className="ml-1">Você</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(u.role)}
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                          disabled={u.id === user?.id}
                        >
                          <SelectTrigger className="h-8 w-[155px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleLabels).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        disabled={u.id === user?.id}
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={inviteName} onChange={e => setInviteName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Permissão (Cargo)</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={inviting}>{inviting ? "Enviando..." : "Enviar Convite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
