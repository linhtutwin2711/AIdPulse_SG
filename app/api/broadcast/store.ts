// Push-subscription store shared by the subscribe + send routes.
//
// Primary: the Supabase `push_subscriptions` table (required on Vercel, where
// serverless instances don't share memory). Fallback: an in-memory Map so
// local dev works before the table exists. SQL to create the table:
//
//   create table if not exists push_subscriptions (
//     endpoint text primary key,
//     keys jsonb not null,
//     created_at timestamptz default now()
//   );
//   alter table push_subscriptions enable row level security;
//   create policy "anon manage push subs" on push_subscriptions
//     for all to anon using (true) with check (true);

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// On globalThis so the subscribe and send routes share one Map even when the
// dev server gives each route bundle its own module instance.
const memory: Map<string, StoredSubscription> = ((
  globalThis as unknown as { __aidpulsePushSubs?: Map<string, StoredSubscription> }
).__aidpulsePushSubs ??= new Map());

export async function saveSubscription(sub: StoredSubscription): Promise<void> {
  memory.set(sub.endpoint, sub);
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, keys: sub.keys }, { onConflict: "endpoint" });
  if (error) console.warn("[broadcast] subscription not persisted (table missing?):", error.message);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  memory.delete(endpoint);
  if (!isSupabaseConfigured) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function allSubscriptions(): Promise<StoredSubscription[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("push_subscriptions").select("endpoint, keys");
    if (!error && data && data.length > 0) {
      return data as StoredSubscription[];
    }
  }
  return [...memory.values()];
}
