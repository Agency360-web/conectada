import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uazapiService, UazapiStatusResponse } from "@/services/uazapi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Smartphone, CheckCircle2, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppConnect() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [instanceData, setInstanceData] = useState<{ server_url: string; instance_token: string; instance_name: string } | null>(null);
  const [status, setStatus] = useState<UazapiStatusResponse | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token inválido.");
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const { data, error: sbError } = await supabase
          .from("client_whatsapp_instances")
          .select("server_url, instance_token, instance_name")
          .eq("connection_token", token)
          .maybeSingle();

        if (sbError) throw sbError;
        if (!data) {
          setError("Link de conexão inválido ou expirado.");
          return;
        }

        setInstanceData(data);
        await checkStatus(data.server_url, data.instance_token);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar dados da instância.");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    
    return () => stopPolling();
  }, [token]);

  const checkStatus = async (serverUrl: string, instanceToken: string) => {
    try {
      const data = await uazapiService.getStatus(serverUrl, instanceToken);
      setStatus(data);
      
      if (data.instance.status === "connecting" && data.instance.qrcode) {
        setQrCode(data.instance.qrcode);
      } else if (data.instance.status === "connected") {
        setQrCode(null);
        stopPolling();
      }
      
      return data;
    } catch (err: any) {
      console.error("Erro ao verificar status:", err);
      // Don't show toast for every polling error
    }
  };

  const startPolling = (serverUrl: string, instanceToken: string) => {
    stopPolling();
    pollingRef.current = window.setInterval(() => {
      checkStatus(serverUrl, instanceToken);
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleConnect = async () => {
    if (!instanceData) return;
    setLoading(true);
    try {
      const data = await uazapiService.connect(instanceData.server_url, instanceData.instance_token);
      setStatus(data);
      if (data.instance.qrcode) {
        setQrCode(data.instance.qrcode);
      }
      startPolling(instanceData.server_url, instanceData.instance_token);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!instanceData) return;
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp desta instância?")) return;
    
    setLoading(true);
    stopPolling();
    try {
      await uazapiService.disconnect(instanceData.server_url, instanceData.instance_token);
      await checkStatus(instanceData.server_url, instanceData.instance_token);
      toast.success("Desconectado com sucesso.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  // Se o status da instância já veio como 'connecting' e estávamos fazendo load inicial, inicia polling
  useEffect(() => {
    if (status?.instance.status === 'connecting' && instanceData && !pollingRef.current) {
      startPolling(instanceData.server_url, instanceData.instance_token);
    }
  }, [status, instanceData]);

  if (loading && !instanceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg border-destructive/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-destructive text-xl">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isConnected = status?.instance.status === "connected";
  const isConnecting = status?.instance.status === "connecting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/30 to-muted/10 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl overflow-hidden border-border/50">
        <div className={`h-2 w-full ${isConnected ? "bg-success" : isConnecting ? "bg-warning" : "bg-primary"}`} />
        
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Smartphone className={`h-8 w-8 ${isConnected ? "text-success" : "text-primary"}`} />
          </div>
          <CardTitle className="font-display text-2xl">Conectar WhatsApp</CardTitle>
          <CardDescription>
            {instanceData?.instance_name}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {isConnected ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8 animate-in fade-in zoom-in duration-500">
              <div className="bg-success/10 p-4 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-success" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Conectado com sucesso!</h3>
                <p className="text-sm text-muted-foreground">
                  Seu WhatsApp está vinculado e pronto para uso.
                </p>
              </div>
              {status?.instance.profileName && (
                <div className="bg-muted px-4 py-2 rounded-lg text-sm font-medium mt-2">
                  Perfil: {status.instance.profileName}
                </div>
              )}
              
              <Button variant="outline" className="mt-8 text-destructive hover:bg-destructive/10" onClick={handleDisconnect} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                Desconectar
              </Button>
            </div>
          ) : isConnecting ? (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <h3 className="text-md font-medium">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para a tela.
                </p>
              </div>
              
              <div className="relative bg-white p-4 rounded-xl border shadow-sm">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                    <span className="text-xs">Gerando código...</span>
                  </div>
                )}
                <div className="absolute inset-0 border-4 border-primary/20 rounded-xl pointer-events-none" />
              </div>
              
              <div className="flex items-center text-xs text-muted-foreground animate-pulse">
                <RefreshCw className="h-3 w-3 mr-2" />
                Aguardando conexão...
              </div>

              <Button variant="ghost" onClick={handleConnect} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Gerar Novo QR Code
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <div className="text-center space-y-2">
                <h3 className="text-md font-medium">Pronto para conectar</h3>
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para gerar o QR Code de conexão.
                </p>
              </div>
              
              <Button size="lg" className="w-full sm:w-auto px-8 font-semibold" onClick={handleConnect} disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Conectando...</>
                ) : (
                  <><QrCode className="mr-2 h-5 w-5" /> Gerar QR Code</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
