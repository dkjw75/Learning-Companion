import { expect, it } from 'vitest';
import type { HomeData, Profile } from '@learning-companion/shared';
import { recommend } from './auth.js';

it('prioritizes the first selected interest over catalogue order', () => {
  const profile: Profile = {
    userId: '00000000-0000-4000-8000-000000000901', isAnonymous: false,
    interests: ['databases', 'web_development'], experienceLevel: 'new', onboardingComplete: true,
    timezone: 'UTC', reducedMotion: false, createdAt: '2026-10-17T00:00:00Z',
  };
  const concepts: HomeData['concepts'] = [
    { id: 'api', slug: 'what-an-api-does', title: 'APIs', description: null, objectives: [], citations: [],
      area: 'apis', order: 1, contentAvailable: true, sessionId: null, sessionCompleted: false, status: 'not_assessed' },
    { id: 'database', slug: 'tables-and-records', title: 'Tables', description: null, objectives: [], citations: [],
      area: 'databases', order: 2, contentAvailable: true, sessionId: null, sessionCompleted: false, status: 'not_assessed' },
  ];
  expect(recommend(concepts, profile, [], [], new Map()).learn?.conceptId).toBe('database');
  expect(recommend(concepts, { ...profile, interests: ['cybersecurity', 'operating_systems', 'ui_ux'] }, [], [], new Map()).learn).toBeNull();
});
