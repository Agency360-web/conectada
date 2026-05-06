import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const reqSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_payment"),
    client_id: z.string().uuid(),
    value: z.number().positive(),
    due_date: z.string(), // YYYY-MM-DD
    description: z.string(),
    billing_type: z.enum(["BOLETO", "PIX", "CREDIT_CARD", "UNDEFINED"]),
  }),
  z.object({
    action: z.literal("create_subscription"),
    client_id: z.string().uuid(),
    value: z.number().positive(),
    next_due_date: z.string(), // YYYY-MM-DD
    description: z.string(),
    billing_type: z.enum(["BOLETO", "PIX", "CREDIT_CARD", "UNDEFINED"]),
    billing_cycle: z.enum(["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"]),
  }),
  z.object({
    action: z.literal("cancel_subscription"),
    subscription_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("delete_payment"),
    transaction_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("receive_in_cash"),
    transaction_id: z.string().uuid(),
    payment_date: z.string(),
  }),
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    const body = await req.json();
    const parsedBody = reqSchema.parse(body);
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

    if (!asaasApiKey) {
      throw new Error("ASAAS_API_KEY is missing in environment.");
    }

    if (parsedBody.action === "create_payment") {
      const { client_id, value, due_date, description, billing_type } = parsedBody;

      const { data: client, error: clientError } = await supabaseClient
        .from("clients")
        .select("asaas_customer_id")
        .eq("id", client_id)
        .single();

      if (clientError || !client?.asaas_customer_id) {
        return new Response(JSON.stringify({ error: "Cliente não encontrado ou não sincronizado com Asaas" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Payload para Asaas
      const asaasPayload = {
        customer: client.asaas_customer_id,
        billingType: billing_type,
        value: value,
        dueDate: due_date,
        description: description,
      };

      const asaasRes = await fetch("https://api.asaas.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(asaasPayload),
      });

      const asaasData = await asaasRes.json();

      if (!asaasRes.ok) {
        console.error("Asaas error:", asaasData);
        return new Response(JSON.stringify({ error: "Erro ao emitir cobrança no Asaas", details: asaasData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Inserir registro local
      const { data: txData, error: txError } = await supabaseClient
        .from("transactions")
        .insert({
          client_id: client_id,
          type: "INCOME",
          status: "PENDING",
          amount: value,
          due_date: due_date,
          description: description,
          billing_type: billing_type,
          asaas_payment_id: asaasData.id,
          invoice_url: asaasData.invoiceUrl,
          bank_slip_url: asaasData.bankSlipUrl,
        })
        .select()
        .single();

      if (txError) throw txError;

      return new Response(JSON.stringify({ success: true, transaction: txData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } 
    
    else if (parsedBody.action === "create_subscription") {
      const { client_id, value, next_due_date, description, billing_type, billing_cycle } = parsedBody;

      const { data: client, error: clientError } = await supabaseClient
        .from("clients")
        .select("asaas_customer_id")
        .eq("id", client_id)
        .single();

      if (clientError || !client?.asaas_customer_id) {
        return new Response(JSON.stringify({ error: "Cliente não encontrado ou não sincronizado com Asaas" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cycleMap: Record<string, string> = {
        MONTHLY: "MONTHLY",
        QUARTERLY: "QUARTERLY",
        SEMIANNUALLY: "SEMIANNUALLY",
        YEARLY: "YEARLY"
      };

      const asaasPayload = {
        customer: client.asaas_customer_id,
        billingType: billing_type,
        value: value,
        nextDueDate: next_due_date,
        cycle: cycleMap[billing_cycle],
        description: description,
      };

      const asaasRes = await fetch("https://api.asaas.com/v3/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(asaasPayload),
      });

      const asaasData = await asaasRes.json();

      if (!asaasRes.ok) {
        console.error("Asaas error:", asaasData);
        return new Response(JSON.stringify({ error: "Erro ao criar assinatura no Asaas", details: asaasData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Inserir registro local
      const { data: subData, error: subError } = await supabaseClient
        .from("subscriptions")
        .insert({
          client_id: client_id,
          value: value,
          billing_cycle: billing_cycle,
          billing_type: billing_type,
          next_due_date: next_due_date,
          description: description,
          asaas_subscription_id: asaasData.id,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (subError) throw subError;

      return new Response(JSON.stringify({ success: true, subscription: subData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    else if (parsedBody.action === "cancel_subscription") {
      const { subscription_id } = parsedBody;

      const { data: sub, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("asaas_subscription_id")
        .eq("id", subscription_id)
        .single();

      if (subError || !sub?.asaas_subscription_id) {
        return new Response(JSON.stringify({ error: "Assinatura não encontrada ou sem ID do Asaas" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const asaasRes = await fetch(`https://api.asaas.com/v3/subscriptions/${sub.asaas_subscription_id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
      });

      const asaasData = await asaasRes.json();

      if (!asaasRes.ok) {
        console.error("Asaas error:", asaasData);
        return new Response(JSON.stringify({ error: "Erro ao cancelar assinatura no Asaas", details: asaasData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({ status: "CANCELLED" })
        .eq("id", subscription_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    else if (parsedBody.action === "delete_payment") {
      const { transaction_id } = parsedBody;

      const { data: tx, error: txError } = await supabaseClient
        .from("transactions")
        .select("asaas_payment_id")
        .eq("id", transaction_id)
        .single();

      if (txError) {
        return new Response(JSON.stringify({ error: "Transação não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tx.asaas_payment_id) {
        const asaasRes = await fetch(`https://api.asaas.com/v3/payments/${tx.asaas_payment_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "access_token": asaasApiKey,
          },
        });

        if (!asaasRes.ok) {
           const asaasData = await asaasRes.json();
           console.error("Asaas delete error:", asaasData);
           return new Response(JSON.stringify({ error: "Não foi possível cancelar no Asaas", details: asaasData }), {
             status: 400,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
           });
        }
      }

      const { error: deleteError } = await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", transaction_id);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    else if (parsedBody.action === "receive_in_cash") {
      const { transaction_id, payment_date } = parsedBody;

      const { data: tx, error: txError } = await supabaseClient
        .from("transactions")
        .select("amount, asaas_payment_id")
        .eq("id", transaction_id)
        .single();

      if (txError) {
        return new Response(JSON.stringify({ error: "Transação não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tx.asaas_payment_id) {
        const asaasRes = await fetch(`https://api.asaas.com/v3/payments/${tx.asaas_payment_id}/receiveInCash`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": asaasApiKey,
          },
          body: JSON.stringify({
            paymentDate: payment_date,
            value: tx.amount,
            notifyCustomer: false
          })
        });

        if (!asaasRes.ok) {
           const asaasData = await asaasRes.json();
           console.error("Asaas receiveInCash error:", asaasData);
           return new Response(JSON.stringify({ error: "Não foi possível confirmar o pagamento no Asaas", details: asaasData }), {
             status: 400,
             headers: { ...corsHeaders, "Content-Type": "application/json" },
           });
        }
      }

      const { error: updateError } = await supabaseClient
        .from("transactions")
        .update({ status: "PAID", payment_date: payment_date })
        .eq("id", transaction_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err: any) {
    console.error("Unhandled error:", err);
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Validation error", issues: err.errors }), {
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
