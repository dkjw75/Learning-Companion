import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { learningStatusLabels } from '@learning-companion/shared';
import { ButtonUi } from '@/components/ui/button-ui';
import { LessonStepRail } from '@/components/LessonStepRail';
import { TutorPanel } from '@/components/TutorPanel';
import { fetchLesson, requestHint, saveLessonStep, submitAnswer, type SavedLessonSession } from '@/lib/sessions';

export function QuizView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [stepError, setStepError] = useState(false);
  const [movingStep, setMovingStep] = useState(false);
  const requests = useRef<Record<string, { answer: string; id: string }>>({});
  const hintRequests = useRef<Record<string, string>>({});
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lesson', sessionId], queryFn: () => fetchLesson(sessionId!), enabled: Boolean(sessionId),
  });
  if (isLoading) return <p className="load-state" role="status">Opening your quiz…</p>;
  if (isError || !data) return <div className="load-state" role="alert">Could not open your quiz. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div>;

  const result = data.attempts.find(attempt => attempt.completed)?.progressUpdate;
  const firstAnswers = data.attempts.filter(attempt => attempt.evidence.attemptIndex === 1);
  const correctFirst = firstAnswers.filter(attempt => attempt.evidence.correct).length;
  const independentCorrect = firstAnswers.filter(attempt => attempt.evidence.correct && attempt.evidence.independent).length;

  async function checkAnswer(questionId: string, answer: string) {
    if (pending) return;
    setPending(questionId); setSubmitError(null);
    const previous = requests.current[questionId];
    const requestId = previous?.answer === answer ? previous.id : crypto.randomUUID();
    requests.current[questionId] = { answer, id: requestId };
    try {
      const result = await submitAnswer(data!.round.id, questionId, answer, requestId);
      queryClient.setQueryData<SavedLessonSession>(['lesson', sessionId], old => old && {
        ...old, attempts: old.attempts.some(attempt => attempt.evidence.requestId === requestId)
          ? old.attempts : [...old.attempts, result],
      });
      void queryClient.invalidateQueries({ queryKey: ['topics'] });
      if (result.completed) void queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch {
      setSubmitError(questionId);
      void refetch();
    } finally { setPending(null); }
  }

  async function showHint(questionId: string) {
    if (pending) return;
    setPending(`hint:${questionId}`); setHintError(null);
    const requestId = hintRequests.current[questionId] ?? crypto.randomUUID();
    hintRequests.current[questionId] = requestId;
    try {
      const hint = await requestHint(data!.round.id, questionId, requestId);
      setHints(current => ({ ...current, [questionId]: hint }));
      queryClient.setQueryData<SavedLessonSession>(['lesson', sessionId], old => old && ({
        ...old, assistedQuestionIds: old.assistedQuestionIds.includes(questionId)
          ? old.assistedQuestionIds : [...old.assistedQuestionIds, questionId],
      }));
    } catch { setHintError(questionId); }
    finally { setPending(null); }
  }

  async function openStep(position: number) {
    setMovingStep(true); setStepError(false);
    try {
      const currentStep = await saveLessonStep(data!.id, position);
      queryClient.setQueryData<SavedLessonSession>(['lesson', sessionId], old => old && ({ ...old, currentStep }));
      navigate(`/learn/${data!.id}`);
    } catch { setStepError(true); }
    finally { setMovingStep(false); }
  }

  return <article className="quiz-view">
    <LessonStepRail sessionId={data.id} steps={data.lesson.steps} activeStep={null} disabled={movingStep}
      onStepSelect={position => { void openStep(position); }} />
    <Link className="lesson-back" to={`/learn/${data.id}`}>← Back to lesson</Link>
    <header className="lesson-heading"><span className="eyebrow">UNDERSTANDING CHECK</span><h1>{data.lesson.title}</h1>
      <p>Three questions · {data.round.assessmentBasis === 'ai_generated_key' ? 'AI-assessed' : 'Reviewed assessment'}
        {data.round.sourceMode === 'unverified' && ' · Unverified source'}</p></header>
    {stepError && <p role="alert" className="form-error">Could not open that lesson step. Please try again.</p>}
    <div className="lesson-layout"><div className="lesson-main">
    {result && <section className="quiz-results" aria-labelledby="quiz-results-title" role="status">
      <h2 id="quiz-results-title">Check complete</h2>
      <p>Learning status: {learningStatusLabels[result.previousStatus]} → {learningStatusLabels[result.currentStatus]}</p>
      <p>First answers: {correctFirst} of 3 correct · {independentCorrect} of 3 correct without hints.</p>
      {independentCorrect < 3 && <p>Hints and retries help you practise, but do not change this check’s result.</p>}
    </section>}
    <ol className="quiz-questions">{data.round.questions.map((question, index) => {
      const citations = data.citations.filter(citation => question.citationChunkIds.includes(citation.id));
      const first = data.attempts.find(item => item.evidence.questionId === question.id && item.evidence.attemptIndex === 1);
      const latest = data.attempts.filter(item => item.evidence.questionId === question.id).at(-1);
      const assisted = data.assistedQuestionIds.includes(question.id);
      const chosen = selected[question.id] ?? latest?.evidence.answer;
      return <li key={question.id} className="quiz-question">
        <span className="eyebrow">QUESTION {index + 1} OF 3 · {question.kind === 'application' ? 'APPLICATION' : 'RECALL'}</span>
        <h2 id={`prompt-${question.id}`}>{question.prompt}</h2>
        <form onSubmit={event => { event.preventDefault(); const answer = selected[question.id]; if (answer && answer !== latest?.evidence.answer) void checkAnswer(question.id, answer); }}>
          <fieldset aria-labelledby={`prompt-${question.id}`} disabled={latest?.evidence.correct || pending !== null}>
            <ol className="quiz-options" type="A">{question.options.map(option => <li key={option.id}>
              <button type="button" aria-pressed={chosen === option.id}
                onClick={() => setSelected(current => ({ ...current, [question.id]: option.id }))}>{option.text}</button>
            </li>)}</ol>
          </fieldset>
          {!latest?.evidence.correct && <ButtonUi type="submit" size="small"
            disabled={!selected[question.id] || selected[question.id] === latest?.evidence.answer || pending !== null}>
            {pending === question.id ? 'Checking…' : first ? 'Try again' : 'Check answer'}</ButtonUi>}
        </form>
        {latest && <p className="quiz-feedback" role="status">{latest.evidence.attemptIndex > 1 && 'Practice retry · '}{latest.feedback}</p>}
        {first && <p className="quiz-practice-note">Your first answer: {question.options.find(option => option.id === first.evidence.answer)?.text ?? first.evidence.answer}
          {' · '}{first.evidence.correct ? 'Correct' : 'Needs review'}</p>}
        {first && !first.evidence.correct && <p className="quiz-practice-note">Retries are practice; your first answer stays on record.</p>}
        {!latest?.evidence.correct && !hints[question.id] && <ButtonUi type="button" variant="quiet" size="small"
          disabled={pending !== null} onClick={() => { void showHint(question.id); }}>
          {pending === `hint:${question.id}` ? 'Finding hint…' : assisted ? 'Show hint' : 'Get a hint'}</ButtonUi>}
        {assisted && <p className="quiz-practice-note">Hint used for this question.</p>}
        {hints[question.id] && <p className="quiz-hint" role="status">{hints[question.id]}</p>}
        {submitError === question.id && <p role="alert" className="form-error">Could not check your answer. Please try again.</p>}
        {hintError === question.id && <p role="alert" className="form-error">Could not show a hint. Please try again.</p>}
        {citations.length > 0 && <div className="lesson-sources"><h3>Sources for this question</h3><ul>{citations.map(citation => <li key={citation.id}>
          {/^https?:\/\//i.test(citation.url) ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.heading} ↗</a> : citation.heading}
        </li>)}</ul></div>}
      </li>;
    })}</ol>
    <div className="quiz-end"><ButtonUi disabled={!result} onClick={() => navigate('/learn')}>End lesson</ButtonUi></div>
    </div><TutorPanel sessionId={data.id} citations={data.citations} /></div>
  </article>;
}
