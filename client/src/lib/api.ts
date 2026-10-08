import { errorEnvelopeSchema, healthEnvelopeSchema } from '@learning-companion/shared';

export async function fetchHealth(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(5000);
  const response = await fetch('/api/health', { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const body: unknown = await response.json();
  if (!response.ok) {
    const result = errorEnvelopeSchema.safeParse(body);
    throw new Error(result.success ? result.data.error.message : 'The API is unavailable.');
  }
  return healthEnvelopeSchema.parse(body).data;
}
