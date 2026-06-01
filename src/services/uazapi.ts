export interface UazapiInstance {
  id: string;
  token: string;
  status: 'disconnected' | 'connecting' | 'connected';
  paircode?: string;
  qrcode?: string;
  name?: string;
  profileName?: string;
  profilePicUrl?: string;
}

export interface UazapiStatusResponse {
  connected: boolean;
  loggedIn: boolean;
  jid: string | null;
  instance: UazapiInstance;
}

export const uazapiService = {
  /**
   * Inicia o processo de conexão e gera o QR Code (ou código de pareamento se passar o phone)
   */
  async connect(serverUrl: string, token: string, phone?: string): Promise<UazapiStatusResponse> {
    const url = new URL('/instance/connect', serverUrl).toString();
    const body = phone ? JSON.stringify({ phone }) : undefined;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json'
      },
      body
    });
    
    if (!response.ok) {
      throw new Error(`Erro na UAZAPI: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Verifica o status da instância
   */
  async getStatus(serverUrl: string, token: string): Promise<UazapiStatusResponse> {
    const url = new URL('/instance/status', serverUrl).toString();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na UAZAPI: ${response.statusText}`);
    }
    
    return response.json();
  },

  /**
   * Desconecta a instância
   */
  async disconnect(serverUrl: string, token: string): Promise<any> {
    const url = new URL('/instance/disconnect', serverUrl).toString();
    
    const response = await fetch(url, {
      method: 'DELETE', // A especificação diz DELETE /instance/disconnect normalmente, verificar spec real se der erro.
      headers: {
        'token': token
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro na UAZAPI: ${response.statusText}`);
    }
    
    return response.json();
  }
};
