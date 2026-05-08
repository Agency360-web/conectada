import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function checkOrphans() {
  const { data: cols } = await supabase.from('commercial_columns').select('id, name')
  const { data: leads } = await supabase.from('leads').select('id, company_name, column_id, status')
  
  console.log("COLUNAS EXISTENTES:", cols?.map(c => ({ id: c.id, name: c.name })))
  console.log("LEADS ENCONTRADOS:", leads?.length)
  
  leads?.forEach(l => {
    const colExists = cols?.some(c => c.id === l.column_id)
    console.log(`Lead: ${l.company_name} | Coluna ID: ${l.column_id} | Coluna Existe? ${colExists} | Status: ${l.status}`)
  })
}

checkOrphans()
