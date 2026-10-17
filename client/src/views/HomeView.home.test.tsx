import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { HomeView } from './HomeView';

const { fetchHome, fetchTopics, discoverTopicSources, startLesson } = vi.hoisted(() => ({
  fetchHome: vi.fn(), fetchTopics: vi.fn(), discoverTopicSources: vi.fn(), startLesson: vi.fn(),
}));
vi.mock('@/lib/learning', () => ({ fetchHome, fetchTopics, discoverTopicSources }));
vi.mock('@/lib/sessions', () => ({ startLesson }));
vi.mock('@/auth/session-context', () => ({ useSession: () => ({ session: { userId: 'student' }, profile: null }) }));

const concept = { id: 'concept-1', slug: 'clients-and-servers', title: 'Clients and servers', description: 'How they communicate',
  objectives: ['Trace a request'], citations: [], area: 'web_communication', order: 1, contentAvailable: true,
  status: 'not_assessed', sessionId: null, sessionCompleted: false };
const home = { concepts: [concept], recommendations: { learn: null, review: [] }, activityCounts: [],
  recentSession: null, unfinishedSession: null };

function showHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/home']}><Routes>
    <Route path="/home" element={<HomeView />} /><Route path="/learn/:sessionId" element={<p>Lesson opened</p>} />
    <Route path="/learn" element={<p>Learning tree opened</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchTopics.mockResolvedValue([]);
});

it('prioritizes an unfinished lesson and links each suggested review to its session', async () => {
  fetchHome.mockResolvedValue({ ...home, concepts: [{ ...concept, status: 'developing', sessionId: 'review-session', sessionCompleted: true }],
    unfinishedSession: { id: 'unfinished-session', conceptId: 'topic-1' },
    recommendations: { learn: null, review: [{ conceptId: concept.id, reasonCode: 'developing', reason: 'Practise this gap.', dueAt: null }] } });
  fetchTopics.mockResolvedValue([{ id: 'topic-1', parentKey: 'root:Computer Networks', title: 'Network basics',
    objective: 'Understand a network', status: 'explored', sessionId: 'unfinished-session', citations: [] }]);
  showHome();
  expect(await screen.findByRole('heading', { name: 'Network basics' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Continue lesson' })).toHaveAttribute('href', '/learn/unfinished-session');
  expect(screen.getByRole('link', { name: 'Review Clients and servers' })).toHaveAttribute('href', '/learn/review-session');
  expect(screen.queryByRole('link', { name: 'Choose a concept' })).not.toBeInTheDocument();
});

it('starts the available recommended lesson directly', async () => {
  fetchHome.mockResolvedValue({ ...home, recommendations: { learn: { conceptId: concept.id, reasonCode: 'interest', reason: 'Matches your interests.' }, review: [] } });
  startLesson.mockResolvedValue({ id: 'new-session' });
  showHome();
  expect(await screen.findByText('Matches your interests.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start lesson' }));
  await waitFor(() => expect(screen.getByText('Lesson opened')).toBeVisible());
  expect(startLesson).toHaveBeenCalledWith(concept.id, expect.any(String));
});

it('directs the learner to Learn when there is no recommendation, even with saved topics', async () => {
  fetchHome.mockResolvedValue(home);
  fetchTopics.mockResolvedValue([{ id: 'topic-1', parentKey: 'root:Computer Networks', title: 'Network basics',
    objective: 'Understand a network', status: 'not_assessed', sessionId: null, citations: [] }]);
  showHome();
  expect(await screen.findByRole('heading', { name: 'Explore what interests you' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Go to Learn' })).toHaveAttribute('href', '/learn');
});

it('offers the learning tree when no lesson or saved topic is available', async () => {
  fetchHome.mockResolvedValue({ ...home, concepts: [] });
  showHome();
  expect(await screen.findByRole('heading', { name: 'Explore what interests you' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Go to Learn' })).toHaveAttribute('href', '/learn');
  expect(screen.queryByText('Browse the learning path')).not.toBeInTheDocument();
});
