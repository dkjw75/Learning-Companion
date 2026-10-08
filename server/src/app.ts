import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import { type ApiErrorCode, type Health, type SuccessEnvelope, errorEnvelopeSchema } from '@learning-companion/shared';
import { createProfileService, type ProfileService } from './auth.js';
import { ApiError } from './errors.js';

export function createApp(profileService: ProfileService = createProfileService()) {
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
  app.get('/api/me', async (req, res) => {
    const authorization = req.get('Authorization');
    const token = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/.exec(authorization ?? '')?.[1];
    if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'A bearer session is required.');
    res.json({ data: await profileService.getProfile(token) });
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
