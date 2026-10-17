import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useSession } from '@/auth/session-context';
import { saveOnboarding } from '@/lib/learning';
import { OnboardingView } from './OnboardingView';

vi.mock('@/auth/session-context', () => ({ useSession: vi.fn() }));
vi.mock('@/lib/learning', () => ({ saveOnboarding: vi.fn() }));

it('saves all ten starter areas and reaches home after interests and experience', async () => {
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
  for (const choice of choices.getAllByRole('button')) await user.click(choice);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: /Some experience/ }));
  await user.click(screen.getByRole('button', { name: 'See my home' }));
  expect(await screen.findByText('Home destination')).toBeVisible();
  expect(saveOnboarding).toHaveBeenCalledWith(expect.objectContaining({
    interests: ['web_development', 'ai_ml', 'cybersecurity', 'cloud', 'data_science',
      'databases', 'web_communication', 'operating_systems', 'hardware_iot', 'ui_ux'],
    experienceLevel: 'some', skippedDiagnostic: true, answers: [],
  }));
});
