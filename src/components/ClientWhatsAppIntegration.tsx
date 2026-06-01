import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Save, Trash2, Smartphone } from "lucide-react";

export function ClientWhatsAppIntegration({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [formData, setFormData] = useState({
    instance_name: "",
    instance_token: "",
    server_url: "https://free.uazapi.com"
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_whatsapp_instances")
      .select("*")
      .eq("client_id", clientId);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setInstances(data);
    // If editing an existing instance, preload its data
    if (selectedInstance) {
      const inst = data.find((i) => i.id === selectedInstance.id);
      if (inst) {
        setFormData({
          instance_name: inst.instance_name,
          instance_token: inst.instance_token,
          server_url: inst.server_url
        });
        setSelectedInstance(inst);
      }
    } else {
      // default to first instance for editing convenience
      setSelectedInstance(null);
      setFormData({
        instance_name: "",
        instance_token: "",
        server_url: "https://free.uazapi.com"
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const handleSave = async () => {
    if (!formData.instance_name || !formData.instance_token || !formData.server_url) {
      return toast.error("Preencha todos os campos.");
    }
    if (instances.length >= 3 && !selectedInstance) {
      return toast.error("Cada cliente pode ter no máximo 3 instâncias de WhatsApp.");
    }
    setSaving(true);
    try {
      if (selectedInstance?.id) {
        const { error } = await supabase
          .from("client_whatsapp_instances")
          .update(formData)
          .eq("id", selectedInstance.id);
        if (error) throw error;
        toast.success("Instância atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("client_whatsapp_instances")
          .insert({
            client_id: clientId,
            ...formData
          });
        if (error) throw error;
        toast.success("Instância criada com sucesso!");
      }
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar a instância.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstance?.id) return;
    if (!confirm("Tem certeza que deseja remover esta instância? O link de conexão deixará de funcionar.")) return;
    
    try {
      const { error } = await supabase
        .from("client_whatsapp_instances")
        .delete()
        .eq("id", selectedInstance.id);
      if (error) throw error;
      toast.success("Instância removida.");
      setSelectedInstance(null);
      setFormData({
        instance_name: "",
        instance_token: "",
        server_url: "https://free.uazapi.com"
      });
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover a instância.");
    }
  };

  const publicLink = selectedInstance 
    ? `${window.location.origin}/connect/${selectedInstance.connection_token}` 
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success("Link copiado para a área de transferência!");
  };

  if (loading) return null;

  return (
    <>
      {/* List existing instances */}
      <div className="grid gap-6">
        {instances.map((inst) => (
          <Card key={inst.id} className={selectedInstance?.id === inst.id ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  {inst.instance_name || "Instância"}
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedInstance(inst);
                  setFormData({
                    instance_name: inst.instance_name,
                    instance_token: inst.instance_token,
                    server_url: inst.server_url
                  });
                }}>
                  Editar
                </Button>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
        {instances.length < 3 && (
          <Button variant="secondary" onClick={() => {
            setSelectedInstance(null);
            setFormData({
              instance_name: "",
              instance_token: "",
              server_url: "https://free.uazapi.com"
            });
          }}>
            + Nova Instância
          </Button>
        )}
      </div>

      {/* Form for selected / new instance */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            {selectedInstance ? "Editar Instância" : "Nova Instância"}
          </CardTitle>
          <CardDescription>
            Configure os dados desta instância para gerar o QR Code via link seguro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input
                placeholder="Ex: cliente-123"
                value={formData.instance_name}
                onChange={e => setFormData({ ...formData, instance_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Servidor</Label>
              <Input
                placeholder="https://free.uazapi.com"
                value={formData.server_url}
                onChange={e => setFormData({ ...formData, server_url: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Token da Instância (apikey)</Label>
              <Input
                placeholder="Digite o token da instância..."
                value={formData.instance_token}
                onChange={e => setFormData({ ...formData, instance_token: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {selectedInstance && (
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {selectedInstance && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <Label className="text-sm font-semibold mb-2 block">Link Público de Conexão</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Envie este link para o cliente. Ele não precisará fazer login no sistema para escanear o QR Code.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={publicLink} className="bg-background font-mono text-xs" />
                <Button variant="secondary" onClick={copyToClipboard} title="Copiar Link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => window.open(publicLink, '_blank')}>
                  Abrir
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
