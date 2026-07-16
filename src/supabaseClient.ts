import { createClient } from '@supabase/supabase-js'

// Ces valeurs fonctionneront localement ou liront votre fichier .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://votre-projet.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'votre-cle-anonyme'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)