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

// The most recent broadcast, so open app tabs can show it in-app (a reliable
// fallback to OS push, which depends on per-device subscription + OS settings).
// Kept in process memory on globalThis — fine for the demo (single dev/server
// process); a production multi-instance deploy would persist this to Supabase.
export interface LatestBroadcast {
  id: string;
  severity: string;
  area: string;
  message: string;
  ts: number;
}

const g = globalThis as unknown as { __aidpulseLatestBroadcast?: LatestBroadcast };

export function saveLatestBroadcast(b: LatestBroadcast): void {
  g.__aidpulseLatestBroadcast = b;
}

export function getLatestBroadcast(): LatestBroadcast | null {
  return g.__aidpulseLatestBroadcast ?? null;
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
  // Merge in-memory subs (this process) with any persisted in Supabase, deduped
  // by endpoint. Merging — rather than treating Supabase as exclusively
  // authoritative — means a device that subscribed this session is never
  // dropped just because the Supabase table is missing, empty, or RLS-blocked.
  const byEndpoint = new Map(memory);
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("push_subscriptions").select("endpoint, keys");
    if (!error && data) {
      for (const s of data as StoredSubscription[]) byEndpoint.set(s.endpoint, s);
    }
  }
  return [...byEndpoint.values()];
}
