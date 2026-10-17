import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SessionProvider } from '@/auth/session-context';
import { FoundationView } from './FoundationView';
import { MemoryRouter } from 'react-router';

function renderView(client: SupabaseClient | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={queryClient}>
    <SessionProvider client={client}><MemoryRouter><FoundationView /></MemoryRouter></SessionProvider>
  </QueryClientProvider>);
}

describe('Student landing experience', () => {
  it('shows only account tabs when sign-in is unavailable', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderView();
    await screen.findByText('Sign-in is unavailable right now. Please try again later.');
    expect(screen.getByRole('tab', { name: 'Log in' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Register' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    expect(screen.queryByText(/guest/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/project foundation|local connection|api connected|check connection|Supabase|later stages/i)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('starts Google OAuth from either tab and allows retry after a failure', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValueOnce({ error: new Error('Internal configuration problem') }).mockResolvedValue({ error: null });
    const client = { auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOAuth,
    } } as unknown as SupabaseClient;
    renderView(client);
    const start = await screen.findByRole('button', { name: 'Continue with Google' });
    await userEvent.click(start);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign in with Google. Please try again.');
    expect(screen.queryByText(/Supabase|configuration problem|local server/i)).not.toBeInTheDocument();
    expect(start).toBeEnabled();
    await userEvent.click(screen.getByRole('tab', { name: 'Register' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await userEvent.click(start);
    expect(signInWithOAuth).toHaveBeenCalledTimes(2);
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  });
});
