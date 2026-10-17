import { createClient } from '@supabase/supabase-js';
import { type CompleteOnboarding, type HomeData, type Profile, type Recommendations, homeSchema, profileSchema } from '@learning-companion/shared';
import { ApiError } from './errors.js';

export type ProfileService = {
  getProfile: (accessToken: string) => Promise<Profile>;
  completeOnboarding?: (accessToken: string, input: CompleteOnboarding) => Promise<Profile>;
  getHome?: (accessToken: string) => Promise<HomeData>;
};

const dayMs = 24 * 60 * 60 * 1000;
const relatedAreas: Partial<Record<Profile['interests'][number], string[]>> = {
  web_communication: ['web_communication'], apis: ['apis'], databases: ['databases'],
  web_development: ['apis'],
};

export function recommend(concepts: HomeData['concepts'], profile: Profile,
  progressRows: { concept_id: string; learning_status: string; latest_completed_round_id: string | null;
    last_reviewed_at: string | null; updated_at: string }[],
  edges: { from_concept_id: string; to_concept_id: string }[], successStreaks: Map<string, number>): Recommendations {
  const progress = new Map(progressRows.map(row => [row.concept_id, row]));
  const status = (conceptId: string) => progress.get(conceptId)?.learning_status ?? 'not_assessed';
  const availableNew = concepts.filter(concept => concept.contentAvailable && concept.status === 'not_assessed');
  const preferred = profile.interests.map(interest => availableNew.find(concept =>
    (relatedAreas[interest] ?? []).includes(concept.area))).find(Boolean);
  const missingPrerequisite = preferred && availableNew.find(concept => edges.some(edge =>
    edge.from_concept_id === concept.id && edge.to_concept_id === preferred.id && status(concept.id) !== 'demonstrated_understanding'));
  const learnConcept = missingPrerequisite ?? preferred ?? null;
  const learn: Recommendations['learn'] = !learnConcept ? null : missingPrerequisite ? {
    conceptId: learnConcept.id, reasonCode: 'prerequisite',
    reason: `Start here first; it prepares you for ${preferred?.title}. You can still choose another topic.`,
  } : {
    conceptId: learnConcept.id, reasonCode: 'interest',
    reason: 'This available lesson connects with the interests you selected. You can still choose another topic.',
  };

  const now = Date.now();
  const rankedReview: (Recommendations['review'][number] & { priority: number })[] = [];
  for (const concept of concepts) {
    const row = progress.get(concept.id);
    if (!row) continue;
    if (row.learning_status === 'developing' && !row.latest_completed_round_id) {
      rankedReview.push({ conceptId: concept.id, reasonCode: 'finish_check',
        reason: 'Complete the check so the app can confirm what you need to practise.', dueAt: null, priority: 0 });
    } else if (row.learning_status === 'developing') {
      const dueAt = new Date(new Date(row.updated_at).getTime() + dayMs).toISOString();
      rankedReview.push({ conceptId: concept.id, reasonCode: 'developing',
        reason: 'Your completed check showed gaps, so this is your highest-priority review.', dueAt, priority: 1 });
    } else if (row.learning_status === 'explored') {
      rankedReview.push({ conceptId: concept.id, reasonCode: 'explored',
        reason: 'You explored this lesson but have not completed its understanding check.', dueAt: null, priority: 2 });
    } else if (row.learning_status === 'demonstrated_understanding') {
      const successStreak = successStreaks.get(concept.id) ?? 1;
      const intervalDays = successStreak <= 1 ? 1 : successStreak === 2 ? 3 : 7;
      const dueAt = new Date(new Date(row.last_reviewed_at ?? row.updated_at).getTime() + intervalDays * dayMs).toISOString();
      if (new Date(dueAt).getTime() <= now) rankedReview.push({ conceptId: concept.id, reasonCode: 'recall_due',
        reason: `Your ${intervalDays}-day recall review is due.`, dueAt, priority: 3 });
    }
  }
  rankedReview.sort((a, b) => a.priority - b.priority);
  return { learn, review: rankedReview.map(({ priority: _priority, ...item }) => item) };
}

export function createProfileService(
  url = process.env.SUPABASE_URL?.trim(),
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim(),
): ProfileService {
  if (!url || !publishableKey) {
    return { getProfile: async () => { throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Supabase is not configured.'); } };
  }
  const verifier = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return {
    async getProfile(accessToken) {
      const { data: { user }, error: authError } = await verifier.auth.getUser(accessToken);
      if (authError || !user || user.is_anonymous) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in with Google to continue.');
      // Database requests use the verified learner's JWT so RLS remains effective.
      // This client never receives a service-role key.
      const scoped = createClient(url, publishableKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: profile, error: profileError } = await scoped.from('profiles')
        .select('user_id,interests,experience_level,onboarding_complete,timezone,reduced_motion,created_at')
        .eq('user_id', user.id).single();
      if (profileError || !profile) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Your profile is temporarily unavailable.');
      return profileSchema.parse({
        userId: profile.user_id, isAnonymous: false,
        interests: profile.interests, experienceLevel: profile.experience_level,
        onboardingComplete: profile.onboarding_complete, timezone: profile.timezone,
        reducedMotion: profile.reduced_motion, createdAt: profile.created_at,
      });
    },
    async completeOnboarding(accessToken, input) {
      const profile = await this.getProfile(accessToken);
      const scoped = createClient(url, publishableKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error } = await scoped.from('profiles').update({
        interests: input.interests, experience_level: input.experienceLevel,
        timezone: input.timezone, diagnostic_evidence: input.answers,
        onboarding_complete: true, updated_at: new Date().toISOString(),
      }).eq('user_id', profile.userId);
      if (error) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not save your starting point.');
      return this.getProfile(accessToken);
    },
    async getHome(accessToken) {
      const profile = await this.getProfile(accessToken);
      const scoped = createClient(url, publishableKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const [catalogue, progress, sessions, availability, prerequisites, rounds] = await Promise.all([
        scoped.from('concepts').select('id,slug,title,area,objectives,catalogue_order,content_available').eq('supported', true).order('catalogue_order'),
        scoped.from('user_concept_progress').select('concept_id,learning_status,latest_completed_round_id,last_reviewed_at,updated_at').eq('owner_id', profile.userId),
        scoped.from('lesson_sessions').select('id,concept_id,created_at,completed_at').eq('owner_id', profile.userId)
          .eq('generation_state', 'ready').not('lesson->>runningExample', 'is', null)
          .order('created_at', { ascending: false }).limit(2000),
        scoped.rpc('available_lesson_concepts'),
        scoped.from('concept_edges').select('from_concept_id,to_concept_id').eq('relation_type', 'prerequisite').eq('reviewed', true),
        scoped.from('assessment_rounds').select('session_id,qualifies,completed_at').eq('owner_id', profile.userId)
          .not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(2000),
      ]);
      if (catalogue.error || progress.error || sessions.error || availability.error || prerequisites.error || rounds.error) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your learning choices.');
      const conceptIds = (catalogue.data ?? []).map(row => row.id as string);
      const sourceLinks = conceptIds.length ? await scoped.from('sources')
        .select('title,canonical_url,source_concepts!inner(concept_id)')
        .in('source_concepts.concept_id', conceptIds) : { data: [], error: null };
      if (sourceLinks.error) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load topic references.');
      const citationsByConcept = new Map<string, { title: string; url: string }[]>();
      for (const row of sourceLinks.data ?? []) {
        for (const link of row.source_concepts as { concept_id: string }[]) {
          const links = citationsByConcept.get(link.concept_id) ?? [];
          links.push({ title: row.title as string, url: row.canonical_url as string });
          citationsByConcept.set(link.concept_id, links);
        }
      }
      const ready = new Set((availability.data ?? []) as string[]);
      const generationReady = Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_MODEL?.trim() && process.env.DATABASE_URL?.trim());
      const statuses = new Map((progress.data ?? []).map(row => [row.concept_id as string, row.learning_status as string]));
      const latestByConcept = new Map<string, { id: string; completed: boolean }>();
      for (const row of sessions.data ?? []) {
        if (!latestByConcept.has(row.concept_id as string)) latestByConcept.set(row.concept_id as string,
          { id: row.id as string, completed: Boolean(row.completed_at) });
      }
      const concepts: HomeData['concepts'] = (catalogue.data ?? []).map(row => ({
        id: row.id as string, slug: row.slug as string, title: row.title as string,
        description: (row.objectives as { description: string }[])[0]?.description ?? null,
        objectives: (row.objectives as { description: string }[]).map(objective => objective.description),
        citations: citationsByConcept.get(row.id as string) ?? [],
        area: row.area as HomeData['concepts'][number]['area'], order: row.catalogue_order as number,
        contentAvailable: generationReady && ready.has(row.id as string),
        sessionId: latestByConcept.get(row.id as string)?.id ?? null,
        sessionCompleted: latestByConcept.get(row.id as string)?.completed ?? false,
        status: (statuses.get(row.id as string) ?? 'not_assessed') as HomeData['concepts'][number]['status'],
      }));
      const sessionConcepts = new Map((sessions.data ?? []).map(row => [row.id as string, row.concept_id as string]));
      const successStreaks = new Map<string, number>();
      const endedStreaks = new Set<string>();
      for (const round of rounds.data ?? []) {
        const conceptId = sessionConcepts.get(round.session_id as string);
        if (!conceptId || endedStreaks.has(conceptId)) continue;
        if (round.qualifies === true) successStreaks.set(conceptId, (successStreaks.get(conceptId) ?? 0) + 1);
        else endedStreaks.add(conceptId);
      }
      const recommendations = recommend(concepts, profile, progress.data ?? [], prerequisites.data ?? [], successStreaks);
      const activityByDate = new Map<string, number>();
      const activityStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      for (const row of sessions.data ?? []) {
        if ((row.created_at as string) < activityStart) continue;
        const date = (row.created_at as string).slice(0, 10);
        activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1);
      }
      const activityCounts = [...activityByDate].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
      const latest = sessions.data?.[0];
      const unfinished = sessions.data?.find(row => !row.completed_at);
      return homeSchema.parse({
        concepts, recommendations, activityCounts,
        recentSession: latest ? { id: latest.id as string, conceptId: latest.concept_id as string,
          createdAt: latest.created_at as string, completed: Boolean(latest.completed_at) } : null,
        unfinishedSession: unfinished ? { id: unfinished.id as string, conceptId: unfinished.concept_id as string } : null,
      });
    },
  };
}
