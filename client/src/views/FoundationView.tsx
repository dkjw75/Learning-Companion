import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowRight, BookOpen, CircleCheck, Compass } from 'lucide-react';
import { ButtonUi } from '@/components/ui/button-ui';
import { useSession } from '@/auth/session-context';

export function FoundationView() {
  const { session, profile, status, signInWithGoogle } = useSession();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  if (session && profile) return <Navigate to={profile.onboardingComplete ? '/home' : '/onboarding'} replace />;

  async function continueWithGoogle() {
    setPending(true);
    setError(false);
    try {
      await signInWithGoogle();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return <div className="landing-page">
    <aside className="landing-visual" aria-label="How learning works">
      <Link className="landing-brand" to="/"><img src="/logo.svg" alt="" /> LearningCompanion</Link>
      <div className="landing-visual-body">
        <p className="landing-visual-kicker">A clearer path through tech</p>
        <h2>Learn at your own pace.</h2>
        <p>Choose what interests you, learn through visual lessons, and revisit ideas as you grow.</p>
        <div className="landing-infographic" role="img" aria-label="Choose a topic, learn through a visual lesson, then check and review your understanding">
          <div className="landing-flow-node"><span><Compass size={32} /></span><strong>Explore</strong><small>Choose a topic</small></div>
          <ArrowRight className="landing-flow-arrow" size={24} aria-hidden="true" />
          <div className="landing-flow-node"><span><BookOpen size={32} /></span><strong>Learn</strong><small>Visual lessons</small></div>
          <ArrowRight className="landing-flow-arrow" size={24} aria-hidden="true" />
          <div className="landing-flow-node"><span><CircleCheck size={32} /></span><strong>Review</strong><small>Check your progress</small></div>
        </div>
        <div className="landing-steps"><span><b>01</b> Browse the skill tree</span><span><b>02</b> Follow guided steps</span><span><b>03</b> Revisit what matters</span></div>
      </div>
      <p className="landing-visual-footer">Build understanding that lasts.</p>
    </aside>
    <section className="landing-entry" aria-labelledby="intro-heading">
      <div className="landing-entry-inner">
        <p className="landing-entry-kicker">YOUR LEARNING STARTS HERE</p>
        <h1 id="intro-heading">Connect concepts.<br />Build understanding.</h1>
        <p className="landing-entry-description">Explore the learning tree, follow short visual lessons, and check your understanding along the way.</p>
        <div className="landing-auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account access" onKeyDown={event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const next = tab === 'login' ? 'register' : 'login';
            setTab(next);
            setError(false);
            event.currentTarget.querySelector<HTMLButtonElement>(`[aria-controls="${next}-panel"]`)?.focus();
          }}>
            <button type="button" role="tab" id="login-tab" aria-controls="login-panel" aria-selected={tab === 'login'} tabIndex={tab === 'login' ? 0 : -1} onClick={() => { setTab('login'); setError(false); }}>Log in</button>
            <button type="button" role="tab" id="register-tab" aria-controls="register-panel" aria-selected={tab === 'register'} tabIndex={tab === 'register' ? 0 : -1} onClick={() => { setTab('register'); setError(false); }}>Register</button>
          </div>
          <form role="tabpanel" id={`${tab}-panel`} aria-labelledby={`${tab}-tab`} className="auth-panel" onSubmit={event => { event.preventDefault(); void continueWithGoogle(); }}>
            <h2>{tab === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>{tab === 'login' ? 'Sign in to continue where you left off.' : 'Create an account to save your learning.'}</p>
            <ButtonUi className="landing-google-button" type="submit" disabled={pending || status !== 'ready'}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>
              {pending ? 'Opening Google…' : 'Continue with Google'}
            </ButtonUi>
            {status === 'unconfigured' && <p role="alert" className="mt-4 text-destructive">Sign-in is unavailable right now. Please try again later.</p>}
            {error && <p role="alert" className="mt-4 text-destructive">Could not sign in with Google. Please try again.</p>}
          </form>
          <div className="landing-auth-footer">{tab === 'login' ? 'New to LearningCompanion?' : 'Already have an account?'} <button type="button" onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(false); }}>{tab === 'login' ? 'Register' : 'Log in'}</button></div>
        </div>
        <p className="landing-entry-footer">Your progress is saved to your account.</p>
      </div>
    </section>
  </div>;
}
