import { homeEnvelopeSchema, type CompleteOnboarding, type HomeData, type LearningStatus, type Profile } from '@learning-companion/shared';
import { getSupabaseClient } from '@/auth/supabase';

export type ConceptChoice = HomeData['concepts'][number];
export type { HomeData };
export type SavedTopicNode = { id: string; parentKey: string; title: string; objective: string;
  status: LearningStatus; sessionId: string | null; citations: { title: string; url: string }[] };

async function authorized<T>(path: string, init?: RequestInit): Promise<T> {
  const client = getSupabaseClient();
  const { data: { session } } = await client?.auth.getSession() ?? { data: { session: null } };
  if (!session) throw new Error('Your guest session could not be restored. Please try again.');
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...init?.headers },
    signal: init?.signal ?? AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Could not save or load your learning choices. Please try again.');
  const body = await response.json() as { data: T };
  return body.data;
}

export const saveOnboarding = (input: CompleteOnboarding) => authorized<Profile>('/onboarding/diagnostic', {
  method: 'POST', body: JSON.stringify(input),
});
export const fetchHome = async () => homeEnvelopeSchema.parse({ data: await authorized<unknown>('/home') }).data;
export const fetchTopics = () => authorized<SavedTopicNode[]>('/topics');
export const suggestTopics = (parentKey: string, requestId: string, prompt?: string) => authorized<SavedTopicNode[]>('/topics/suggestions', {
  method: 'POST', body: JSON.stringify({ parentKey, requestId, ...(prompt ? { prompt } : {}) }), signal: AbortSignal.timeout(65000),
});
export const discoverTopicSources = (nodeId: string) => authorized<{ urls: string[]; ready: boolean }>(`/topics/${nodeId}/discover`, {
  method: 'POST', signal: AbortSignal.timeout(140000),
});
