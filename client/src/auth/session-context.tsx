import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@learning-companion/shared';
import { fetchProfile, getSupabaseClient } from './supabase.js';

// Identity snapshot only. Access tokens remain in the Supabase client, never Context.
export type SessionIdentity = { userId: string; isAnonymous: boolean };
type SessionContextValue = {
  session: SessionIdentity | null;
  profile: Profile | null;
  status: 'loading' | 'ready' | 'unconfigured';
  starting: boolean;
  error: string | null;
  startGuest: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  replaceSession: (session: SessionIdentity | null) => void;
};
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children, client = getSupabaseClient(), loadProfile = fetchProfile }: {
  children: ReactNode;
  client?: SupabaseClient | null;
  loadProfile?: (accessToken: string) => Promise<Profile>;
}) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionIdentity | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unconfigured'>('loading');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identityRef = useRef<string | null>(null);
  const replaceSession = useCallback((nextSession: SessionIdentity | null) => {
    const nextIdentity = nextSession?.userId ?? null;
    if (identityRef.current !== nextIdentity) queryClient.clear();
    identityRef.current = nextIdentity;
    setSession(nextSession);
    setProfile(null);
  }, [queryClient]);
  const applyVerifiedProfile = useCallback((verified: Profile) => {
    replaceSession({ userId: verified.userId, isAnonymous: verified.isAnonymous });
    setProfile(verified);
  }, [replaceSession]);
  const verifyStoredSession = useCallback(async (accessToken: string) => {
    if (!client) return;
    const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !user) throw new Error('The saved session could not be verified.');
    const verified = await loadProfile(accessToken);
    if (verified.userId !== user.id || verified.isAnonymous !== (user.is_anonymous === true)) {
      throw new Error('Profile and session identities do not match.');
    }
    applyVerifiedProfile(verified);
  }, [applyVerifiedProfile, client, loadProfile]);
  useEffect(() => {
    let active = true;
    if (!client) {
      queueMicrotask(() => { if (active) setStatus('unconfigured'); });
      return () => { active = false; };
    }
    void (async () => {
      try {
        const { data: { session: stored }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (stored) await verifyStoredSession(stored.access_token);
      } catch {
        if (active) {
          replaceSession(null);
          setError('Your saved guest session could not be restored. Please try again.');
        }
      } finally {
        if (active) setStatus('ready');
      }
    })();
    return () => { active = false; };
  }, [client, replaceSession, verifyStoredSession]);
  const startGuest = useCallback(async () => {
    if (!client || starting) return;
    setStarting(true);
    setError(null);
    try {
      const { data: { session: stored } } = await client.auth.getSession();
      if (stored) {
        try {
          await verifyStoredSession(stored.access_token);
          return;
        } catch {
          // An invalid local session must not be treated as verified identity.
          await client.auth.signOut({ scope: 'local' });
        }
      }
      const { data, error: signInError } = await client.auth.signInAnonymously();
      if (signInError || !data.session) throw new Error('Anonymous sign-in failed.');
      await verifyStoredSession(data.session.access_token);
    } catch {
      replaceSession(null);
      setError('Could not start your guest session. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [client, replaceSession, starting, verifyStoredSession]);
  const refreshProfile = useCallback(async () => {
    if (!client) throw new Error('No guest session.');
    const { data: { session: stored } } = await client.auth.getSession();
    if (!stored) throw new Error('No guest session.');
    await verifyStoredSession(stored.access_token);
  }, [client, verifyStoredSession]);
  const value = useMemo(() => ({ session, profile, status, starting, error, startGuest, refreshProfile, replaceSession }),
    [session, profile, status, starting, error, startGuest, refreshProfile, replaceSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}
