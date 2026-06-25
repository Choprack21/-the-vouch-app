import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ctxyjhjxrtvzntlgrkxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eHlqaGp4cnR2em50bGdya3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjYyMzEsImV4cCI6MjA5NzkwMjIzMX0.4DdbJm-xz4rnQXcqtYhtDRuSeCg3d2ouEBHQ6-42-00';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
