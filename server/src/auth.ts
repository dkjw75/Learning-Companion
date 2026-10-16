import { createClient } from '@supabase/supabase-js';
import { type CompleteOnboarding, type HomeData, type Profile, homeSchema, profileSchema } from '@learning-companion/shared';
import { ApiError } from './errors.js';

export type ProfileService = {
  getProfile: (accessToken: string) => Promise<Profile>;
  completeOnboarding?: (accessToken: string, input: CompleteOnboarding) => Promise<Profile>;
  getHome?: (accessToken: string) => Promise<HomeData>;
};

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
      if (authError || !user) throw new ApiError(401, 'UNAUTHENTICATED', 'A valid session is required.');
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
        userId: profile.user_id, isAnonymous: user.is_anonymous === true,
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
      const [catalogue, progress, sessions, availability] = await Promise.all([
        scoped.from('concepts').select('id,slug,title,area,catalogue_order,content_available').eq('supported', true).order('catalogue_order'),
        scoped.from('user_concept_progress').select('concept_id,learning_status').eq('owner_id', profile.userId),
        scoped.from('lesson_sessions').select('id,concept_id,created_at,completed_at').eq('owner_id', profile.userId)
          .eq('generation_state', 'ready').not('lesson->>runningExample', 'is', null)
          .order('created_at', { ascending: false }).limit(2000),
        scoped.rpc('available_lesson_concepts'),
      ]);
      if (catalogue.error || progress.error || sessions.error || availability.error) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your learning choices.');
      const ready = new Set((availability.data ?? []) as string[]);
      const generationReady = Boolean(process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_MODEL?.trim() && process.env.DATABASE_URL?.trim());
      const statuses = new Map((progress.data ?? []).map(row => [row.concept_id as string, row.learning_status as string]));
      const latestByConcept = new Map<string, string>();
      for (const row of sessions.data ?? []) {
        if (!latestByConcept.has(row.concept_id as string)) latestByConcept.set(row.concept_id as string, row.id as string);
      }
      const concepts = (catalogue.data ?? []).map(row => ({
        id: row.id as string, slug: row.slug as string, title: row.title as string,
        area: row.area as string, order: row.catalogue_order as number,
        contentAvailable: generationReady && ready.has(row.id as string),
        sessionId: latestByConcept.get(row.id as string) ?? null,
        status: statuses.get(row.id as string) ?? 'not_assessed',
      }));
      const preferred = concepts.filter(concept => profile.interests.includes(concept.area as Profile['interests'][number]));
      const recommendation = [...preferred, ...concepts].find(concept => concept.status === 'not_assessed') ?? null;
      const reviewIds = concepts.filter(concept => ['explored', 'developing'].includes(concept.status)).map(concept => concept.id);
      const activityByDate = new Map<string, number>();
      const activityStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      for (const row of sessions.data ?? []) {
        if ((row.created_at as string) < activityStart) continue;
        const date = (row.created_at as string).slice(0, 10);
        activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1);
      }
      const activityCounts = [...activityByDate].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
      const latest = sessions.data?.[0];
      return homeSchema.parse({
        concepts, recommendationId: recommendation?.id ?? null, reviewIds, activityCounts,
        recentSession: latest ? { id: latest.id as string, conceptId: latest.concept_id as string,
          createdAt: latest.created_at as string, completed: Boolean(latest.completed_at) } : null,
      });
    },
  };
}
