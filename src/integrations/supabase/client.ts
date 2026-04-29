// Supabase browser client.
//
// We opt into the PKCE auth flow (instead of the legacy implicit flow):
//   - Tokens never live in the URL hash
//   - Refresh tokens are stored encrypted in localStorage
//   - Recommended by Supabase for new projects, required for some IdPs
// `detectSessionInUrl: true` is the default and is what hands the OAuth
// `code` query param back to a session — keep it explicit so future
// readers know this is intentional.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
