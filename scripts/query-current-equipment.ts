import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env file.')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

interface Equipment {
  id: string
  name: string
  category: string
  sub_category: string
  description: string
  price_per_day: number
  availability_status: string
  featured: boolean
  sort_order: number
}

async function queryEquipment() {
  console.log('Querying current equipment data...')
  
  const { data, error } = await supabaseAdmin
    .from('equipment')
    .select(`
      id,
      name,
      category,
      sub_category,
      description,
      price_per_day,
      availability_status,
      featured,
      sort_order
    `)
    .order('category')
    .order('sub_category')
    .order('sort_order')

  if (error) {
    console.error('Error querying equipment:', error.message)
    return
  }

  const equipmentData: Equipment[] = data || []
  console.log(`Found ${equipmentData.length} equipment items:`)
  console.log(JSON.stringify(equipmentData, null, 2))
}

queryEquipment()
