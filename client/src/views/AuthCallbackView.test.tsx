import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@learning-companion/shared';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SessionProvider } from '@/auth/session-context';
import { AuthCallbackView } from './AuthCallbackView';

it.each([false, true])('routes Google sign-in by verified onboarding state (%s)', async onboardingComplete => {
  window.history.replaceState(null, '', '/auth/callback?code=google-code');
  const profile: Profile = {
    userId: '00000000-0000-4000-8000-000000000901', isAnonymous: false,
    interests: [], experienceLevel: 'new', onboardingComplete,
    timezone: 'UTC', reducedMotion: false, createdAt: '2026-10-08T00:00:00Z',
  };
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'google-token' } }, error: null });
  const getSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'old-guest-token' } }, error: null });
  const client = { auth: {
    getSession,
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: profile.userId, is_anonymous: false } }, error: null }),
    exchangeCodeForSession,
  } } as unknown as SupabaseClient;
  const destination = onboardingComplete ? 'Home destination' : 'Onboarding destination';
  render(<QueryClientProvider client={new QueryClient()}><SessionProvider client={client} loadProfile={vi.fn().mockResolvedValue(profile)}>
    <MemoryRouter initialEntries={['/auth/callback']}><Routes>
      <Route path="/auth/callback" element={<AuthCallbackView />} />
      <Route path="/home" element={<p>Home destination</p>} />
      <Route path="/onboarding" element={<p>Onboarding destination</p>} />
    </Routes></MemoryRouter>
  </SessionProvider></QueryClientProvider>);
  expect(await screen.findByText(destination)).toBeVisible();
  expect(exchangeCodeForSession).toHaveBeenCalledOnce();
  expect(exchangeCodeForSession).toHaveBeenCalledWith('google-code');
  expect(getSession).not.toHaveBeenCalled();
});
