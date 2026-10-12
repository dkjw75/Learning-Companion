import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import { type ApiErrorCode, type Health, type SuccessEnvelope, completeOnboardingSchema, errorEnvelopeSchema } from '@learning-companion/shared';
import { createProfileService, type ProfileService } from './auth.js';
import { ApiError } from './errors.js';
import type { LocalRunsService } from './ai-runs.js';

export function createApp(profileService: ProfileService = createProfileService(),
  localRuns?: LocalRunsService) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    // Generate our own ID; never trust or reflect arbitrary caller headers.
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-Id', res.locals.requestId as string);
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => {
    const response: SuccessEnvelope<Health> = { data: { status: 'ok', service: 'learning-companion-api' } };
    res.json(response);
  });
  if (localRuns) {
    app.get('/api/runs', async (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.json({ data: await localRuns.list() });
    });
    app.get('/api/runs/:id', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
        throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
      }
      const run = await localRuns.get(req.params.id);
      if (!run) throw new ApiError(404, 'NOT_FOUND', 'Resource not found.');
      res.json({ data: run });
    });
  }
  const tokenFrom = (authorization: string | undefined) => {
    const token = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/.exec(authorization ?? '')?.[1];
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'A bearer session is required.');
    return token;
  };
  app.get('/api/me', async (req, res) => {
    const token = tokenFrom(req.get('Authorization'));
    res.json({ data: await profileService.getProfile(token) });
  });
  app.post('/api/onboarding/diagnostic', async (req, res) => {
    const token = tokenFrom(req.get('Authorization'));
    const parsed = completeOnboardingSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose your interests and answer all five questions, or skip the check.');
    if (!profileService.completeOnboarding) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not save your starting point.');
    res.json({ data: await profileService.completeOnboarding(token, parsed.data) });
  });
  app.get('/api/home', async (req, res) => {
    const token = tokenFrom(req.get('Authorization'));
    if (!profileService.getHome) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your learning choices.');
    res.json({ data: await profileService.getHome(token) });
  });
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Resource not found.')));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    let status = 500;
    let code: ApiErrorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    if (error instanceof ApiError) {
      ({ status, code, message } = error);
    } else if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'entity.parse.failed') {
        status = 400; code = 'INVALID_INPUT'; message = 'Request body must be valid JSON.';
      } else if (error.type === 'entity.too.large') {
        status = 400; code = 'INVALID_INPUT'; message = 'Request body exceeds the size limit.';
      }
    }
    res.status(status).json(errorEnvelopeSchema.parse({ error: { code, message, requestId: res.locals.requestId } }));
  };
  app.use(errorHandler);
  return app;
}
