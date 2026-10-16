import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, BookOpen, BrainCircuit, CalendarDays, CircleHelp, Network, Sparkles } from 'lucide-react';
import { learningStatusLabels } from '@learning-companion/shared';
import { useSession } from '@/auth/session-context';
import { fetchHome, type ConceptChoice, type HomeData } from '@/lib/learning';
import ContributionSkyline from '@/components/ui/contribution-skyline';
import { ButtonUi, ButtonUiLink } from '@/components/ui/button-ui';
import { startLesson } from '@/lib/sessions';

const areaNames: Record<string, string> = { web_communication: 'WEB COMMUNICATION', apis: 'APIs', databases: 'DATABASES' };
function useHomeData() {
  const { session } = useSession();
  return useQuery({ queryKey: ['home', session?.userId], queryFn: fetchHome, enabled: Boolean(session) });
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
function StartLesson({ concept }: { concept: ConceptChoice }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (concept.sessionId) return <div className="lesson-start"><ButtonUiLink size="small" to={`/learn/${concept.sessionId}`}>
    {concept.sessionCompleted ? 'Review lesson materials' : 'Resume lesson'}</ButtonUiLink></div>;
  if (!concept.contentAvailable) return <p>Lesson unavailable right now</p>;
  async function start() {
    setStarting(true); setError(null);
    try {
      const saved = await startLesson(concept.id, crypto.randomUUID());
      void queryClient.invalidateQueries({ queryKey: ['home'] });
      navigate(`/learn/${saved.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare your lesson. Please try again.');
    } finally { setStarting(false); }
  }
  return <div className="lesson-start"><ButtonUi size="small" disabled={starting} onClick={() => { void start(); }}>
    {starting ? 'Preparing your lesson…' : 'Start lesson'}</ButtonUi>
    {starting && <span role="status">This may take a moment.</span>}
    {error && <p role="alert">{error} <ButtonUi variant="quiet" size="small" onClick={() => { void start(); }}>Try again</ButtonUi></p>}
  </div>;
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
    <div className="home-bottom"><span>{profile?.isAnonymous ? 'Your guest progress stays with this browser.' : 'Your learning progress is saved.'}</span><Link to="/map">View knowledge map <ArrowRight size={15} /></Link></div>
  </div>;
}

export function CatalogueView({ map = false }: { map?: boolean }) {
  const { data, isLoading, isError, refetch } = useHomeData();
  if (isLoading) return <p className="load-state" role="status">Loading topics…</p>;
  if (isError || !data) return <div className="load-state" role="alert">Could not load topics. <ButtonUi variant="quiet" size="small" onClick={() => { void refetch(); }}>Try again</ButtonUi></div>;
  return <div className="catalogue-view"><div className="page-intro"><span className="eyebrow">{map ? 'YOUR LEARNING PATH' : 'EXPLORE THE CATALOGUE'}</span><h1>{map ? 'Knowledge Map' : 'Choose what to learn'}</h1><p>{map ? 'See how the foundation topics connect and which ones you have explored.' : 'Start with a recommendation or follow your curiosity.'}</p></div>
    {['web_communication', 'apis', 'databases'].map(area => <section className="catalogue-area" key={area}><div className="catalogue-area-heading"><h2>{areaNames[area]}</h2><span>{data.concepts.filter(item => item.area === area).length} concepts</span></div><div className="catalogue-grid">{data.concepts.filter(item => item.area === area).map(item => <div className="catalogue-card" key={item.id}><ConceptCard concept={item} /><StartLesson concept={item} /></div>)}</div></section>)}
  </div>;
}
