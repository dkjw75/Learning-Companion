import { useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router';
import { CircleUserRound, LogOut } from 'lucide-react';
import { FoundationView } from '@/views/FoundationView';
import { OnboardingView } from '@/views/OnboardingView';
import { CatalogueView, HomeView } from '@/views/HomeView';
import { useSession } from '@/auth/session-context';
import { BackgroundAsciiWake } from '@/components/ui/background-ascii-wake';
import { ButtonUiLink } from '@/components/ui/button-ui';
import { LessonView } from '@/views/LessonView';
import { QuizView } from '@/views/QuizView';
import { AuthCallbackView } from '@/views/AuthCallbackView';

function AccountActions({ displayName }: { displayName: string }) {
  const { signOut } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function leave() {
    setPending(true);
    setError(false);
    try { await signOut(); }
    catch { setError(true); }
    finally { setPending(false); }
  }
  return <div className="account-actions">
    <span className="profile-badge"><CircleUserRound size={19} /><span className="profile-name" title={displayName}>{displayName}</span></span>
    <button type="button" className="sign-out-button" disabled={pending} onClick={() => { void leave(); }}><LogOut size={16} /> {pending ? 'Signing out…' : 'Sign out'}</button>
    {error && <span className="account-error" role="alert">Could not sign out. Please try again.</span>}
  </div>;
}

export function App() {
  const { session, profile, status } = useSession();
  const location = useLocation();
  const landing = location.pathname === '/';
  const inProduct = Boolean(session && profile?.onboardingComplete && location.pathname !== '/');
  const gated = (view: React.ReactNode) => status === 'loading' ? <p role="status">Loading…</p> : !session || !profile ? <Navigate to="/" replace /> : !profile.onboardingComplete ? <Navigate to="/onboarding" replace /> : view;
  return <>
    {!landing && <BackgroundAsciiWake reducedMotion={profile?.reducedMotion ?? false} />}
    <a className="skip-link" href="#main-content">Skip to content</a>
    {!landing && <header className="app-header">
      <nav className="header-inner" aria-label="Main navigation">
        <Link className="brand" to={inProduct ? '/home' : '/'}><img className="brand-mark" src="/logo.svg" alt="" /> LearningCompanion</Link>
        {inProduct && <div className="main-links"><NavLink to="/home">Home</NavLink><NavLink to="/learn">Learn</NavLink></div>}
        {session && profile && <AccountActions displayName={session.displayName} />}
      </nav>
    </header>}
    <main id="main-content" className={`app-main${landing ? ' landing-main' : ''}`} tabIndex={-1} data-reduced-motion={profile?.reducedMotion || undefined}>
      <Routes>
        <Route path="/" element={<FoundationView />} />
        <Route path="/auth/callback" element={<AuthCallbackView />} />
        <Route path="/onboarding" element={status === 'loading' ? <p role="status">Loading…</p> : session && profile ? <OnboardingView /> : <Navigate to="/" replace />} />
        <Route path="/home" element={gated(<HomeView />)} />
        <Route path="/learn" element={gated(<CatalogueView />)} />
        <Route path="/learn/:sessionId" element={gated(<LessonView />)} />
        <Route path="/learn/:sessionId/quiz" element={gated(<QuizView />)} />
        <Route path="/map" element={<Navigate to="/learn" replace />} />
        <Route path="*" element={<>
          <h1 className="mb-3 text-3xl font-semibold">Page not found</h1>
          <p className="mb-5 text-muted-foreground">This page is not available.</p>
          <ButtonUiLink to="/">Back to LearningCompanion</ButtonUiLink>
        </>} />
      </Routes>
    </main>
  </>;
}
