import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, UserPlus, Save, Trash2, Loader2, Calendar, Send, Clock, User, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  columnId?: string;
  onSaved: () => void;
}

export function LeadModal({ open, onOpenChange, leadId, columnId, onSaved }: LeadModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState("");
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    source: "",
    estimated_value: 0,
    status: "NEW",
    column_id: "",
    notes: "",
    next_contact_date: ""
  });

  const loadColumns = async () => {
    const { data } = await supabase.from("commercial_columns").select("*").order("position");
    setColumns(data || []);
  };

  const loadLead = async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (data) setFormData(data);
    setLoading(false);
  };

  const loadActivities = async () => {
    if (!leadId) return;
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setActivities(data || []);
  };

  useEffect(() => {
    if (open) {
      loadColumns();
      if (leadId) {
        loadLead();
        loadActivities();
      } else {
        setFormData({ 
          company_name: "", contact_name: "", email: "", phone: "", 
          source: "", estimated_value: 0, status: "NEW", 
          column_id: columnId || "", notes: "", next_contact_date: "" 
        });
        setActivities([]);
      }
    }
  }, [open, leadId, columnId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = { ...formData, column_id: formData.column_id || null };
      if (leadId) {
        const { error } = await supabase.from("leads").update(dataToSave).eq("id", leadId);
        if (error) throw error;
        toast.success("Atualizado!");
      } else {
        const { error } = await supabase.from("leads").insert([dataToSave]);
        if (error) throw error;
        toast.success("Criado!");
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim() || !leadId) return;
    try {
      const { error } = await supabase.from("lead_activities").insert([
        { lead_id: leadId, content: newActivity.trim(), user_id: user?.id }
      ]);
      if (error) throw error;
      setNewActivity("");
      loadActivities();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openWhatsApp = () => {
    if (!formData.phone) return toast.error("Sem telefone");
    window.open(`https://wa.me/55${formData.phone.replace(/\D/g, "")}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{leadId ? "Detalhes da Negociação" : "Novo Lead"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contato</Label>
                  <Input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <div className="flex gap-2">
                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    <Button variant="outline" size="icon" onClick={openWhatsApp}><MessageSquare className="h-4 w-4 text-green-600" /></Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Estimado</Label>
                  <Input type="number" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Próximo Passo</Label>
                  <Input type="date" value={formData.next_contact_date || ""} onChange={e => setFormData({ ...formData, next_contact_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estágio</Label>
                  <Select value={formData.column_id || "none"} onValueChange={v => setFormData({ ...formData, column_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {columns.map(col => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Novo</SelectItem>
                      <SelectItem value="CONTACTED">Contato</SelectItem>
                      <SelectItem value="MEETING">Reunião</SelectItem>
                      <SelectItem value="PROPOSAL">Proposta</SelectItem>
                      <SelectItem value="NEGOTIATION">Negociação</SelectItem>
                      <SelectItem value="WON">GANHO</SelectItem>
                      <SelectItem value="LOST">PERDIDO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="h-24" />
              </div>
            </div>

            <div className="bg-muted/20 p-4 rounded-xl flex flex-col h-full min-h-[400px] border">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Histórico
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <History className="h-8 w-8 mb-2" />
                    <p className="text-xs">Nenhum registro.</p>
                  </div>
                ) : (
                  activities.map(act => (
                    <div key={act.id} className="bg-background p-3 rounded-lg border text-xs shadow-sm">
                      <p className="mb-2">{act.content}</p>
                      <div className="flex justify-between opacity-60 text-[10px]">
                        <span>{new Date(act.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {leadId && (
                <div className="flex gap-2">
                  <Input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Nova anotação..." className="text-xs" onKeyDown={e => e.key === 'Enter' && handleAddActivity()} />
                  <Button size="icon" onClick={handleAddActivity} disabled={!newActivity.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between w-full border-t pt-4">
          <div className="flex gap-2">
            {leadId && (
              <Button type="button" variant="outline" className="text-destructive border-destructive" onClick={async () => {
                if (confirm("Excluir?")) {
                  const { error } = await supabase.from("leads").delete().eq("id", leadId);
                  if (!error) { toast.success("Excluído"); onSaved(); onOpenChange(false); }
                }
              }} disabled={saving}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
