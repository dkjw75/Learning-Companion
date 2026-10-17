import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ButtonUi } from '@/components/ui/button-ui';
import { LessonDiagram } from '@/components/LessonDiagram';
import { LessonStepRail } from '@/components/LessonStepRail';
import { TutorPanel } from '@/components/TutorPanel';
import { fetchLesson, saveLessonStep } from '@/lib/sessions';

export function LessonView() {
  const { sessionId } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['lesson', sessionId], queryFn: () => fetchLesson(sessionId!), enabled: Boolean(sessionId),
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const [annotation, setAnnotation] = useState<string | undefined>();
  const [tutorHighlights, setTutorHighlights] = useState<{ nodeIds: string[]; edgeIds: string[] }>();
  const showTutorHighlights = useCallback((message: { highlightNodeIds: string[]; highlightEdgeIds: string[] }) => {
    setTutorHighlights({ nodeIds: message.highlightNodeIds, edgeIds: message.highlightEdgeIds });
  }, []);
  const content = useRef<HTMLElement>(null);
  if (isLoading) return <p className="load-state" role="status">Opening your lesson…</p>;
  if (isError || !data) return <div className="load-state" role="alert">Could not open your lesson. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div>;
  const index = currentStep ?? data.currentStep;
  const step = data.lesson.steps[index];
  if (!step) return <div className="load-state" role="alert">This lesson step is unavailable.</div>;
  const diagram = data.lesson.diagrams.find(item => item.id === step.diagramId)!;
  const citations = data.citations.filter(item => step.citationChunkIds.includes(item.id));
  function showSelection() {
    const selected = window.getSelection();
    const root = content.current;
    if (!selected || !root || selected.isCollapsed || !selected.anchorNode || !selected.focusNode ||
      !root.contains(selected.anchorNode) || !root.contains(selected.focusNode)) { setSelection(null); return; }
    const text = selected.toString().trim();
    if (!text) { setSelection(null); return; }
    const box = selected.getRangeAt(0).getBoundingClientRect();
    const parent = root.getBoundingClientRect();
    setSelection({ text, top: box.bottom - parent.top + 8, left: Math.max(8, Math.min(box.left - parent.left, parent.width - 95)) });
  }
  async function move(to: number) {
    setSelection(null); setTutorHighlights(undefined);
    setSaving(true); setSaveError(false);
    try { setCurrentStep(await saveLessonStep(data!.id, to)); }
    catch { setSaveError(true); }
    finally { setSaving(false); }
  }
  return <article className="lesson-view">
    <LessonStepRail sessionId={data.id} steps={data.lesson.steps} activeStep={index} disabled={saving}
      onStepSelect={position => { void move(position); }} />
    <Link className="lesson-back" to="/learn">← All topics</Link>
    <header className="lesson-heading"><span className="eyebrow">GUIDED LESSON</span><h1>{data.lesson.title}</h1>
      {data.lesson.sourceMode === 'unverified' && <p>Unverified source</p>}</header>
    <div className="lesson-layout"><div className="lesson-main"><LessonDiagram key={`${diagram.id}:${index}`} diagram={diagram} step={step} runningExample={data.lesson.runningExample} tutorHighlights={tutorHighlights} />
      <section ref={content} className="lesson-content" aria-labelledby="lesson-step-heading" onMouseUp={showSelection} onKeyUp={showSelection}><span className="eyebrow">STEP {index + 1}</span>
        {selection && <div className="tutor-selection-action" style={{ top: selection.top, left: selection.left }}><ButtonUi type="button" size="small" onMouseDown={event => event.preventDefault()} onClick={() => { setAnnotation(selection.text); setSelection(null); window.getSelection()?.removeAllRanges(); }}>Ask Tutor</ButtonUi></div>}
        <h2 id="lesson-step-heading">{step.heading}</h2><p>{step.caption}</p>
        <div className="lesson-explanation">{step.explanation.split(/\n\s*\n/u).filter(paragraph => paragraph.trim()).map((paragraph, position) => <p key={position}>{paragraph}</p>)}</div>
        <section className="lesson-breakdown"><h3>Technical breakdown</h3><p>{step.workedExample}</p></section>
        <aside className="lesson-mistake"><h3>Common mistake</h3><p>{step.commonMistake}</p></aside>
        {citations.length > 0 && <div className="lesson-sources"><h3>Sources for this step</h3><ul>{citations.map(citation => <li key={citation.id}>
          {/^https?:\/\//i.test(citation.url) ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.heading} ↗</a> : citation.heading}
        </li>)}</ul></div>}
        <div className="lesson-actions"><ButtonUi variant="quiet" disabled={saving || index === 0} onClick={() => { void move(index - 1); }}>Previous</ButtonUi>
          {index < data.lesson.steps.length - 1 && <ButtonUi disabled={saving} onClick={() => { void move(index + 1); }}>Next step</ButtonUi>}</div>
        {saveError && <p role="alert" className="form-error">Could not save your place. Please try again.</p>}
      </section></div><TutorPanel sessionId={data.id} stepId={step.id} citations={data.citations}
        annotation={annotation} onClearAnnotation={() => setAnnotation(undefined)} onHighlights={showTutorHighlights} /></div>
  </article>;
}
