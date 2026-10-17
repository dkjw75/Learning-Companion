import { expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@learning-companion/shared';
import { type ReactNode } from 'react';
import { SessionProvider, useSession } from './session-context';

it('clears cached private data when identity changes or signs out, retaining it for the same user', () => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  expect(result.current.session).toBeNull();
  act(() => { result.current.replaceSession({ userId: 'user-a', isAnonymous: false, displayName: 'Ada' }); });
  client.setQueryData(['user-a', 'map'], { private: 'user-a' });
  act(() => { result.current.replaceSession({ userId: 'user-a', isAnonymous: false, displayName: 'Ada' }); });
  expect(client.getQueryData(['user-a', 'map'])).toEqual({ private: 'user-a' });
  act(() => { result.current.replaceSession({ userId: 'user-b', isAnonymous: false, displayName: 'Grace' }); });
  expect(client.getQueryData(['user-a', 'map'])).toBeUndefined();
  client.setQueryData(['user-b', 'map'], { private: 'user-b' });
  act(() => { result.current.replaceSession(null); });
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});

const profile: Profile = {
  userId: '00000000-0000-4000-8000-000000000901', isAnonymous: false,
  interests: [], experienceLevel: 'new', onboardingComplete: false,
  timezone: 'UTC', reducedMotion: false, createdAt: '2026-10-08T00:00:00Z',
};

function authClient(savedToken: string | null) {
  const getSession = vi.fn().mockResolvedValue({ data: { session: savedToken ? { access_token: savedToken } : null }, error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: profile.userId, is_anonymous: false, user_metadata: { full_name: 'Ada Lovelace' } } }, error: null });
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  return { client: { auth: { getSession, getUser, exchangeCodeForSession, signOut, onAuthStateChange } } as unknown as SupabaseClient,
    getSession, getUser, exchangeCodeForSession, signOut, onAuthStateChange };
}

it('exchanges a Google callback code and loads the server-verified profile', async () => {
  const queryClient = new QueryClient();
  const auth = authClient(null);
  const loadProfile = vi.fn().mockResolvedValue(profile);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={loadProfile}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { await result.current.finishGoogleSignIn('callback-code'); });
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('callback-code');
  expect(auth.getUser).toHaveBeenCalledWith('new-token');
  expect(loadProfile).toHaveBeenCalledWith('new-token');
  expect(result.current.session).toEqual({ userId: profile.userId, isAnonymous: false, displayName: 'Ada Lovelace' });
  expect(result.current.profile).toEqual(profile);
});

it('restores a saved account without creating another identity', async () => {
  const queryClient = new QueryClient();
  const auth = authClient('saved-token');
  const loadProfile = vi.fn().mockResolvedValue(profile);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={loadProfile}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.profile).toEqual(profile));
  expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(auth.getUser).toHaveBeenCalledWith('saved-token');
  expect(result.current.session?.displayName).toBe('Ada Lovelace');
});

it('signs out only this browser session and clears private data', async () => {
  const queryClient = new QueryClient();
  const auth = authClient('saved-token');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={vi.fn().mockResolvedValue(profile)}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.profile).toEqual(profile));
  queryClient.setQueryData(['home', profile.userId], { private: true });
  await act(async () => { await result.current.signOut(); });
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(result.current.session).toBeNull();
  expect(result.current.profile).toBeNull();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

it('clears private data when Supabase reports sign-out from another tab', async () => {
  const queryClient = new QueryClient();
  const auth = authClient('saved-token');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={vi.fn().mockResolvedValue(profile)}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.profile).toEqual(profile));
  queryClient.setQueryData(['home', profile.userId], { private: true });
  const subscriptionCall = auth.onAuthStateChange.mock.calls[0];
  if (!subscriptionCall) throw new Error('Missing auth state subscription.');
  const onAuthChange = subscriptionCall[0] as (event: string) => void;
  act(() => onAuthChange('SIGNED_OUT'));
  expect(result.current.session).toBeNull();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

it('keeps the account visible when sign-out fails so the student can retry', async () => {
  const queryClient = new QueryClient();
  const auth = authClient('saved-token');
  auth.signOut.mockResolvedValue({ error: new Error('Network unavailable') });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={vi.fn().mockResolvedValue(profile)}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.profile).toEqual(profile));
  await expect(result.current.signOut()).rejects.toThrow('Network unavailable');
  expect(result.current.session?.displayName).toBe('Ada Lovelace');
});

it('rejects a saved anonymous session before loading private data', async () => {
  const queryClient = new QueryClient();
  const auth = authClient('old-guest-token');
  auth.getUser.mockResolvedValue({ data: { user: { id: profile.userId, is_anonymous: true } }, error: null });
  const loadProfile = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>
    <SessionProvider client={auth.client} loadProfile={loadProfile}>{children}</SessionProvider>
  </QueryClientProvider>;
  const { result } = renderHook(useSession, { wrapper });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.session).toBeNull();
  expect(loadProfile).not.toHaveBeenCalled();
});
