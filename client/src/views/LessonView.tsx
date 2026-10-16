import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ButtonUi, ButtonUiLink } from '@/components/ui/button-ui';
import { LessonDiagram } from '@/components/LessonDiagram';
import { fetchLesson, saveLessonStep } from '@/lib/sessions';

export function LessonView() {
  const { sessionId } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lesson', sessionId], queryFn: () => fetchLesson(sessionId!), enabled: Boolean(sessionId),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  if (isLoading) return <p className="load-state" role="status">Opening your lesson…</p>;
  if (isError || !data) return <div className="load-state" role="alert">Could not open your lesson. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div>;
  const index = currentStep ?? data.currentStep;
  const step = data.lesson.steps[index];
  if (!step) return <div className="load-state" role="alert">This lesson step is unavailable.</div>;
  const diagram = data.lesson.diagrams.find(item => item.id === step.diagramId)!;
  const citations = data.citations.filter(item => step.citationChunkIds.includes(item.id));
  async function move(to: number) {
    setSaving(true); setSaveError(false);
    try { setCurrentStep(await saveLessonStep(data!.id, to)); }
    catch { setSaveError(true); }
    finally { setSaving(false); }
  }
  return <article className="lesson-view">
    <Link className="lesson-back" to="/learn">← All topics</Link>
    <header className="lesson-heading"><span className="eyebrow">GUIDED LESSON</span><h1>{data.lesson.title}</h1>
      <p>Step {index + 1} of {data.lesson.steps.length}{data.lesson.sourceMode === 'unverified' && ' · Unverified source'}</p></header>
    <nav className="lesson-steps" aria-label="Lesson steps">{data.lesson.steps.map((item, position) => <button key={item.id}
      type="button" aria-current={position === index ? 'step' : undefined} disabled={saving}
      onClick={() => { void move(position); }}>{position + 1}. {item.heading}</button>)}</nav>
    <div className="lesson-layout"><div className="lesson-main"><LessonDiagram key={`${diagram.id}:${index}`} diagram={diagram} step={step} runningExample={data.lesson.runningExample} />
      <section className="lesson-content" aria-labelledby="lesson-step-heading"><span className="eyebrow">STEP {index + 1}</span>
        <h2 id="lesson-step-heading">{step.heading}</h2><p>{step.caption}</p>
        <div className="lesson-explanation">{step.explanation.split(/\n\s*\n/u).filter(paragraph => paragraph.trim()).map((paragraph, position) => <p key={position}>{paragraph}</p>)}</div>
        <section className="lesson-breakdown"><h3>Technical breakdown</h3><p>{step.workedExample}</p></section>
        <aside className="lesson-mistake"><h3>Common mistake</h3><p>{step.commonMistake}</p></aside>
        {citations.length > 0 && <div className="lesson-sources"><h3>Sources for this step</h3><ul>{citations.map(citation => <li key={citation.id}>
          {/^https?:\/\//i.test(citation.url) ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.heading} ↗</a> : citation.heading}
        </li>)}</ul></div>}
        <div className="lesson-actions"><ButtonUi variant="quiet" disabled={saving || index === 0} onClick={() => { void move(index - 1); }}>Previous</ButtonUi>
          {index < data.lesson.steps.length - 1 && <ButtonUi disabled={saving} onClick={() => { void move(index + 1); }}>Next step</ButtonUi>}</div>
        {index === data.lesson.steps.length - 1 && <div className="lesson-quiz-entry"><p>You have reached the end of this lesson.</p>
          <ButtonUiLink to={`/learn/${data.id}/quiz`}>Go to quiz</ButtonUiLink></div>}
        {saveError && <p role="alert" className="form-error">Could not save your place. Please try again.</p>}
      </section></div></div>
  </article>;
}
