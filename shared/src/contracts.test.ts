import { describe, expect, it } from 'vitest';
import {
  assessmentRoundSchema, answerEvidenceSchema, diagramSchema, lessonSchema,
  optionalTaskResultSchema, optionalTaskSubmissionSchema, progressUpdateSchema,
  submitAnswerRequestSchema, submitAnswerResponseSchema,
} from './index.js';

const uuid = '00000000-0000-4000-8000-000000000001';
const otherUuid = '00000000-0000-4000-8000-000000000002';
const diagram = {
  id: 'flow', type: 'flow' as const, title: 'Fixture diagram',
  nodes: [{ id: 'client', label: 'Client', description: 'Sends a request.' }, { id: 'server', label: 'Server', description: 'Returns a response.' }],
  edges: [{ id: 'request', from: 'client', to: 'server', label: 'Request' }],
};
function lesson() {
  return {
    id: uuid, conceptId: otherUuid, title: 'Contract fixture', sourceMode: 'source_grounded' as const, contentVersion: 'fixture-v1',
    objectives: [{ id: 'objective-1', description: 'Recognise a request.' }], citationChunkIds: [uuid], diagrams: [structuredClone(diagram)],
    steps: Array.from({ length: 4 }, (_, index) => ({
      id: `step-${index}`, heading: 'Test step', caption: 'A client sends a request.', diagramId: 'flow',
      highlightNodeIds: ['client'], highlightEdgeIds: ['request'], citationChunkIds: [uuid],
    })),
  };
}
function round() {
  return {
    id: uuid, sessionId: otherUuid, kind: 'initial' as const, sourceMode: 'source_grounded' as const, assessmentBasis: 'reviewed_key' as const,
    questions: Array.from({ length: 3 }, (_, index) => ({
      id: `q-${index}`, familyId: `family-${index}`, prompt: 'Contract fixture question?', kind: index === 2 ? 'application' : 'recall',
      objectiveIds: ['objective-1'], citationChunkIds: [uuid], options: [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }],
    })),
  };
}
const update = {
  conceptId: uuid, previousStatus: 'developing', currentStatus: 'demonstrated_understanding', changed: true,
  evidenceRoundId: otherUuid, sourceMode: 'unverified', assessmentBasis: 'ai_generated_key',
};
const evidence = { id: uuid, roundId: uuid, questionId: 'q-1', requestId: otherUuid,
  attemptIndex: 1, answer: 'a', correct: true, assisted: false, independent: true, objectiveIds: ['objective-1'] };

describe('bounded lesson contracts', () => {
  it('accepts structurally valid flow, relationship, and table diagrams', () => {
    expect(lessonSchema.safeParse(lesson()).success).toBe(true);
    expect(diagramSchema.safeParse({ ...diagram, type: 'relationship' }).success).toBe(true);
    expect(diagramSchema.safeParse({ id: 'table', title: 'Table', type: 'table', nodes: [], edges: [], table: { columns: ['ID', 'Name'], rows: [['1', 'Ada']] } }).success).toBe(true);
  });
  it.each([
    ['unknown edge endpoint', (value: ReturnType<typeof lesson>) => { value.diagrams[0]!.edges[0]!.to = 'missing'; }],
    ['duplicate node ID', (value: ReturnType<typeof lesson>) => { value.diagrams[0]!.nodes[1]!.id = 'client'; }],
    ['duplicate step ID', (value: ReturnType<typeof lesson>) => { value.steps[1]!.id = value.steps[0]!.id; }],
    ['unknown diagram', (value: ReturnType<typeof lesson>) => { value.steps[0]!.diagramId = 'missing'; }],
    ['unknown highlight', (value: ReturnType<typeof lesson>) => { value.steps[0]!.highlightNodeIds = ['missing']; }],
    ['unknown citation', (value: ReturnType<typeof lesson>) => { value.steps[0]!.citationChunkIds = [otherUuid]; }],
    ['missing grounded citation', (value: ReturnType<typeof lesson>) => { value.steps[0]!.citationChunkIds = []; }],
    ['too few steps', (value: ReturnType<typeof lesson>) => { value.steps.pop(); }],
    ['too many diagrams', (value: ReturnType<typeof lesson>) => { value.diagrams.push({ ...diagram, id: 'second' }, { ...diagram, id: 'third' }); }],
    ['too many nodes', (value: ReturnType<typeof lesson>) => { value.diagrams[0]!.nodes = Array.from({ length: 9 }, (_, i) => ({ id: `n-${i}`, label: 'N', description: 'Node' })); }],
    ['long caption', (value: ReturnType<typeof lesson>) => { value.steps[0]!.caption = Array.from({ length: 101 }, () => 'word').join(' '); }],
  ])('rejects %s', (_name, mutate) => {
    const value = lesson(); mutate(value);
    expect(lessonSchema.safeParse(value).success).toBe(false);
  });
  it('rejects ragged tables and provider-controlled layout', () => {
    expect(diagramSchema.safeParse({ ...diagram, type: 'table', table: { columns: ['A', 'B'], rows: [['1']] } }).success).toBe(false);
    expect(diagramSchema.safeParse({ ...diagram, x: 12 }).success).toBe(false);
  });
});

describe('public assessments and evidence', () => {
  it('requires three distinct questions/families with an application question', () => {
    expect(assessmentRoundSchema.safeParse(round()).success).toBe(true);
    const tooShort = round(); tooShort.questions.pop();
    expect(assessmentRoundSchema.safeParse(tooShort).success).toBe(false);
    const duplicate = round(); duplicate.questions[1]!.familyId = duplicate.questions[0]!.familyId;
    expect(assessmentRoundSchema.safeParse(duplicate).success).toBe(false);
    const recallOnly = round(); recallOnly.questions.forEach(question => { question.kind = 'recall'; });
    expect(assessmentRoundSchema.safeParse(recallOnly).success).toBe(false);
  });
  it('rejects private keys in public DTOs and caller-supplied grading/ownership', () => {
    const value = round();
    expect(assessmentRoundSchema.safeParse({ ...value, answerKeys: { 'q-0': 'a' } }).success).toBe(false);
    expect(assessmentRoundSchema.safeParse({ ...value, questions: value.questions.map(question => ({ ...question, correctOptionId: 'a' })) }).success).toBe(false);
    expect(submitAnswerRequestSchema.safeParse({ questionId: 'q-0', answer: 'a', requestId: uuid, correct: true, owner: uuid }).success).toBe(false);
  });
  it('does not accept assistance or retries as independent evidence', () => {
    expect(answerEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(answerEvidenceSchema.safeParse({ ...evidence, assisted: true }).success).toBe(false);
    expect(answerEvidenceSchema.safeParse({ ...evidence, attemptIndex: 2 }).success).toBe(false);
    expect(answerEvidenceSchema.safeParse({ ...evidence, attemptIndex: 2, independent: false }).success).toBe(true);
  });
  it('requires a progress update exactly when a round completes', () => {
    expect(submitAnswerResponseSchema.safeParse({ evidence, feedback: 'Result', completed: true, progressUpdate: update }).success).toBe(true);
    expect(submitAnswerResponseSchema.safeParse({ evidence, feedback: 'Result', completed: true }).success).toBe(false);
    expect(submitAnswerResponseSchema.safeParse({ evidence, feedback: 'Result', completed: false, progressUpdate: update }).success).toBe(false);
  });
  it('supports optional skip and inconclusive feedback without fabricated correctness', () => {
    expect(optionalTaskSubmissionSchema.safeParse({ type: 'skip', requestId: uuid }).success).toBe(true);
    expect(optionalTaskResultSchema.safeParse({ state: 'inconclusive', feedback: 'Unable to grade confidently.' }).success).toBe(true);
    expect(optionalTaskResultSchema.safeParse({ state: 'inconclusive', feedback: 'Uncertain', correct: true }).success).toBe(false);
    expect(optionalTaskSubmissionSchema.safeParse({ type: 'explanation', answer: 'x'.repeat(3001), requestId: uuid }).success).toBe(false);
  });
});

describe('progress update response contract', () => {
  it('permits understanding of an unverified topic while retaining its basis', () => {
    expect(progressUpdateSchema.safeParse(update).success).toBe(true);
    expect(progressUpdateSchema.safeParse({ ...update, assessmentBasis: 'reviewed_key' }).success).toBe(false);
  });
  it('validates unchanged results and the assessed status boundary', () => {
    expect(progressUpdateSchema.safeParse({ ...update, previousStatus: update.currentStatus, changed: false }).success).toBe(true);
    expect(progressUpdateSchema.safeParse({ ...update, changed: false }).success).toBe(false);
    expect(progressUpdateSchema.safeParse({ ...update, currentStatus: 'explored' }).success).toBe(false);
  });
});
