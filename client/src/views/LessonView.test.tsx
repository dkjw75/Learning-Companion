import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { SavedLessonSession } from '@/lib/sessions';
import { LessonView } from './LessonView';

const { fetchLesson, saveLessonStep } = vi.hoisted(() => ({ fetchLesson: vi.fn(), saveLessonStep: vi.fn() }));
vi.mock('@/lib/sessions', () => ({ fetchLesson, saveLessonStep }));

const depth = {
  explanation: 'The client begins by sending a request to the server. This starts the exchange, and the server can then return a response for the client to use.',
  workedExample: 'A browser asks a server for its home page. The server returns the page for display.',
  commonMistake: 'Mistake: the server starts this exchange. Correction: the client sends the request first.',
};
const session = {
  id: '00000000-0000-4000-8000-000000000201', conceptId: '00000000-0000-4000-8000-000000000101',
  generationState: 'ready', currentStep: 0,
  lesson: {
    id: '00000000-0000-4000-8000-000000000201', conceptId: '00000000-0000-4000-8000-000000000101',
    title: '<img src=x onerror=alert(1)>', sourceMode: 'source_grounded', contentVersion: 'v1',
    runningExample: 'A student opens /courses and receives the course page in their browser.',
    objectives: [{ id: 'roles', description: 'Roles' }],
    citationChunkIds: ['00000000-0000-4000-8000-000000000501'],
    diagrams: [
      { id: 'flow', type: 'flow', title: 'Flow', nodes: [
        { id: 'client', label: '<script>alert(1)</script>', description: 'Sends a request', example: 'GET /courses', icon: 'api' },
        { id: 'server', label: 'Server', description: 'Responds', example: 'Courses page' },
      ], edges: [{ id: 'request', from: 'client', to: 'server', label: 'Request' }] },
      { id: 'relationship', type: 'relationship', title: 'Relations', nodes: [
        { id: 'table-a', label: 'Customers', description: 'Customer records', example: 'id: 42\nname: Ada' },
        { id: 'table-b', label: 'Orders', description: 'Order records', example: 'order: 1042\ncustomer_id: 42' },
      ], edges: [{ id: 'owns', from: 'table-a', to: 'table-b', label: 'Places' }] },
    ],
    steps: [
      { id: 'one', heading: 'Start', caption: 'A client asks.', ...depth, diagramId: 'flow', highlightNodeIds: ['client'], highlightRowIndexes: [], highlightEdgeIds: ['request'], citationChunkIds: ['00000000-0000-4000-8000-000000000501'] },
      { id: 'two', heading: 'Connect', caption: 'Customers place orders.', ...depth, diagramId: 'relationship', highlightNodeIds: ['table-a'], highlightRowIndexes: [], highlightEdgeIds: ['owns'], citationChunkIds: ['00000000-0000-4000-8000-000000000501'] },
      { id: 'three', heading: 'Tabulate', caption: 'Data has cells.', ...depth, diagramId: 'relationship', highlightNodeIds: ['client'], highlightRowIndexes: [], highlightEdgeIds: [], citationChunkIds: ['00000000-0000-4000-8000-000000000501'] },
      { id: 'four', heading: 'Finish', caption: 'Done.', ...depth, diagramId: 'flow', highlightNodeIds: ['client'], highlightRowIndexes: [], highlightEdgeIds: [], citationChunkIds: ['00000000-0000-4000-8000-000000000501'] },
    ],
  },
  round: { id: '00000000-0000-4000-8000-000000000301', sessionId: '00000000-0000-4000-8000-000000000201', kind: 'initial', sourceMode: 'source_grounded', assessmentBasis: 'ai_generated_key', questions: [] },
  citations: [{ id: '00000000-0000-4000-8000-000000000501', heading: 'Reference', url: 'https://example.com/reference' }], attempts: [], assistedQuestionIds: [],
} as SavedLessonSession;

function showLesson() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[`/learn/${session.id}`]}>
    <Routes><Route path="/learn/:sessionId" element={<LessonView />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}

describe('guided lesson player', () => {
  beforeEach(() => { fetchLesson.mockReset(); saveLessonStep.mockReset(); });
  it('renders labels as text, lets students select parts, and saves step navigation', async () => {
    fetchLesson.mockResolvedValue(session);
    saveLessonStep.mockImplementation(async (_id: string, step: number) => step);
    const user = userEvent.setup();
    showLesson();
    expect(await screen.findByRole('heading', { name: session.lesson.title })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    const client = screen.getAllByRole('button', { name: /<script>alert\(1\)<\/script>/ })[0]!;
    expect(client).toHaveClass('highlight');
    expect(screen.getByText(session.lesson.runningExample)).toBeVisible();
    expect(screen.getByText('GET /courses')).toBeVisible();
    expect(document.querySelector('path[data-edge-id="request"]')).toHaveClass('highlight');
    expect(screen.getByRole('button', { name: 'Server: Responds' })).toHaveClass('inactive');
    expect(client.querySelector('svg.lucide-network')).not.toBeNull();
    await user.click(client);
    expect(client).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Technical breakdown' })).toBeVisible();
    expect(screen.getByText(depth.workedExample)).toBeVisible();
    expect(screen.getByRole('link', { name: /Reference/ })).toHaveAttribute('href', 'https://example.com/reference');
    const rail = screen.getByRole('navigation', { name: 'Lesson steps' });
    expect(rail).toHaveTextContent('On this lesson');
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-current', 'step');
    expect(rail).toHaveTextContent('Go to Quiz');
    expect(screen.queryByText('Step 1 of 4')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Quiz' })).toHaveAttribute('href', `/learn/${session.id}/quiz`);
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(await screen.findByRole('region', { name: 'Relations' })).toHaveTextContent('Customers');
    expect(saveLessonStep).toHaveBeenCalledWith(session.id, 1);
    expect(screen.getByRole('button', { name: 'Connect' })).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByRole('button', { name: 'Finish' })).toHaveAttribute('aria-current', 'step');
  });

  it('opens the saved step without generating another lesson', async () => {
    const table = { id: 'table', type: 'table' as const, title: 'Records', nodes: [], edges: [],
      table: { columns: ['Key', 'Value'], rows: [['id', '1']] } };
    fetchLesson.mockResolvedValue({ ...session, currentStep: 2, lesson: { ...session.lesson,
      diagrams: [session.lesson.diagrams[0], table],
      steps: session.lesson.steps.map((step, index) => index === 2 ? { ...step, diagramId: 'table', highlightNodeIds: [], highlightEdgeIds: [], highlightRowIndexes: [0] } : { ...step, diagramId: 'flow' }),
    } });
    showLesson();
    expect(await screen.findByRole('heading', { name: 'Tabulate' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('id');
    expect(screen.getByRole('table').querySelector('tbody tr')).toHaveClass('highlight');
    expect(saveLessonStep).not.toHaveBeenCalled();
  });
});
