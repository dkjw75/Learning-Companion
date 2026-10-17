import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@learning-companion/shared';
import { fetchProfile, getSupabaseClient } from './supabase.js';

// Identity snapshot only. Access tokens remain in the Supabase client, never Context.
export type SessionIdentity = { userId: string; isAnonymous: boolean; displayName: string };
type SessionContextValue = {
  session: SessionIdentity | null;
  profile: Profile | null;
  status: 'loading' | 'ready' | 'unconfigured';
  refreshProfile: () => Promise<Profile>;
  signInWithGoogle: () => Promise<void>;
  finishGoogleSignIn: (code: string) => Promise<Profile>;
  signOut: () => Promise<void>;
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
  const identityRef = useRef<string | null>(null);
  const replaceSession = useCallback((nextSession: SessionIdentity | null) => {
    const nextIdentity = nextSession?.userId ?? null;
    if (identityRef.current !== nextIdentity) queryClient.clear();
    identityRef.current = nextIdentity;
    setSession(nextSession);
    setProfile(null);
  }, [queryClient]);
  const applyVerifiedProfile = useCallback((verified: Profile, displayName: string) => {
    replaceSession({ userId: verified.userId, isAnonymous: verified.isAnonymous, displayName });
    setProfile(verified);
  }, [replaceSession]);
  const verifyStoredSession = useCallback(async (accessToken: string) => {
    if (!client) throw new Error('Sign-in is unavailable.');
    const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !user || user.is_anonymous) throw new Error('Sign in with Google to continue.');
    const verified = await loadProfile(accessToken);
    if (verified.userId !== user.id || verified.isAnonymous) {
      throw new Error('Profile and session identities do not match.');
    }
    const name = [user.user_metadata?.full_name, user.user_metadata?.name]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    applyVerifiedProfile(verified, name?.trim().replace(/\s+/g, ' ').slice(0, 80) || 'My learning');
    return verified;
  }, [applyVerifiedProfile, client, loadProfile]);
  useEffect(() => {
    let active = true;
    if (window.location.pathname === '/auth/callback') {
      queueMicrotask(() => { if (active) setStatus('ready'); });
      return () => { active = false; };
    }
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
        }
      } finally {
        if (active) setStatus('ready');
      }
    })();
    return () => { active = false; };
  }, [client, replaceSession, verifyStoredSession]);
  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') replaceSession(null);
    });
    return () => subscription.unsubscribe();
  }, [client, replaceSession]);
  const refreshProfile = useCallback(async () => {
    if (!client) throw new Error('No account session.');
    const { data: { session: stored } } = await client.auth.getSession();
    if (!stored) throw new Error('No account session.');
    return verifyStoredSession(stored.access_token);
  }, [client, verifyStoredSession]);
  const signInWithGoogle = useCallback(async () => {
    if (!client) throw new Error('Sign-in is unavailable.');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, [client]);
  const finishGoogleSignIn = useCallback(async (code: string) => {
    if (!client) throw new Error('Sign-in is unavailable.');
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw error ?? new Error('Sign-in could not be completed.');
    return verifyStoredSession(data.session.access_token);
  }, [client, verifyStoredSession]);
  const signOut = useCallback(async () => {
    if (!client) throw new Error('Sign-out is unavailable.');
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    replaceSession(null);
  }, [client, replaceSession]);
  const value = useMemo(() => ({ session, profile, status, refreshProfile, signInWithGoogle, finishGoogleSignIn, signOut, replaceSession }),
    [session, profile, status, refreshProfile, signInWithGoogle, finishGoogleSignIn, signOut, replaceSession]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}
