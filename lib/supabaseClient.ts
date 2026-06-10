import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
