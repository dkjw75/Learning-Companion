import { createClient } from '@supabase/supabase-js';
import { hintResponseSchema, submitAnswerResponseSchema, type SubmitAnswerRequest, type SubmitAnswerResponse } from '@learning-companion/shared';
import { ApiError } from './errors.js';

export type AssessmentService = {
  submit(token: string, roundId: string, input: SubmitAnswerRequest): Promise<SubmitAnswerResponse>;
  hint(token: string, roundId: string, questionId: string, requestId: string): Promise<ReturnType<typeof hintResponseSchema.parse>>;
};

export function createAssessmentService(
  url = process.env.SUPABASE_URL?.trim(),
  publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim(),
): AssessmentService {
  return {
    async submit(token, roundId, input) {
      if (!url || !publishableKey) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not check your answer. Please try again.');
      const scoped = createClient(url, publishableKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await scoped.rpc('submit_mcq_answer', {
        p_round_id: roundId, p_question_id: input.questionId, p_answer: input.answer, p_request_id: input.requestId,
      });
      if (error?.code === '02000') throw new ApiError(404, 'NOT_FOUND', 'Quiz not found.');
      if (error?.code === '22023') throw new ApiError(400, 'INVALID_INPUT', 'Choose an answer from this question.');
      if (error?.code === '23505' || error?.code === '23514') throw new ApiError(409, 'CONFLICT', 'This answer was already recorded. Reload the quiz to see it.');
      if (error || !data) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not check your answer. Please try again.');
      return submitAnswerResponseSchema.parse(data);
    },
    async hint(token, roundId, questionId, requestId) {
      if (!url || !publishableKey) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not show a hint. Please try again.');
      const scoped = createClient(url, publishableKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await scoped.rpc('request_mcq_hint', {
        p_round_id: roundId, p_question_id: questionId, p_request_id: requestId,
      });
      if (error?.code === '02000') throw new ApiError(404, 'NOT_FOUND', 'Quiz not found.');
      if (error?.code === '22023') throw new ApiError(400, 'INVALID_INPUT', 'Question not found.');
      if (error || !data) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not show a hint. Please try again.');
      return hintResponseSchema.parse(data);
    },
  };
}
