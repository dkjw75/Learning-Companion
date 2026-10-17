import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSession } from '@/auth/session-context';

export function AuthCallbackView() {
  const { finishGoogleSignIn } = useSession();
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError(true);
      return;
    }
    void finishGoogleSignIn(code).then(profile => {
      navigate(profile.onboardingComplete ? '/home' : '/onboarding', { replace: true });
    }).catch(() => setError(true));
  }, [finishGoogleSignIn, navigate]);

  return <section aria-live="polite">
    {error ? <><h1>Could not complete sign-in</h1><p>Please try again.</p><Link to="/">Back to sign-in</Link></>
      : <p role="status">Signing you in…</p>}
  </section>;
}
