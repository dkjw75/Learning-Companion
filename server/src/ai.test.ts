import { describe, expect, it, vi } from 'vitest';
import { AiOperationError, publicSmokePreview, runSmoke, validateSmokeOutput, type AiStore, type SmokeInput } from './ai.js';

const chunkId = '00000000-0000-4000-8000-000000000501';
const input: SmokeInput = { ownerId: '00000000-0000-4000-8000-000000000901', isAnonymous: true,
  requestId: '00000000-0000-4000-8000-000000000902', conceptId: '00000000-0000-4000-8000-000000000101',
  conceptTitle: 'Clients and servers', objectiveId: 'client-server-roles',
  objectiveDescription: 'Explain the roles of a client and server.', passages: [
    { id: chunkId, heading: 'Clients', body: 'A browser is a client.', sourceUrl: 'https://example.com/a', objectiveId: 'client-server-roles' },
    { id: '00000000-0000-4000-8000-000000000502', heading: 'Servers', body: 'A server answers.', sourceUrl: 'https://example.com/a', objectiveId: 'client-server-roles' },
  ] };
const output = { lesson: { title: 'Client and server', steps: Array.from({ length: 4 }, (_, index) => ({
  heading: `Step ${index + 1}`, body: `Explanation ${index + 1}`, citationChunkIds: [chunkId] })) },
  questions: Array.from({ length: 3 }, (_, index) => ({ id: `q${index + 1}`, prompt: `Question ${index + 1}`,
    kind: index === 2 ? 'application' as const : 'recall' as const, objectiveId: 'client-server-roles', citationChunkIds: [chunkId],
    options: Array.from({ length: 4 }, (_, option) => ({ id: `o${option + 1}`, text: `Option ${option + 1}` })),
    correctOptionId: 'o1', feedbackCriteria: 'Private grading note.' })) };

function setup() {
  let state: 'pending' | 'completed' | 'failed' | 'uncertain' = 'pending';
  let saved: typeof output | undefined;
  let used = false;
  const reserve = vi.fn(async ({ inputHash }: { inputHash: string }) => {
    const created = !used;
    used = true;
    return { created, record: { id: '00000000-0000-4000-8000-000000000903', state, inputHash, result: saved } };
  });
  const reserveRepair = vi.fn(async () => {});
  const complete = vi.fn(async (_id: string, result: typeof output) => { saved = result; state = 'completed'; });
  const fail = vi.fn(async (_id: string, next: 'failed' | 'uncertain') => { state = next; });
  return { store: { reserve, reserveRepair, complete, fail } as unknown as AiStore, reserve, reserveRepair, complete, fail };
}

describe('Stage 5 source-backed smoke adapter', () => {
  it('repairs malformed JSON once, validates private keys, then reuses the saved result', async () => {
    const { store, reserveRepair, complete } = setup();
    const generate = vi.fn().mockResolvedValueOnce({ text: '{bad' }).mockResolvedValueOnce({ text: JSON.stringify(output) });
    const first = await runSmoke(input, store, { generate });
    expect(first.repaired).toBe(true);
    expect(reserveRepair).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    const again = await runSmoke(input, store, { generate });
    expect(again.reused).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(publicSmokePreview(first.output, input))).not.toContain('correctOptionId');
    expect(JSON.stringify(publicSmokePreview(first.output, input))).not.toContain('feedbackCriteria');
  });
  it('rejects unsupported citations and bad answer keys', () => {
    expect(() => validateSmokeOutput({ ...output, lesson: { ...output.lesson,
      steps: [{ ...output.lesson.steps[0], citationChunkIds: ['00000000-0000-4000-8000-000000000599'] }, ...output.lesson.steps.slice(1)] } }, input))
      .toThrow(AiOperationError);
    expect(() => validateSmokeOutput({ ...output, questions: [{ ...output.questions[0], correctOptionId: 'missing' }, ...output.questions.slice(1)] }, input))
      .toThrow(AiOperationError);
  });
  it('records refusal without a repair call', async () => {
    const { store, fail, reserveRepair } = setup();
    await expect(runSmoke(input, store, { generate: async () => ({ text: undefined, blocked: true }) }))
      .rejects.toMatchObject({ code: 'REFUSAL' });
    expect(fail).toHaveBeenCalledWith(expect.any(String), 'failed', 'REFUSAL');
    expect(reserveRepair).not.toHaveBeenCalled();
  });
  it('marks timeout uncertain and never automatically retries it', async () => {
    const { store, fail } = setup();
    const generate = vi.fn(async () => { throw new DOMException('Timed out', 'TimeoutError'); });
    await expect(runSmoke(input, store, { generate })).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(fail).toHaveBeenCalledWith(expect.any(String), 'uncertain', 'TIMEOUT');
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('stops on quota before any provider call', async () => {
    const generate = vi.fn();
    const store = { ...setup().store, reserve: async () => { throw new AiOperationError('QUOTA', 'Daily limit.'); } };
    await expect(runSmoke(input, store, { generate })).rejects.toMatchObject({ code: 'QUOTA' });
    expect(generate).not.toHaveBeenCalled();
  });
});
