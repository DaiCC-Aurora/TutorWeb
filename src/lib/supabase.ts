import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local'
      );
    }

    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}
