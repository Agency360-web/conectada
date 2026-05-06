import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const reqSchema = z.object({
  report_type: z.enum(["cashflow", "profitability", "dre", "accounts"]),
  date_from: z.string(),
  date_to: z.string(),
  format: z.enum(["pdf", "csv"]),
  client_id: z.string().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "financeiro")) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { report_type, date_from, date_to, format, client_id } = reqSchema.parse(body);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let query = supabaseAdmin
      .from("transactions")
      .select("*, clients(name), categories(name)")
      .gte("due_date", date_from)
      .lte("due_date", date_to)
      .order("due_date", { ascending: true });

    if (client_id && client_id !== "none" && client_id !== "all") {
      query = query.eq("client_id", client_id);
    }

    const { data: transactions, error: txError } = await query;
    if (txError) throw txError;

    if (format === "csv") {
      let csv = "Data,Tipo,Status,Valor,Cliente,Categoria,Descricao\n";
      transactions?.forEach(t => {
        const date = t.due_date;
        const type = t.type === "INCOME" ? "Receita" : "Despesa";
        const status = t.status;
        const val = t.amount;
        const cli = t.clients?.name || "N/A";
        const cat = t.categories?.name || "N/A";
        const desc = (t.description || "").replace(/,/g, " ");
        csv += `${date},${type},${status},${val},${cli},${cat},${desc}\n`;
      });

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="relatorio-${report_type}.csv"`
        }
      });
    } else {
      // PDF Generator
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      let y = height - 50;
      page.drawText(`Relatorio: ${report_type.toUpperCase()}`, { x: 50, y, size: 16, font });
      y -= 20;
      page.drawText(`Periodo: ${date_from} ate ${date_to}`, { x: 50, y, size: 12, font });
      y -= 30;

      page.drawText("Data", { x: 50, y, size: 10, font });
      page.drawText("Tipo", { x: 120, y, size: 10, font });
      page.drawText("Valor (R$)", { x: 180, y, size: 10, font });
      page.drawText("Status", { x: 260, y, size: 10, font });
      page.drawText("Cliente", { x: 330, y, size: 10, font });
      y -= 15;

      transactions?.forEach((t) => {
        if (y < 50) {
          page = pdfDoc.addPage();
          y = height - 50;
        }
        const type = t.type === "INCOME" ? "+" : "-";
        const cli = t.clients?.name ? t.clients.name.substring(0, 20) : "N/A";
        
        page.drawText(`${t.due_date}`, { x: 50, y, size: 9, font });
        page.drawText(`${type}`, { x: 120, y, size: 9, font });
        page.drawText(`${t.amount.toFixed(2)}`, { x: 180, y, size: 9, font });
        page.drawText(`${t.status}`, { x: 260, y, size: 9, font });
        page.drawText(`${cli}`, { x: 330, y, size: 9, font });
        
        y -= 15;
      });

      const pdfBytes = await pdfDoc.save();

      return new Response(pdfBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio-${report_type}.pdf"`
        }
      });
    }

  } catch (err: any) {
    console.error(err);
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
