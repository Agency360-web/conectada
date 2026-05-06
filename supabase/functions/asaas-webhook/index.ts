import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Tratar requisições OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Segurança Crítica: Validar Token do Webhook
    const asaasWebhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (!asaasWebhookToken || receivedToken !== asaasWebhookToken) {
      console.warn("Unauthorized webhook attempt.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Webhook received:", payload.event);

    const event = payload.event;
    const paymentId = payload.payment?.id;

    if (!event || !paymentId) {
      return new Response("Missing event or payment id", { status: 200, headers: corsHeaders });
    }

    // 2. Mapeamento de Status
    let newStatus: string | null = null;
    let paymentDate: string | null = null;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatus = "PAID";
        // Asaas costuma enviar paymentDate ou creditDate
        paymentDate = payload.payment.paymentDate || payload.payment.creditDate || new Date().toISOString().split('T')[0];
        break;
      case "PAYMENT_OVERDUE":
        newStatus = "OVERDUE";
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        newStatus = "CANCELLED";
        break;
    }

    // Se não houver mudança de status que mapeamos, apenas retorne 200 OK
    if (!newStatus) {
      return new Response("Event ignored", { status: 200, headers: corsHeaders });
    }

    // 3. Inicializar Supabase Client usando a Service Role Key (Bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 4. Atualizar o banco de dados
    const updateData: any = { status: newStatus };
    if (newStatus === "PAID" && paymentDate) {
      updateData.payment_date = paymentDate;
    }

    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("asaas_payment_id", paymentId);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      // Retornar 200 mesmo com erro interno para não travar o Asaas, 
      // mas seria melhor logar em algum sistema de observabilidade.
    } else {
      console.log(`Transaction ${paymentId} updated to ${newStatus}`);
    }

    // 5. Retornar 200 OK
    return new Response("OK", { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("Webhook processing error:", err);
    // Sempre retornar 200 OK para requisições do Asaas para não gerar retries infinitos
    return new Response("OK (with errors)", { status: 200, headers: corsHeaders });
  }
});
