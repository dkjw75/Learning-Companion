import { Link, Route, Routes } from 'react-router';
import { FoundationView } from '@/views/FoundationView';
import { buttonVariants } from '@/components/ui/button';

export function App() {
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="border-b bg-card">
      <nav className="mx-auto max-w-6xl px-5 py-4" aria-label="Main navigation">
        <Link className="text-xl font-bold text-primary" to="/">LearningCompanion</Link>
      </nav>
    </header>
    <main id="main-content" className="mx-auto max-w-6xl px-5 py-12" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<FoundationView />} />
        <Route path="*" element={<>
          <h1 className="mb-3 text-3xl font-semibold">Page not found</h1>
          <p className="mb-5 text-muted-foreground">This page is not available.</p>
          <Link className={buttonVariants()} to="/">Back to LearningCompanion</Link>
        </>} />
      </Routes>
    </main>
  </>;
}
