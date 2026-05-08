import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Papa from "https://esm.sh/papaparse@5.4.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) throw new Error("Chave OpenAI não configurada.");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("Arquivo não encontrado.");

    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    
    let structuredData: any[] = [];

    if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
      console.log("LOG: Processando arquivo Excel (.xls/.xlsx)");
      // Lendo o binário do Excel
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      // Convertendo a primeira aba para JSON
      structuredData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    } else if (fileName.endsWith(".csv")) {
      console.log("LOG: Processando arquivo CSV");
      let textContent = "";
      try {
        textContent = new TextDecoder("utf-8").decode(arrayBuffer);
      } catch {
        textContent = new TextDecoder("windows-1252").decode(arrayBuffer);
      }
      const parsed = Papa.parse(textContent, { header: true, skipEmptyLines: true });
      structuredData = parsed.data;
    } else {
      throw new Error("Formato de arquivo não suportado. Use .xls, .xlsx ou .csv");
    }

    if (structuredData.length === 0) {
      throw new Error("O arquivo parece estar vazio.");
    }

    console.log(`LOG: Enviando ${structuredData.length} linhas para o GPT-4o`);

    const prompt = `
      Você é um robô de contabilidade. Analise as linhas deste extrato (em JSON) e extraia todas as transações.
      
      DADOS:
      ${JSON.stringify(structuredData.slice(0, 100))} // Analisando as primeiras 100 linhas

      TAREFAS:
      1. Identifique as colunas de DATA, DESCRIÇÃO e VALOR.
      2. IGNORE a coluna de SALDO. Pegue apenas o valor da movimentação.
      3. Extraia TODAS as linhas de gastos e ganhos (incluindo tarifas).
      4. TIPO: "EXPENSE" para saídas, "INCOME" para entradas.

      Retorne APENAS um JSON: {"transactions": [{"date": "YYYY-MM-DD", "description": "Texto", "amount": 0.00, "type": "INCOME" | "EXPENSE"}]}
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0
      }),
    });

    const result = await response.json();
    const aiData = JSON.parse(result.choices[0].message.content);

    // Sanitização de valores
    if (aiData.transactions) {
      aiData.transactions = aiData.transactions.map((t: any) => {
        let val = t.amount;
        if (typeof val === 'string') {
          val = parseFloat(val.replace(/\./g, '').replace(',', '.'));
        }
        return {
          ...t,
          amount: isNaN(val) ? 0 : Math.abs(val)
        };
      });
    }

    return new Response(JSON.stringify(aiData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("ERRO:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
