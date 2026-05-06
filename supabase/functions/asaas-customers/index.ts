import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const reqSchema = z.object({
  action: z.enum(["create", "update"]),
  client_id: z.string().uuid(),
});

serve(async (req) => {
  // Tratar requisições OPTIONS (CORS preflight) obrigatoriamente
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Inicializar Supabase Client usando o JWT do usuário logado
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // Parse e Validação do Payload usando Zod
    const body = await req.json();
    const parsedBody = reqSchema.parse(body);
    const { action, client_id } = parsedBody;

    // Buscar dados do cliente no BD local
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado ou sem permissão" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY is missing in Edge Function environment.");
    }

    if (action === "create") {
      // Regra: Se asaas_customer_id não for nulo, abortar (400)
      if (client.asaas_customer_id) {
        return new Response(JSON.stringify({ error: "Cliente já está sincronizado com o Asaas." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Payload para a API do Asaas
      const payload = {
        name: client.name,
        email: client.email,
        cpfCnpj: client.document,
        phone: client.phone,
      };

      // Chamada para o Asaas (POST /v3/customers)
      const asaasRes = await fetch("https://api.asaas.com/v3/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(payload),
      });

      const asaasData = await asaasRes.json();

      if (!asaasRes.ok) {
        console.error("Erro Asaas:", asaasData);
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: asaasData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atualizar o registro do cliente no banco local com o id retornado do Asaas
      const { error: updateError } = await supabaseClient
        .from("clients")
        .update({ asaas_customer_id: asaasData.id })
        .eq("id", client_id);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ success: true, asaas_customer_id: asaasData.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "update") {
      if (!client.asaas_customer_id) {
         return new Response(JSON.stringify({ error: "Cliente ainda não sincronizado com o Asaas." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const payload = {
        name: client.name,
        email: client.email,
        cpfCnpj: client.document,
        phone: client.phone,
      };

      const asaasRes = await fetch(`https://api.asaas.com/v3/customers/${client.asaas_customer_id}`, {
        method: "POST", // O Asaas utiliza POST na mesma rota do customer com o ID para atualizar
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(payload),
      });

      const asaasData = await asaasRes.json();
      if (!asaasRes.ok) {
        console.error("Erro Asaas:", asaasData);
        return new Response(JSON.stringify({ error: "Erro ao atualizar cliente no Asaas", details: asaasData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
       return new Response(JSON.stringify({ success: true, asaas_customer_id: asaasData.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Unhandled error:", err);
    // Tratamento de erros do Zod
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Erro de validação do payload", issues: err.errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
