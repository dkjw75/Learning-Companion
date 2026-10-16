import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import type { DiagramSpec, LessonStep } from '@learning-companion/shared';
import { AppWindow, ArrowLeftRight, Boxes, Braces, Database, KeyRound, Laptop, Network, Server, Smartphone, Table2 } from 'lucide-react';
import { ButtonUi } from '@/components/ui/button-ui';
import { fetchLesson, saveLessonStep } from '@/lib/sessions';

const icons = { client: Laptop, server: Server, api: Network, database: Database, table: Table2,
  json: Braces, security: KeyRound, mobile: Smartphone, web: AppWindow, exchange: ArrowLeftRight, generic: Boxes };
function Diagram({ diagram, step }: { diagram: DiagramSpec; step: LessonStep }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPart = diagram.nodes.find(part => part.id === selected) ?? diagram.edges.find(part => part.id === selected);
  if (diagram.type === 'table') return <section className="lesson-diagram" aria-label={diagram.title}>
    <h3>{diagram.title}</h3><div className="lesson-table-scroll"><table><thead><tr>{diagram.table.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
      <tbody>{diagram.table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}><button type="button"
        aria-label={`Row ${index + 1}, ${diagram.table.columns[cellIndex]}: ${cell}`}
        aria-pressed={selected === `${index}:${cellIndex}`}
        onClick={() => setSelected(selected === `${index}:${cellIndex}` ? null : `${index}:${cellIndex}`)}>{cell}</button></td>)}</tr>)}</tbody></table></div>
    {selected && <p className="diagram-selection" role="status">Selected: {diagram.table.columns[Number(selected.split(':')[1])]} — {diagram.table.rows[Number(selected.split(':')[0])]?.[Number(selected.split(':')[1])]}</p>}
  </section>;
  return <section className={`lesson-diagram ${diagram.type}`} aria-label={diagram.title}>
    <h3>{diagram.title}</h3>
    <div className="diagram-nodes">{diagram.nodes.map(node => {
      const Icon = icons[node.icon ?? 'generic'];
      return <button type="button" key={node.id}
        className={`diagram-node ${step.highlightNodeIds.includes(node.id) ? 'highlight' : 'inactive'} ${selected === node.id ? 'selected' : ''}`}
        aria-label={`${node.label}: ${node.description}`} aria-pressed={selected === node.id}
        onClick={() => setSelected(selected === node.id ? null : node.id)}>
        <span className="diagram-icon" aria-hidden="true"><Icon size={32} strokeWidth={1.6} /></span>
        <strong>{node.label}</strong></button>;
    })}</div>
    {diagram.edges.length > 0 && <div className="diagram-edges" aria-label="Connections">{diagram.edges.map(edge => <button type="button" key={edge.id}
      className={`diagram-edge ${step.highlightEdgeIds.includes(edge.id) ? 'highlight' : 'inactive'} ${selected === edge.id ? 'selected' : ''}`}
      aria-pressed={selected === edge.id} onClick={() => setSelected(selected === edge.id ? null : edge.id)}>
      <span>{diagram.nodes.find(node => node.id === edge.from)?.label}</span><span aria-hidden="true">→</span>
      <strong>{edge.label}</strong><span aria-hidden="true">→</span><span>{diagram.nodes.find(node => node.id === edge.to)?.label}</span>
    </button>)}</div>}
    {selectedPart && <p className="diagram-selection" role="status">{selectedPart.label}{'description' in selectedPart ? `: ${selectedPart.description}` : ''}</p>}
  </section>;
}

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
      <p>Step {index + 1} of {data.lesson.steps.length}</p></header>
    <nav className="lesson-steps" aria-label="Lesson steps">{data.lesson.steps.map((item, position) => <button key={item.id}
      type="button" aria-current={position === index ? 'step' : undefined} disabled={saving}
      onClick={() => { void move(position); }}>{position + 1}. {item.heading}</button>)}</nav>
    <div className="lesson-layout"><Diagram key={`${diagram.id}:${index}`} diagram={diagram} step={step} />
      <section className="lesson-content" aria-labelledby="lesson-step-heading"><span className="eyebrow">STEP {index + 1}</span>
        <h2 id="lesson-step-heading">{step.heading}</h2><p>{step.caption}</p>
        <div className="lesson-depth">
          <details><summary>Understand this step</summary><p>{step.explanation}</p></details>
          <details><summary>Worked example</summary><p>{step.workedExample}</p></details>
          <details><summary>Common mistake</summary><p>{step.commonMistake}</p></details>
        </div>
        {citations.length > 0 && <div className="lesson-sources"><h3>Sources for this step</h3><ul>{citations.map(citation => <li key={citation.id}>
          {/^https?:\/\//i.test(citation.url) ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.heading} ↗</a> : citation.heading}
        </li>)}</ul></div>}
        <div className="lesson-actions"><ButtonUi variant="quiet" disabled={saving || index === 0} onClick={() => { void move(index - 1); }}>Previous</ButtonUi>
          {index < data.lesson.steps.length - 1 && <ButtonUi disabled={saving} onClick={() => { void move(index + 1); }}>Next step</ButtonUi>}</div>
        {index === data.lesson.steps.length - 1 && <p className="lesson-finished">You have reached the end of this lesson.</p>}
        {saveError && <p role="alert" className="form-error">Could not save your place. Please try again.</p>}
      </section></div>
  </article>;
}
