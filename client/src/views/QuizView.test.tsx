import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import userEvent from '@testing-library/user-event';
import { QuizView } from './QuizView';

const { fetchLesson, submitAnswer, requestHint, saveLessonStep, fetchTutorHistory, sendTutorMessage } = vi.hoisted(() => ({
  fetchLesson: vi.fn(), submitAnswer: vi.fn(), requestHint: vi.fn(), saveLessonStep: vi.fn(),
  fetchTutorHistory: vi.fn().mockResolvedValue({ messages: [], nextBefore: null }), sendTutorMessage: vi.fn(),
}));
vi.mock('@/lib/sessions', () => ({ fetchLesson, submitAnswer, requestHint, saveLessonStep, fetchTutorHistory, sendTutorMessage }));

const steps = [{ id: 'one', heading: 'Start' }, { id: 'two', heading: 'Connect' }];

describe('saved quiz', () => {
  it('shows committed status and first-answer evidence after a refresh', async () => {
    const id = '00000000-0000-4000-8000-000000000201';
    fetchLesson.mockResolvedValue({ id, lesson: { title: 'HTTP requests', steps }, citations: [], assistedQuestionIds: [],
      round: { id: 'round', assessmentBasis: 'ai_generated_key', sourceMode: 'source_grounded', questions: [0, 1, 2].map(index => ({
        id: `q-${index}`, prompt: `Question ${index + 1}`, kind: 'recall', citationChunkIds: [], options: [],
      })) },
      attempts: [0, 1, 2].map(index => ({ evidence: { questionId: `q-${index}`, attemptIndex: 1,
        answer: 'a', correct: true, independent: index !== 1 }, feedback: 'Correct.', completed: index === 2,
        ...(index === 2 && { progressUpdate: { previousStatus: 'developing', currentStatus: 'developing' } }),
      })) });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/learn/${id}/quiz`]}><Routes>
      <Route path="/learn/:sessionId/quiz" element={<QuizView />} />
      <Route path="/learn" element={<p>All topics</p>} />
    </Routes></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText('Learning status: Developing → Developing')).toBeVisible();
    expect(screen.getByText('First answers: 3 of 3 correct · 2 of 3 correct without hints.')).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'End lesson' }));
    expect(screen.getByText('All topics')).toBeVisible();
  });

  it('shows a hint and keeps a correct retry as practice', async () => {
    const id = '00000000-0000-4000-8000-000000000201';
    fetchLesson.mockResolvedValue({ id, lesson: { title: 'HTTP requests', steps },
      round: { id: '00000000-0000-4000-8000-000000000301', assessmentBasis: 'ai_generated_key', sourceMode: 'source_grounded',
        questions: ['Who sends the request?', 'What does the server return?', 'Which response fits this request?']
          .map((prompt, index) => ({ id: `q-${index}`, prompt, kind: index === 2 ? 'application' : 'recall',
            citationChunkIds: [], options: [{ id: 'a', text: `Choice ${index + 1}A` }, { id: 'b', text: `Choice ${index + 1}B` }] })) },
      citations: [], attempts: [], assistedQuestionIds: [] });
    requestHint.mockResolvedValue('Review the lesson example.');
    saveLessonStep.mockResolvedValue(1);
    submitAnswer.mockResolvedValueOnce({ evidence: { questionId: 'q-0', answer: 'a', requestId: 'first', attemptIndex: 1,
      correct: false }, feedback: 'Not quite.', completed: false }).mockResolvedValueOnce({ evidence: {
      questionId: 'q-0', answer: 'b', requestId: 'retry', attemptIndex: 2, correct: true,
    }, feedback: 'Correct.', completed: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/learn/${id}/quiz`]}><Routes>
      <Route path="/learn/:sessionId/quiz" element={<QuizView />} />
      <Route path="/learn/:sessionId" element={<p>Lesson step</p>} />
    </Routes></MemoryRouter></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: 'HTTP requests' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Tutor chat' })).toHaveTextContent('Ask or highlight a text to clarify anything here!');
    expect(screen.getByRole('button', { name: 'End lesson' })).toBeDisabled();
    expect(fetchLesson).toHaveBeenCalledWith(id);
    expect(screen.getAllByText(/QUESTION \d OF 3/)).toHaveLength(3);
    expect(screen.getByText('Which response fits this request?')).toBeVisible();
    expect(screen.getByText('Choice 3B')).toBeVisible();
    expect(screen.getByRole('link', { name: '← Back to lesson' })).toHaveAttribute('href', `/learn/${id}`);
    expect(screen.getByRole('link', { name: 'Go to Quiz' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeVisible();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Choice 1A' }));
    expect(screen.getByRole('button', { name: 'Choice 1A' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getAllByRole('button', { name: 'Check answer' })[0]!);
    expect(submitAnswer).toHaveBeenCalledWith(expect.any(String), 'q-0', 'a', expect.any(String));
    expect(await screen.findByText('Not quite.')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Get a hint' })[0]!);
    expect(requestHint).toHaveBeenCalledWith(expect.any(String), 'q-0', expect.any(String));
    expect(await screen.findByText('Review the lesson example.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Choice 1B' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Practice retry · Correct.')).toBeVisible();
    expect(screen.getByText('Your first answer: Choice 1A · Needs review')).toBeVisible();
    expect(screen.getByText('Retries are practice; your first answer stays on record.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(saveLessonStep).toHaveBeenCalledWith(id, 1);
    expect(await screen.findByText('Lesson step')).toBeVisible();
    expect(client.getQueryData(['lesson', id])).toMatchObject({ currentStep: 1 });
  });
});
