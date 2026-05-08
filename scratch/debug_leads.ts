import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function checkColumns() {
  const { data, error } = await supabase.from('leads').select('*').limit(5)
  if (error) {
    console.error("ERRO:", error)
  } else {
    console.log("COLUNAS:", Object.keys(data[0] || {}))
    console.log("DADOS (1):", data[0])
  }
}

checkColumns()
