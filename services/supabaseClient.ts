import { createClient } from '@supabase/supabase-js';

// Environment variables for Supabase configuration
// These should be set in .env.local:
// VITE_SUPABASE_URL=your-supabase-url
// VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Library features will be disabled. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
