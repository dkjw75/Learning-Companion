import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { SessionProvider } from '@/auth/session-context';
import { App } from '@/App';
import './style.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing.');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter><App /></BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
