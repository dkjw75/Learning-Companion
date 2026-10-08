import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { errorEnvelopeSchema, meEnvelopeSchema, type Profile } from '@learning-companion/shared';

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (browserClient !== undefined) return browserClient;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return (browserClient = null);
  browserClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return browserClient;
}

export async function fetchProfile(accessToken: string): Promise<Profile> {
  const response = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorEnvelopeSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error.message : 'Could not load your profile.');
  }
  return meEnvelopeSchema.parse(body).data;
}
