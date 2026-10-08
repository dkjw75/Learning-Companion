import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSession } from '@/auth/session-context';

export function FoundationView() {
  const guest = useSession();
  return <div className="max-w-3xl">
    <section aria-labelledby="intro-heading">
      <p className="eyebrow mb-5">Visual technology learning</p>
      <h1 id="intro-heading" className="mb-6 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Connect concepts.<br />Build understanding.</h1>
      <p className="text-lg text-muted-foreground">A place to explore how web applications, APIs, and databases fit together.</p>
      <Card className="mt-8">
        <CardContent>
          <h2 className="mb-3 text-lg font-semibold">Start with a guest profile</h2>
          <p className="mb-5 text-muted-foreground">Explore how web applications, APIs, and databases connect. Your guest progress stays with this browser until you choose to sign in later.</p>
          {guest.status === 'loading' && <p role="status">Loading…</p>}
          {guest.status === 'unconfigured' && <>
            <p role="status" className="mb-4 text-muted-foreground">Starting as a guest is unavailable right now. Please try again later.</p>
            <Button disabled>Start as guest</Button>
          </>}
          {guest.status === 'ready' && guest.session && <p role="status" className="font-semibold text-primary">Your progress is saved in this browser.</p>}
          {guest.status === 'ready' && !guest.session && <Button disabled={guest.starting} onClick={() => { void guest.startGuest(); }}>
            {guest.starting ? 'Starting…' : 'Start as guest'}
          </Button>}
          {guest.error && <p role="alert" className="mt-4 text-destructive">{guest.error}</p>}
        </CardContent>
      </Card>
    </section>
  </div>;
}
