import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const reqSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "financeiro", "designer", "video_editor", "traffic_manager", "viewer"]),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Recebida requisição para invite-user");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Sem Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error("Erro ao verificar usuário logado:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("Usuário autenticado:", user.id);

    const { data: roleData, error: profileError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (profileError || !roleData) {
      console.error("Usuário não é admin ou erro ao buscar perfil:", profileError, roleData);
      return new Response(JSON.stringify({ error: "Forbidden: Only admins can invite users" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log("Acesso admin verificado. Body sendo parseado.");

    const body = await req.json();
    const { email, name, role } = reqSchema.parse(body);
    console.log(`Convidando ${email} como ${role}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Invite the user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name: name }
    });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = inviteData.user.id;

    // Wait briefly for the auth trigger to create the profile
    await new Promise(r => setTimeout(r, 800));

    // Update profile name
    await supabaseAdmin.from("profiles").update({ name: name }).eq("id", newUserId);

    // Upsert role in user_roles table: delete any existing roles first, then insert
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: role });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      return new Response(JSON.stringify({ error: "User invited but failed to assign role" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Validation error", issues: err.errors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
