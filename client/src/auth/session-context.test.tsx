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
  act(() => { result.current.replaceSession({ userId: 'user-a', isAnonymous: false }); });
  client.setQueryData(['user-a', 'map'], { private: 'user-a' });
  act(() => { result.current.replaceSession({ userId: 'user-a', isAnonymous: false }); });
  expect(client.getQueryData(['user-a', 'map'])).toEqual({ private: 'user-a' });
  act(() => { result.current.replaceSession({ userId: 'user-b', isAnonymous: false }); });
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
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: profile.userId, is_anonymous: false } }, error: null });
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
  return { client: { auth: { getSession, getUser, exchangeCodeForSession } } as unknown as SupabaseClient,
    getSession, getUser, exchangeCodeForSession };
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
  expect(result.current.session).toEqual({ userId: profile.userId, isAnonymous: false });
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
