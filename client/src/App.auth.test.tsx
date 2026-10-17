import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@learning-companion/shared';
import { MemoryRouter } from 'react-router';
import { SessionProvider } from '@/auth/session-context';
import { App } from './App';

vi.mock('@/components/ui/background-ascii-wake', () => ({ BackgroundAsciiWake: () => null }));

it('shows the Google name and returns to sign-in after signing out', async () => {
  const profile: Profile = {
    userId: '00000000-0000-4000-8000-000000000901', isAnonymous: false,
    interests: [], experienceLevel: 'new', onboardingComplete: false,
    timezone: 'UTC', reducedMotion: false, createdAt: '2026-10-17T00:00:00Z',
  };
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const client = { auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'saved-token' } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: profile.userId, is_anonymous: false, user_metadata: { full_name: 'Ada Lovelace' } } }, error: null }),
    signOut,
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } } as unknown as SupabaseClient;
  render(<QueryClientProvider client={new QueryClient()}><SessionProvider client={client} loadProfile={vi.fn().mockResolvedValue(profile)}>
    <MemoryRouter initialEntries={['/onboarding']}><App /></MemoryRouter>
  </SessionProvider></QueryClientProvider>);
  expect(await screen.findByText('Ada Lovelace')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: /Connect concepts.*Build understanding/ })).toBeVisible();
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
});
