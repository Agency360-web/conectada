import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function listTables() {
  const { data, error } = await supabase.from('leads').select('*')
  console.log("LEADS COUNT:", data?.length)
  console.log("SAMPLES:", data)
}

listTables()
