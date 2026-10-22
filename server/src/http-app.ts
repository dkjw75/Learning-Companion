import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import { type ApiErrorCode, type Health, type SuccessEnvelope, completeOnboardingSchema, errorEnvelopeSchema, hintRequestSchema, submitAnswerRequestSchema, tutorRequestSchema } from '@learning-companion/shared';
import { createProfileService, type ProfileService } from './auth.js';
import { ApiError } from './errors.js';
import type { LocalRunsService } from './ai-runs.js';
import { AiOperationError } from './ai.js';
import type { GenerationService } from './generation.js';
import { createAssessmentService, type AssessmentService } from './assessment.js';
import { z } from 'zod';
import type { TopicSuggestionService } from './topic-suggestions.js';
import type { TutorService } from './tutor.js';

export function createApp(profileService: ProfileService = createProfileService(),
  localRuns?: LocalRunsService, generationService?: GenerationService,
  assessmentService: AssessmentService = createAssessmentService(),
  topicSuggestionService?: TopicSuggestionService, tutorService?: TutorService) {
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
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose your interests and experience level before continuing.');
    if (!profileService.completeOnboarding) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not save your starting point.');
    res.json({ data: await profileService.completeOnboarding(token, parsed.data) });
  });
  app.get('/api/home', async (req, res) => {
    const token = tokenFrom(req.get('Authorization'));
    if (!profileService.getHome) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your learning choices.');
    res.json({ data: await profileService.getHome(token) });
  });
  app.get('/api/recommendations', async (req, res) => {
    const token = tokenFrom(req.get('Authorization'));
    if (!profileService.getHome) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your recommendations.');
    res.json({ data: (await profileService.getHome(token)).recommendations });
  });
  app.get('/api/topics', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!topicSuggestionService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your topics.');
    const profile = await profileService.getProfile(token);
    try { res.json({ data: await topicSuggestionService.list(profile.userId) }); }
    catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not load your topics.'); }
  });
  app.post('/api/topics/suggestions', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    const parsed = z.strictObject({ parentKey: z.string().trim().min(6).max(160), requestId: z.uuid(),
      prompt: z.string().trim().min(1).max(300).optional() }).safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose a topic or enter what you want to learn.');
    if (!profileService.getHome || !topicSuggestionService)
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not suggest topics right now.');
    const [profile, home] = await Promise.all([profileService.getProfile(token), profileService.getHome(token)]);
    try {
      res.json({ data: await topicSuggestionService.suggest(profile, home, parsed.data.parentKey,
        parsed.data.requestId, parsed.data.prompt) });
    } catch (error) {
      if (!(error instanceof AiOperationError)) throw error;
      const status = error.code === 'QUOTA' ? 429 : error.code === 'TIMEOUT' ? 504
        : ['IDEMPOTENCY_CONFLICT', 'PENDING', 'PREVIOUS_FAILURE'].includes(error.code) ? 409 : 503;
      throw new ApiError(status, status === 429 ? 'QUOTA_EXCEEDED' : status === 504 ? 'PROVIDER_TIMEOUT'
        : status === 409 ? 'CONFLICT' : 'SERVICE_UNAVAILABLE',
      status === 429 ? 'You have reached today’s suggestion limit.' : 'Could not suggest topics right now. Please try again.');
    }
  });
  app.post('/api/topics/:id/discover', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'That topic is unavailable.');
    if (!topicSuggestionService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not search for lesson sources.');
    const profile = await profileService.getProfile(token);
    res.json({ data: await topicSuggestionService.prepare(profile, req.params.id) });
  });
  app.post('/api/sessions', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const token = tokenFrom(req.get('Authorization'));
      const parsed = z.strictObject({ conceptId: z.uuid(), mode: z.literal('learn'), requestId: z.uuid() }).safeParse(req.body);
      if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose an available topic to learn.');
      if (!generationService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Lessons are temporarily unavailable.');
      const profile = await profileService.getProfile(token);
      res.json({ data: await generationService.start(profile, parsed.data.conceptId, parsed.data.requestId) });
  });
  app.get('/api/sessions/:id', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const token = tokenFrom(req.get('Authorization'));
      if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Lesson not found.');
      if (!generationService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Lessons are temporarily unavailable.');
      const profile = await profileService.getProfile(token);
      const session = await generationService.get(profile.userId, req.params.id);
      if (!session) throw new ApiError(404, 'NOT_FOUND', 'Lesson not found.');
      res.json({ data: session });
  });
  app.patch('/api/sessions/:id/position', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const token = tokenFrom(req.get('Authorization'));
      if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Lesson not found.');
      const parsed = z.strictObject({ step: z.number().int().nonnegative() }).safeParse(req.body);
      if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose a lesson step.');
      if (!generationService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Lessons are temporarily unavailable.');
      const profile = await profileService.getProfile(token);
      const currentStep = await generationService.setPosition(profile.userId, req.params.id, parsed.data.step);
      if (currentStep === null) throw new ApiError(404, 'NOT_FOUND', 'Lesson step not found.');
      res.json({ data: { currentStep } });
  });
  app.get('/api/sessions/:id/messages', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Lesson not found.');
    const before = req.query.before === undefined ? undefined : z.coerce.number().int().nonnegative().safeParse(req.query.before);
    if (before && !before.success) throw new ApiError(400, 'INVALID_INPUT', 'Could not load earlier messages.');
    if (!tutorService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Tutor is temporarily unavailable.');
    const profile = await profileService.getProfile(token);
    res.json({ data: await tutorService.list(profile.userId, req.params.id, before?.data) });
  });
  app.post('/api/sessions/:id/tutor', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Lesson not found.');
    const parsed = tutorRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Enter a question of up to 2,000 characters.');
    if (!tutorService) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Tutor is temporarily unavailable.');
    const profile = await profileService.getProfile(token);
    res.json({ data: await tutorService.send(profile, req.params.id, parsed.data) });
  });
  app.post('/api/rounds/:id/answers', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Quiz not found.');
    const parsed = submitAnswerRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Choose an answer from this question.');
    await profileService.getProfile(token);
    res.json({ data: await assessmentService.submit(token, req.params.id, parsed.data) });
  });
  app.post('/api/rounds/:id/hints', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = tokenFrom(req.get('Authorization'));
    if (!z.uuid().safeParse(req.params.id).success) throw new ApiError(404, 'NOT_FOUND', 'Quiz not found.');
    const parsed = hintRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'Question not found.');
    await profileService.getProfile(token);
    res.json({ data: await assessmentService.hint(token, req.params.id, parsed.data.questionId, parsed.data.requestId) });
  });
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Resource not found.')));
  const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    let status = 500;
    let code: ApiErrorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let detail = 'Unexpected server error. Report the request ID for diagnosis.';
    if (error instanceof ApiError) {
      ({ status, code, message } = error);
      detail = message;
    } else if (error instanceof AiOperationError) {
      const mapped = {
        CONFIGURATION: [503, 'SERVICE_UNAVAILABLE', 'Lessons are temporarily unavailable.'],
        QUOTA: [429, 'QUOTA_EXCEEDED', 'Your lesson limit has been reached for today.'],
        IDEMPOTENCY_CONFLICT: [409, 'CONFLICT', 'This request was already used for another lesson.'],
        PENDING: [409, 'CONFLICT', 'Your lesson is still being prepared.'],
        PREVIOUS_FAILURE: [409, 'CONFLICT', 'Please try again with a new request.'],
        REFUSAL: [503, 'PROVIDER_FAILURE', 'Could not prepare this lesson. Please try again.'],
        TIMEOUT: [504, 'PROVIDER_TIMEOUT', 'Lesson preparation timed out. Please try again.'],
        INVALID_OUTPUT: [503, 'SERVICE_UNAVAILABLE', 'Could not prepare a reliable lesson for this topic.'],
        PROVIDER_FAILURE: [503, 'PROVIDER_FAILURE', 'Could not prepare this lesson. Please try again.'],
      } as const;
      [status, code, message] = mapped[error.code];
      detail = `${error.code}: ${message}`;
      if (req.path === '/api/sessions' && error.code === 'INVALID_OUTPUT') detail = error.message.slice(0, 500);
      if (req.path === '/api/sessions' && error.code === 'PROVIDER_FAILURE') {
        const providerHttp = /^Gemini HTTP (\d{3}):/.exec(error.message);
        detail = providerHttp ? `Gemini HTTP ${providerHttp[1]}: ${error.message.includes('Request contains an invalid argument.')
          ? 'Request contains an invalid argument.' : 'Provider request failed.'}` : 'Lesson provider request failed.';
      }
      if (req.path.endsWith('/tutor')) message = error.code === 'QUOTA' ? 'Tutor questions are unavailable for today.'
        : error.code === 'PENDING' ? 'Your question is still being answered.'
        : error.code === 'IDEMPOTENCY_CONFLICT' ? 'This question could not be retried.'
        : 'Could not answer your question. Please try again.';
    } else if (typeof error === 'object' && error !== null && 'type' in error) {
      if (error.type === 'entity.parse.failed') {
        status = 400; code = 'INVALID_INPUT'; message = 'Request body must be valid JSON.';
        detail = message;
      } else if (error.type === 'entity.too.large') {
        status = 400; code = 'INVALID_INPUT'; message = 'Request body exceeds the size limit.';
        detail = message;
      }
    }
    if (req.path === '/api/sessions' && error instanceof AiOperationError)
      console.error(JSON.stringify({ event: 'lesson_generation_failure', requestId: res.locals.requestId,
        code: error.code, detail: error.message }));
    res.status(status).json(errorEnvelopeSchema.parse({ error: { code, message, detail, requestId: res.locals.requestId } }));
  };
  app.use(errorHandler);
  return app;
}
