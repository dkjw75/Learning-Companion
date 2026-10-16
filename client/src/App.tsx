import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import { BookOpenText, CircleUserRound } from 'lucide-react';
import { FoundationView } from '@/views/FoundationView';
import { OnboardingView } from '@/views/OnboardingView';
import { CatalogueView, HomeView } from '@/views/HomeView';
import { useSession } from '@/auth/session-context';
import { BackgroundAsciiWake } from '@/components/ui/background-ascii-wake';
import { ButtonUiLink } from '@/components/ui/button-ui';
import { LessonView } from '@/views/LessonView';

export function App() {
  const { session, profile, status } = useSession();
  const location = useLocation();
  const inProduct = Boolean(session && profile?.onboardingComplete && location.pathname !== '/');
  const gated = (view: React.ReactNode) => status === 'loading' ? <p role="status">Loading…</p> : !session || !profile ? <Navigate to="/" replace /> : !profile.onboardingComplete ? <Navigate to="/onboarding" replace /> : view;
  return <>
    <BackgroundAsciiWake reducedMotion={profile?.reducedMotion ?? false} />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header">
      <nav className="header-inner" aria-label="Main navigation">
        <Link className="brand" to={inProduct ? '/home' : '/'}><span className="brand-mark"><BookOpenText size={18} /></span> LearningCompanion</Link>
        {inProduct && <div className="main-links"><NavLink to="/home">Home</NavLink><NavLink to="/learn">Learn</NavLink><NavLink to="/map">Knowledge Map</NavLink></div>}
        {inProduct && <span className="profile-badge"><CircleUserRound size={19} /> {profile?.isAnonymous ? 'Guest' : 'My learning'}</span>}
      </nav>
    </header>
    <main id="main-content" className="app-main" tabIndex={-1} data-reduced-motion={profile?.reducedMotion || undefined}>
      <Routes>
        <Route path="/" element={<FoundationView />} />
        <Route path="/onboarding" element={status === 'loading' ? <p role="status">Loading…</p> : session && profile ? <OnboardingView /> : <Navigate to="/" replace />} />
        <Route path="/home" element={gated(<HomeView />)} />
        <Route path="/learn" element={gated(<CatalogueView />)} />
        <Route path="/learn/:sessionId" element={gated(<LessonView />)} />
        <Route path="/map" element={gated(<CatalogueView map />)} />
        <Route path="*" element={<>
          <h1 className="mb-3 text-3xl font-semibold">Page not found</h1>
          <p className="mb-5 text-muted-foreground">This page is not available.</p>
          <ButtonUiLink to="/">Back to LearningCompanion</ButtonUiLink>
        </>} />
      </Routes>
    </main>
  </>;
}
