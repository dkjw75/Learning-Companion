import { createClient } from '@supabase/supabase-js';
import { type Profile, profileSchema } from '@learning-companion/shared';
import { ApiError } from './errors.js';

export type ProfileService = { getProfile: (accessToken: string) => Promise<Profile> };

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
  };
}
