import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SessionProvider } from '@/auth/session-context';
import { FoundationView } from './FoundationView';

function renderView(client: SupabaseClient | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={queryClient}>
    <SessionProvider client={client}><FoundationView /></SessionProvider>
  </QueryClientProvider>);
}

describe('Student landing experience', () => {
  it('keeps guest entry honest without exposing infrastructure or probing health', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderView();
    await screen.findByText('Starting as a guest is unavailable right now. Please try again later.');
    expect(screen.getByRole('button', { name: 'Start as guest' })).toBeDisabled();
    expect(screen.queryByText(/project foundation|local connection|api connected|check connection|Supabase|later stages/i)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an actionable guest failure and allows retry without exposing configuration details', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({ data: { session: null }, error: new Error('Internal configuration problem') });
    const client = { auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInAnonymously,
    } } as unknown as SupabaseClient;
    renderView(client);
    const start = await screen.findByRole('button', { name: 'Start as guest' });
    await userEvent.click(start);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not start your guest session. Please try again.');
    expect(screen.queryByText(/Supabase|configuration problem|local server/i)).not.toBeInTheDocument();
    expect(start).toBeEnabled();
    await userEvent.click(start);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });
});
