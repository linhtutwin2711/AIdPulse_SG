import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// True only when BOTH env vars are present and non-empty. The live accessors in
// lib/data.ts check this and fall back to mock data instead of hitting the
// placeholder URL (which would fail and spam the console), so the app runs
// cleanly out-of-the-box and switches to live data once .env.local is filled.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Don't crash the whole app at import time when Supabase isn't configured.
// `lib/data.ts` imports this module at the top level, so a thrown error here
// would white-screen every page. The live data accessors in lib/data.ts all
// handle query errors by returning empty/zero defaults, so the UI degrades
// gracefully (dashboard shows zeros) instead of crashing. Add real values to
// .env.local to enable live data.
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Live dashboard data will be empty until you add them to .env.local.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key',
)
