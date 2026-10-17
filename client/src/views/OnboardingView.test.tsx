import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useSession } from '@/auth/session-context';
import { saveOnboarding } from '@/lib/learning';
import { OnboardingView } from './OnboardingView';

vi.mock('@/auth/session-context', () => ({ useSession: vi.fn() }));
vi.mock('@/lib/learning', () => ({ saveOnboarding: vi.fn() }));

it('shows the ten starter areas and saves the chosen first area first', async () => {
  vi.mocked(useSession).mockReturnValue({
    session: { userId: 'account', isAnonymous: false },
    profile: { onboardingComplete: false },
    refreshProfile: vi.fn().mockResolvedValue({ onboardingComplete: true }),
  } as unknown as ReturnType<typeof useSession>);
  vi.mocked(saveOnboarding).mockResolvedValue({} as Awaited<ReturnType<typeof saveOnboarding>>);
  render(<MemoryRouter initialEntries={['/onboarding']}><Routes>
    <Route path="/onboarding" element={<OnboardingView />} />
    <Route path="/home" element={<p>Home destination</p>} />
  </Routes></MemoryRouter>);
  const choices = within(screen.getByRole('group', { name: 'Areas of interest' }));
  expect(choices.getAllByRole('button').map(button => button.querySelector('strong')?.textContent)).toEqual([
    'Software Development', 'AI Engineering', 'Cybersecurity', 'Cloud Computing',
    'Data Science and Analytics', 'Databases and Data Engineering', 'Computer Networks',
    'Operating Systems', 'Hardware and Embedded Systems', 'Human-Computer Interaction',
  ]);
  const user = userEvent.setup();
  await user.click(choices.getByRole('button', { name: /Software Development/ }));
  await user.click(choices.getByRole('button', { name: /Databases and Data Engineering/ }));
  await user.click(choices.getByRole('button', { name: /Computer Networks/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: /Some experience/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: /Databases and Data Engineering/ }));
  await user.click(screen.getByRole('button', { name: 'See my home' }));
  expect(await screen.findByText('Home destination')).toBeVisible();
  expect(saveOnboarding).toHaveBeenCalledWith(expect.objectContaining({
    interests: ['databases', 'web_development', 'web_communication'],
    experienceLevel: 'some', skippedDiagnostic: true, answers: [],
  }));
});
