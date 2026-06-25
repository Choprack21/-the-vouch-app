import { createClient } from '@supabase/supabase-js'

// You must replace these with your actual Supabase URL and Anon Key from your Supabase dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
