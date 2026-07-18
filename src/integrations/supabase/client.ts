import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { mockSupabase, seedMockDatabase } from './mockClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isMockMode = !SUPABASE_URL || SUPABASE_URL.includes('ejrilcsxclneiigtywhc') || SUPABASE_URL.includes('REPLACE_WITH_PROJECT_ID');

if (isMockMode) {
  seedMockDatabase();
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = isMockMode
  ? mockSupabase
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });