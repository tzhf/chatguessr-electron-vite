import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const lol: LatLng = { lat: 1, lng: 1 }

console.log('🚀 ~ file: useSupabase.ts:10 ~ lol:', lol)
