import { useState } from 'react';
import { Navigate } from 'react-router';
import { ButtonUi } from '@/components/ui/button-ui';
import { Card, CardContent } from '@/components/ui/card';
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

  return <div className="max-w-3xl">
    <section aria-labelledby="intro-heading">
      <p className="eyebrow mb-5">Visual technology learning</p>
      <h1 id="intro-heading" className="mb-6 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Connect concepts.<br />Build understanding.</h1>
      <Card className="mt-8">
        <CardContent>
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
          <div role="tabpanel" id={`${tab}-panel`} aria-labelledby={`${tab}-tab`} className="auth-panel">
            <h2 className="mb-3 text-lg font-semibold">{tab === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mb-5 text-muted-foreground">{tab === 'login' ? 'Continue your learning with Google.' : 'Sign up with Google to get started.'}</p>
            <ButtonUi disabled={pending || status !== 'ready'} onClick={() => { void continueWithGoogle(); }}>
              {pending ? 'Opening Google…' : 'Continue with Google'}
            </ButtonUi>
            {status === 'unconfigured' && <p role="alert" className="mt-4 text-destructive">Sign-in is unavailable right now. Please try again later.</p>}
            {error && <p role="alert" className="mt-4 text-destructive">Could not sign in with Google. Please try again.</p>}
          </div>
        </CardContent>
      </Card>
    </section>
  </div>;
}
