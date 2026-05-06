import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  client?: any;
}

const formatCPFCNPJ = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v.slice(0, 18);
};

const formatCEP = (v: string) => {
  v = v.replace(/\D/g, "");
  v = v.replace(/^(\d{5})(\d)/, "$1-$2");
  return v.slice(0, 9);
};

const formatPhone = (v: string) => {
  v = v.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v.slice(0, 15);
};

const schema = z.object({
  name: z.string().trim().min(2, "Nome/Razão Social obrigatório").max(120),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  
  razao_social: z.string().optional().or(z.literal("")),
  nome_fantasia: z.string().optional().or(z.literal("")),
  responsavel_nome: z.string().optional().or(z.literal("")),
  
  cep: z.string().optional().or(z.literal("")),
  endereco_rua: z.string().optional().or(z.literal("")),
  endereco_numero: z.string().optional().or(z.literal("")),
  endereco_complemento: z.string().optional().or(z.literal("")),
  endereco_bairro: z.string().optional().or(z.literal("")),
  endereco_cidade: z.string().optional().or(z.literal("")),
  endereco_estado: z.string().optional().or(z.literal("")),
  
  servicos_contratados: z.string().optional().or(z.literal("")),
  prazo_contrato: z.string().optional().or(z.literal("")),
  valor_total: z.string().optional().or(z.literal("")),
  forma_pagamento: z.string().optional().or(z.literal("")),
  dia_vencimento: z.string().optional().or(z.literal("")),
});

export function ClientFormDialog({ open, onOpenChange, onSaved, client }: Props) {
  const [form, setForm] = useState({ 
    name: "", document: "", email: "", phone: "", notes: "",
    razao_social: "", nome_fantasia: "", responsavel_nome: "",
    cep: "", endereco_rua: "", endereco_numero: "", endereco_complemento: "", endereco_bairro: "", endereco_cidade: "", endereco_estado: "",
    servicos_contratados: "", prazo_contrato: "", valor_total: "", forma_pagamento: "", dia_vencimento: ""
  });
  
  const [saving, setSaving] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: client?.name || "",
        document: client?.document || "",
        email: client?.email || "",
        phone: client?.phone || "",
        notes: client?.notes || "",
        razao_social: client?.razao_social || "",
        nome_fantasia: client?.nome_fantasia || "",
        responsavel_nome: client?.responsavel_nome || "",
        cep: client?.cep || "",
        endereco_rua: client?.endereco_rua || "",
        endereco_numero: client?.endereco_numero || "",
        endereco_complemento: client?.endereco_complemento || "",
        endereco_bairro: client?.endereco_bairro || "",
        endereco_cidade: client?.endereco_cidade || "",
        endereco_estado: client?.endereco_estado || "",
        servicos_contratados: client?.servicos_contratados || "",
        prazo_contrato: client?.prazo_contrato || "",
        valor_total: client?.valor_total ? String(client.valor_total) : "",
        forma_pagamento: client?.forma_pagamento || "",
        dia_vencimento: client?.dia_vencimento ? String(client.dia_vencimento) : "",
      });
    }
  }, [open, client]);

  const handleCnpjSearch = async () => {
    const cnpj = form.document.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast.error("Para buscar, digite um CNPJ válido com 14 dígitos.");
      return;
    }
    
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      
      setForm(prev => ({
        ...prev,
        name: data.razao_social || prev.name,
        razao_social: data.razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        phone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : prev.phone,
        cep: data.cep ? formatCEP(data.cep) : prev.cep,
        endereco_rua: data.logradouro || "",
        endereco_numero: data.numero || "",
        endereco_complemento: data.complemento || "",
        endereco_bairro: data.bairro || "",
        endereco_cidade: data.municipio || "",
        endereco_estado: data.uf || ""
      }));
      toast.success("Dados da empresa importados com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar CNPJ");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleCepSearch = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");
      
      setForm(prev => ({
        ...prev,
        endereco_rua: data.logradouro || "",
        endereco_bairro: data.bairro || "",
        endereco_cidade: data.localidade || "",
        endereco_estado: data.uf || ""
      }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);

    let valTotal = null;
    if (parsed.data.valor_total) {
      const v = parseFloat(parsed.data.valor_total.replace(/\./g, "").replace(",", "."));
      if (!isNaN(v)) valTotal = v;
    }

    let diaVenc = null;
    if (parsed.data.dia_vencimento) {
      const d = parseInt(parsed.data.dia_vencimento, 10);
      if (!isNaN(d) && d >= 1 && d <= 31) diaVenc = d;
      else if (!isNaN(d)) return toast.error("Dia de vencimento deve ser entre 1 e 31");
    }

    setSaving(true);
    const payload = {
      name: parsed.data.name,
      document: parsed.data.document || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      
      razao_social: parsed.data.razao_social || null,
      nome_fantasia: parsed.data.nome_fantasia || null,
      responsavel_nome: parsed.data.responsavel_nome || null,
      
      cep: parsed.data.cep || null,
      endereco_rua: parsed.data.endereco_rua || null,
      endereco_numero: parsed.data.endereco_numero || null,
      endereco_complemento: parsed.data.endereco_complemento || null,
      endereco_bairro: parsed.data.endereco_bairro || null,
      endereco_cidade: parsed.data.endereco_cidade || null,
      endereco_estado: parsed.data.endereco_estado || null,
      
      servicos_contratados: parsed.data.servicos_contratados || null,
      prazo_contrato: parsed.data.prazo_contrato || null,
      valor_total: valTotal,
      forma_pagamento: parsed.data.forma_pagamento || null,
      dia_vencimento: diaVenc,
    };

    const { error } = client?.id
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload);
    
    setSaving(false);
    if (error) return toast.error(error.message);
    
    toast.success(client?.id ? "Cliente atualizado" : "Cliente criado");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="negociacao">Negociação</TabsTrigger>
            </TabsList>

            <TabsContent value="empresa" className="space-y-4 min-h-[380px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF / CNPJ</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={form.document} 
                      onChange={(e) => setForm({ ...form, document: formatCPFCNPJ(e.target.value) })} 
                      placeholder="00.000.000/0000-00"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleCnpjSearch} disabled={loadingCnpj} title="Buscar CNPJ">
                      {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome de Exibição (Obrigatório) *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Como o cliente será chamado no sistema" />
                </div>
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Responsável</Label>
                  <Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 min-h-[380px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={form.cep} 
                      onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })} 
                      placeholder="00000-000"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleCepSearch} disabled={loadingCep} title="Buscar CEP">
                      {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rua / Logradouro</Label>
                  <Input value={form.endereco_rua} onChange={(e) => setForm({ ...form, endereco_rua: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={form.endereco_numero} onChange={(e) => setForm({ ...form, endereco_numero: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={form.endereco_complemento} onChange={(e) => setForm({ ...form, endereco_complemento: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.endereco_bairro} onChange={(e) => setForm({ ...form, endereco_bairro: e.target.value })} />
                </div>
                <div className="grid grid-cols-[2fr_1fr] gap-2">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.endereco_cidade} onChange={(e) => setForm({ ...form, endereco_cidade: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={form.endereco_estado} onChange={(e) => setForm({ ...form, endereco_estado: e.target.value?.toUpperCase() })} maxLength={2} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="negociacao" className="space-y-4 min-h-[380px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serviços Contratados</Label>
                  <Textarea 
                    rows={2} 
                    value={form.servicos_contratados} 
                    onChange={(e) => setForm({ ...form, servicos_contratados: e.target.value })} 
                    placeholder="Ex: Gestão de Tráfego, Social Media..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações Gerais</Label>
                  <Textarea 
                    rows={2} 
                    value={form.notes} 
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo do Contrato</Label>
                  <Input value={form.prazo_contrato} onChange={(e) => setForm({ ...form, prazo_contrato: e.target.value })} placeholder="Ex: 12 meses, Indeterminado" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.valor_total} 
                    onChange={(e) => setForm({ ...form, valor_total: e.target.value })} 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.forma_pagamento || "none"} onValueChange={(v) => setForm({ ...form, forma_pagamento: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro/Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Melhor dia para Vencimento</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="31" 
                    value={form.dia_vencimento} 
                    onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} 
                    placeholder="Ex: 5"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
