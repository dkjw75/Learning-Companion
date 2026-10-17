import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { CatalogueView } from './HomeView';

const { fetchHome, fetchTopics, suggestTopics, startLesson } = vi.hoisted(() => ({ fetchHome: vi.fn(), fetchTopics: vi.fn(), suggestTopics: vi.fn(), startLesson: vi.fn() }));
vi.mock('@/lib/learning', () => ({ fetchHome, fetchTopics, suggestTopics }));
vi.mock('@/lib/sessions', () => ({ startLesson }));
vi.mock('@/auth/session-context', () => ({ useSession: () => ({ session: { userId: 'student' } }) }));

it('shows one root, ten branches, and the four saved topics in their branches', async () => {
  fetchTopics.mockResolvedValue([
    { id: 'ci', parentKey: 'root:Software Development', title: 'CI/CD', objective: 'Understand the CI/CD workflow' },
    { id: 'deploy', parentKey: 'node:ci', title: 'Automated Deployment', objective: 'Explain automated deployment' },
    { id: 'pipeline', parentKey: 'node:ci', title: 'Building a CI Pipeline', objective: 'Build a continuous integration pipeline' },
  ]);
  fetchHome.mockResolvedValue({ concepts: [
    ['clients-and-servers', 'Clients and servers', 'not_assessed'],
    ['http-requests-and-responses', 'HTTP requests and responses', 'explored'],
    ['what-an-api-does', 'What an API does', 'developing'],
    ['tables-and-records', 'Tables and records', 'demonstrated_understanding'],
  ].map(([slug, title, status], index) => ({ id: String(index), slug, title, status,
    description: `About ${title}`, objectives: [`Understand ${title}`],
    citations: [{ title: 'Reference page', url: 'https://example.com/reference' }],
    contentAvailable: true, sessionId: index === 0 ? null : `00000000-0000-4000-8000-00000000020${index}`,
    sessionCompleted: index > 1,
  })), recommendations: { learn: null, review: [] } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/learn']}><Routes>
    <Route path="/learn" element={<CatalogueView />} /><Route path="/learn/:sessionId" element={<p>Lesson opened</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);

  const tree = await screen.findByRole('region', { name: 'Skill tree' });
  expect(within(tree).getByText('You')).toBeVisible();
  expect(tree.querySelectorAll('.skill-branch')).toHaveLength(10);
  expect(tree.querySelectorAll('.skill-hex svg')).toHaveLength(18);
  expect(tree.querySelectorAll('.skill-branches > .skill-branch')).toHaveLength(10);
  const networks = within(tree).getByRole('heading', { name: 'Computer Networks' }).closest('li');
  expect(networks).toHaveTextContent('Clients and servers');
  expect(networks).toHaveTextContent('HTTP requests and responses');
  expect(networks?.querySelectorAll(':scope > .skill-tree-children > .skill-tree-item')).toHaveLength(2);
  expect(within(tree).getByRole('heading', { name: 'Software Development' }).closest('li')).toHaveTextContent('What an API does');
  const ci = within(tree).getByText('CI/CD').closest('li');
  expect(ci?.parentElement?.parentElement).toHaveClass('skill-branch');
  expect(ci?.querySelectorAll(':scope > .skill-tree-children > .skill-tree-item')).toHaveLength(2);
  expect(within(tree).getByRole('heading', { name: 'Databases and Data Engineering' }).closest('li')).toHaveTextContent('Tables and records');
  expect(within(tree).queryAllByRole('link')).toHaveLength(0);
  expect([...tree.querySelectorAll('.skill-tree-children .skill-tree-children .skill-hex')].map(node => node.getAttribute('data-status'))).toEqual(['developing', 'not_assessed', 'not_assessed', 'not_assessed', 'demonstrated_understanding', 'not_assessed', 'explored']);
  expect(tree.querySelectorAll('.skill-status-legend .skill-hex')).toHaveLength(4);
  expect(tree.querySelectorAll('.skill-branch > .skill-hex[data-status]')).toHaveLength(0);

  const expandSoftware = within(tree).getByRole('button', { name: 'Learn something new from Software Development' });
  expect(within(expandSoftware).getByRole('tooltip')).toHaveTextContent('Learn something new');
  fireEvent.click(expandSoftware);
  const expansionDialog = screen.getByRole('dialog', { name: 'What do you want to learn?' });
  expect(expansionDialog).toBeVisible();
  expect(within(expansionDialog).getByRole('textbox', { name: 'Topic' })).toBeVisible();
  expect(within(expansionDialog).getByRole('link', { name: 'Got nothing in mind? Let me suggest for you' })).toHaveAttribute('href', '#suggest');
  expect(within(expansionDialog).getByRole('button', { name: 'Submit' })).toBeVisible();
  let finishSuggestion!: (topics: unknown[]) => void;
  suggestTopics.mockReturnValueOnce(new Promise(resolve => { finishSuggestion = resolve; }));
  tree.setPointerCapture = vi.fn();
  const suggestLink = within(expansionDialog).getByRole('link', { name: 'Got nothing in mind? Let me suggest for you' });
  fireEvent.pointerDown(suggestLink, { button: 0, pointerId: 2 });
  expect(tree.setPointerCapture).not.toHaveBeenCalled();
  fireEvent.click(suggestLink);
  expect(expansionDialog).toHaveAttribute('aria-busy', 'true');
  expect(expansionDialog.querySelector('form')).toHaveAttribute('inert');
  expect(within(expansionDialog).getByRole('status')).toHaveTextContent('Finding topics…');
  expect(within(expansionDialog).getByRole('button', { name: 'Close' })).toBeDisabled();
  await act(async () => { finishSuggestion([]); });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'What do you want to learn?' })).not.toBeInTheDocument());

  const canvas = tree.querySelector('.skill-tree-canvas') as HTMLElement;
  fireEvent.click(within(tree).getByRole('button', { name: 'Zoom in' }));
  expect(canvas.style.transform).toContain('scale(1.2)');
  expect(fireEvent.wheel(tree, { deltaY: -100, clientX: 0, clientY: 0 })).toBe(false);
  expect(canvas.style.transform).toContain('scale(1.32)');
  tree.setPointerCapture = vi.fn();
  fireEvent.pointerDown(tree, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(tree, { pointerId: 1, clientX: 140, clientY: 120 });
  expect(canvas.style.transform).toMatch(/translate\([^,]+px, 20px\)/);
  fireEvent.pointerUp(tree, { pointerId: 1 });

  fireEvent.click(within(tree).getByText('What an API does').closest('button')!);
  let panel = screen.getByRole('complementary', { name: 'What an API does' });
  expect(within(panel).getByText('About What an API does')).toBeVisible();
  expect(within(panel).getByText('Understand What an API does')).toBeVisible();
  expect(within(panel).getByRole('link', { name: 'Reference page ↗' })).toHaveAttribute('href', 'https://example.com/reference');
  expect(panel.querySelector('.skill-status-badge')).toHaveAttribute('data-status', 'developing');
  expect(within(panel).getByRole('link', { name: 'Review lesson again' })).toHaveAttribute('href', '/learn/00000000-0000-4000-8000-000000000202');

  fireEvent.click(within(tree).getByText('HTTP requests and responses').closest('button')!);
  panel = screen.getByRole('complementary', { name: 'HTTP requests and responses' });
  expect(within(panel).getByRole('link', { name: 'Resume lesson' })).toHaveAttribute('href', '/learn/00000000-0000-4000-8000-000000000201');

  fireEvent.click(within(tree).getByText('Clients and servers').closest('button')!);
  panel = screen.getByRole('complementary', { name: 'Clients and servers' });
  startLesson.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000204' });
  fireEvent.click(within(panel).getByRole('button', { name: 'Start lesson' }));
  expect(await screen.findByText('Lesson opened')).toBeVisible();
  expect(startLesson).toHaveBeenCalledWith('0', expect.any(String));
});
