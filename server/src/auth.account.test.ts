import { expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createProfileService } from './auth.js';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

it('rejects an anonymous token before querying private profiles', async () => {
  const from = vi.fn();
  vi.mocked(createClient).mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'old-guest', is_anonymous: true } }, error: null,
  }) }, from } as unknown as ReturnType<typeof createClient>);
  const service = createProfileService('https://example.supabase.co', 'public-key');
  await expect(service.getProfile('guest-token')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  expect(from).not.toHaveBeenCalled();
});
