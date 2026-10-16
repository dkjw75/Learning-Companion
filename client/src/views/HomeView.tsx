import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, BookOpen, BrainCircuit, CalendarDays, ChartNoAxesCombined, CircleHelp, Cloud, Code2, Cpu, Database, Minus, MonitorCog, Network, PanelsTopLeft, Plus, Shield, Sparkles, UserRound, X } from 'lucide-react';
import { learningStatusLabels } from '@learning-companion/shared';
import { useSession } from '@/auth/session-context';
import { fetchHome, type ConceptChoice, type HomeData } from '@/lib/learning';
import ContributionSkyline from '@/components/ui/contribution-skyline';
import { ButtonUi, ButtonUiLink } from '@/components/ui/button-ui';
import { startLesson } from '@/lib/sessions';

const areaNames: Record<string, string> = { web_communication: 'WEB COMMUNICATION', apis: 'APIs', databases: 'DATABASES' };
const skillBranches = [
  { title: 'Software Development', icon: Code2, lessons: ['what-an-api-does'] },
  { title: 'AI Engineering', icon: BrainCircuit, lessons: [] },
  { title: 'Cybersecurity', icon: Shield, lessons: [] },
  { title: 'Cloud Computing', icon: Cloud, lessons: [] },
  { title: 'Data Science and Analytics', icon: ChartNoAxesCombined, lessons: [] },
  { title: 'Databases and Data Engineering', icon: Database, lessons: ['tables-and-records'] },
  { title: 'Computer Networks', icon: Network, lessons: ['clients-and-servers', 'http-requests-and-responses'] },
  { title: 'Operating Systems', icon: MonitorCog, lessons: [] },
  { title: 'Hardware and Embedded Systems', icon: Cpu, lessons: [] },
  { title: 'Human-Computer Interaction', icon: PanelsTopLeft, lessons: [] },
];
const treeWidth = 2400;
const branchX = (index: number) => 210 + index * 220;
const statusOrder = ['not_assessed', 'explored', 'developing', 'demonstrated_understanding'] as const;
function useHomeData() {
  const { session } = useSession();
  return useQuery({ queryKey: ['home', session?.userId], queryFn: fetchHome, enabled: Boolean(session) });
}
function LessonAction({ concept }: { concept: ConceptChoice }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);
  const requestId = useRef<string | null>(null);

  if (concept.sessionId) return <ButtonUiLink to={`/learn/${concept.sessionId}`}>
    {concept.sessionCompleted ? 'Review lesson again' : 'Resume lesson'}
  </ButtonUiLink>;
  if (!concept.contentAvailable) return <p className="skill-lesson-unavailable">Lesson unavailable right now.</p>;

  async function start() {
    setStarting(true); setError(false);
    try {
      requestId.current ??= crypto.randomUUID();
      const saved = await startLesson(concept.id, requestId.current);
      void queryClient.invalidateQueries({ queryKey: ['home'] });
      navigate(`/learn/${saved.id}`);
    } catch { setError(true); }
    finally { setStarting(false); }
  }
  return <div className="skill-lesson-action"><ButtonUi disabled={starting} onClick={() => { void start(); }}>{starting ? 'Preparing lesson…' : 'Start lesson'}</ButtonUi>
    {error && <p role="alert">Could not prepare your lesson. <ButtonUi variant="quiet" size="small" onClick={() => { void start(); }}>Try again</ButtonUi></p>}
  </div>;
}
function ActivityPanel({ data }: { data: HomeData }) {
  return <section className="activity-panel" aria-labelledby="activity-heading">
    <div className="section-heading"><div><span className="eyebrow"><CalendarDays size={14} /> LEARNING HISTORY</span><h2 id="activity-heading">Your activity</h2><p>Lesson sessions started per day over the past year.</p></div></div>
    <div className="activity-chart-section"><ContributionSkyline activityCounts={data.activityCounts} /></div>
  </section>;
}
function ConceptCard({ concept, compact = false }: { concept: ConceptChoice; compact?: boolean }) {
  return <div className={`concept-row ${compact ? 'compact' : ''}`}><div className="concept-icon"><Network size={20} /></div><div><span className="concept-area">{areaNames[concept.area]}</span><h3>{concept.title}</h3><span className="status-text">{learningStatusLabels[concept.status as keyof typeof learningStatusLabels] ?? 'Not assessed'}</span></div></div>;
}
export function HomeView() {
  const { profile } = useSession();
  const { data, isLoading, isError, refetch } = useHomeData();
  if (isLoading) return <p className="load-state" role="status">Loading your home…</p>;
  if (isError || !data) return <div className="load-state" role="alert">Could not load your home. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div>;
  const recommended = data.concepts.find(item => item.id === data.recommendationId);
  const review = data.concepts.filter(item => data.reviewIds.includes(item.id));
  return <div className="home-view">
    <div className="page-intro"><span className="eyebrow"><Sparkles size={14} /> YOUR LEARNING SPACE</span><h1>Welcome back<span className="wave">✦</span></h1><p>Build connections, one concept at a time. Choose a path that feels right today.</p></div>
    <div className="home-grid">
      <section className="feature-card learn-card" aria-labelledby="learn-heading"><div className="card-topline"><span className="pill cyan">LEARN SOMETHING NEW</span><span className="pill subdued">ABOUT 15 MIN</span></div><h2 id="learn-heading">{recommended?.title ?? 'Choose a topic'}</h2><p>{recommended ? profile?.interests.includes(recommended.area as NonNullable<typeof profile>['interests'][number]) ? `You chose ${areaNames[recommended.area]?.toLowerCase()}; this is the first concept in that area. You can pick another topic.` : `A foundational topic in ${areaNames[recommended.area]?.toLowerCase()}. You can pick another topic.` : 'Explore a topic from the catalogue.'}</p>
        {recommended && <div className="mini-diagram" aria-hidden="true"><span><BookOpen size={22} /> Start here</span><i /><span><Network size={22} /> Connect ideas</span><i /><span><BrainCircuit size={22} /> Check understanding</span></div>}
        <div className="card-footer"><ButtonUiLink to="/learn">Browse topics</ButtonUiLink><span className="small-note">{recommended?.contentAvailable ? 'Lesson available' : 'Browse the learning path'}</span></div>
      </section>
      <section className="feature-card review-card" aria-labelledby="review-heading"><div className="card-topline"><span className="pill violet">REVIEW</span><span className="pill subdued">YOUR PACE</span></div><h2 id="review-heading">Strengthen what you know</h2><p>Return to explored concepts and practise gaps when you are ready.</p>
        <div className="review-list">{review.length > 0 ? review.slice(0, 2).map(item => <ConceptCard concept={item} compact key={item.id} />) : <div className="empty-review"><CircleHelp size={24} /><span>No concepts to review yet. Your explored topics will appear here.</span></div>}</div>
        <div className="card-footer"><ButtonUiLink variant="outline" to="/learn">Choose a concept</ButtonUiLink></div>
      </section>
    </div>
    <ActivityPanel data={data} />
    <div className="home-bottom"><span>{profile?.isAnonymous ? 'Your guest progress stays with this browser.' : 'Your learning progress is saved.'}</span><Link to="/learn">View skill tree <ArrowRight size={15} /></Link></div>
  </div>;
}

function SkillTree({ concepts }: { concepts: ConceptChoice[] }) {
  const viewport = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = concepts.find(concept => concept.id === selectedId);

  const zoom = useCallback((factor: number, clientX: number, clientY: number) => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    setView(current => {
      const scale = Math.min(2.5, Math.max(0.4, current.scale * factor));
      return { scale, x: x - (x - current.x) * scale / current.scale, y: y - (y - current.y) * scale / current.scale };
    });
  }, []);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let width = element.clientWidth;
    setView(current => ({ ...current, x: (width - treeWidth) / 2 }));
    const resize = () => {
      const nextWidth = element.clientWidth;
      setView(current => ({ ...current, x: current.x + (nextWidth - width) / 2 }));
      width = nextWidth;
    };
    const wheel = (event: WheelEvent) => {
      if ((event.target as Element).closest('.skill-detail-panel')) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX, event.clientY);
    };
    window.addEventListener('resize', resize);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { window.removeEventListener('resize', resize); element.removeEventListener('wheel', wheel); };
  }, [zoom]);

  return <section className="skill-tree-viewport" aria-label="Skill tree" ref={viewport} tabIndex={0}
    onPointerDown={event => {
      if (event.button !== 0 || (event.target as Element).closest('button,.skill-detail-panel')) return;
      drag.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add('dragging');
    }}
    onPointerMove={event => {
      if (!drag.current) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = { x: event.clientX, y: event.clientY };
      setView(current => ({ ...current, x: current.x + dx, y: current.y + dy }));
    }}
    onPointerUp={event => { drag.current = null; event.currentTarget.classList.remove('dragging'); }}
    onPointerCancel={event => { drag.current = null; event.currentTarget.classList.remove('dragging'); }}
    onKeyDown={event => {
      const moves: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
      const move = (event.target as Element).closest('.skill-detail-panel') ? undefined : moves[event.key];
      if (move) { event.preventDefault(); setView(current => ({ ...current, x: current.x + move[0], y: current.y + move[1] })); }
    }}>
    <div className="skill-tree-controls"><span>Drag to move · Scroll to zoom</span>
      <button type="button" aria-label="Zoom out" onClick={() => { const bounds = viewport.current?.getBoundingClientRect(); if (bounds) zoom(1 / 1.2, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); }}><Minus size={18} /></button>
      <button type="button" aria-label="Zoom in" onClick={() => { const bounds = viewport.current?.getBoundingClientRect(); if (bounds) zoom(1.2, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); }}><Plus size={18} /></button>
    </div>
    <div className="skill-status-legend" aria-label="Learning status legend">{statusOrder.map(status => <span key={status}><i className="skill-hex" data-status={status} />{learningStatusLabels[status]}</span>)}</div>
    <div className="skill-tree-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
      <svg className="skill-connections" viewBox="0 0 2400 560" aria-hidden="true">
        <path d="M 1200 115 V 160 M 210 160 H 2190" />
        {skillBranches.map((branch, index) => {
          const x = branchX(index);
          const count = branch.lessons.filter(slug => concepts.some(concept => concept.slug === slug)).length;
          return <path key={branch.title} d={`M ${x} 160 V 225${count ? ` M ${x} 315 V 360${count === 2 ? ` M ${x - 75} 360 H ${x + 75} M ${x - 75} 360 V 390 M ${x + 75} 360 V 390` : ` V 390`}` : ''}`} />;
        })}
      </svg>
      <div className="skill-tree-root skill-tree-node" style={{ left: 1200, top: 24 }}><span className="skill-hex"><UserRound size={24} /></span><strong>You</strong></div>
      <ul className="skill-branches">{skillBranches.map((branch, index) => {
        const lessons = branch.lessons.map(slug => concepts.find(concept => concept.slug === slug)).filter((concept): concept is ConceptChoice => Boolean(concept));
        return <li className="skill-branch skill-tree-node" key={branch.title} style={{ left: branchX(index), top: 225 }}><span className="skill-hex"><branch.icon size={21} /></span><h2>{branch.title}</h2>
          {lessons.length > 0 && <ul className="skill-leaves">{lessons.map((lesson, lessonIndex) => <li className="skill-tree-node" key={lesson.id} style={{ left: `calc(50% + ${lessons.length === 2 ? (lessonIndex === 0 ? -75 : 75) : 0}px)`, top: 165 }}><button className="skill-node-button" type="button" aria-pressed={selectedId === lesson.id} onClick={() => setSelectedId(lesson.id)}><span className="skill-hex" data-status={lesson.status}><BookOpen size={18} /></span><span>{lesson.title}</span><span className="sr-only">Learning status: {learningStatusLabels[lesson.status]}</span></button></li>)}</ul>}
        </li>;
      })}</ul>
    </div>
    {selected && <aside className="skill-detail-panel" aria-labelledby="skill-detail-title"><div className="skill-detail-head"><span className="eyebrow">LESSON DETAILS</span><span className="skill-status-badge" data-status={selected.status}>{learningStatusLabels[selected.status]}</span></div>
      <button type="button" className="skill-detail-close" aria-label="Close lesson details" onClick={() => setSelectedId(null)}><X size={19} /></button>
      <h2 id="skill-detail-title">{selected.title}</h2><p>{selected.description ?? 'Description unavailable.'}</p>
      <section className="skill-detail-section"><h3>Objectives</h3>
        {selected.objectives.length ? <ul>{selected.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul> : <p>Objectives unavailable.</p>}
      </section>
      <section className="skill-detail-section"><h3>Citations</h3>
        {selected.citations.length ? <ul>{selected.citations.map(citation => <li key={citation.url}>{/^https?:\/\//i.test(citation.url) ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.title} ↗</a> : citation.title}</li>)}</ul> : <p>No citations available yet.</p>}
      </section>
      <div className="skill-detail-action"><LessonAction key={selected.id} concept={selected} /></div>
    </aside>}
  </section>;
}

export function CatalogueView() {
  const { data, isLoading, isError, refetch } = useHomeData();
  return <div className="catalogue-view"><div className="page-intro"><span className="eyebrow">EXPLORE THE CATALOGUE</span><h1>Choose what to learn</h1><p>Start with a recommendation or follow your curiosity.</p></div>
    {isLoading ? <p className="load-state" role="status">Loading topics…</p> : isError || !data ? <div className="load-state" role="alert">Could not load topics. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div> : <SkillTree concepts={data.concepts} />}
  </div>;
}
