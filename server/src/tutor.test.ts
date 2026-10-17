import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Lesson, Profile, TutorMessage } from '@learning-companion/shared';
import { createApp } from './http-app.js';
import { tutorPrompt, validateTutorOutput, type TutorService } from './tutor.js';

const sessionId = '00000000-0000-4000-8000-000000000201';
const chunkId = '00000000-0000-4000-8000-000000000501';
const lesson = { title: 'Client and server', objectives: [{ id: 'roles', description: 'Explain their roles' }],
  steps: [{ id: 'one', heading: 'Request', caption: 'The browser asks.', explanation: 'The browser sends a request.',
    workedExample: 'GET /home', diagramId: 'flow' }],
  diagrams: [{ id: 'flow', nodes: [{ id: 'client', label: 'Client' }], edges: [{ id: 'request' }] }],
} as Lesson;
const passage = { id: chunkId, heading: 'Requests', body: 'The browser sends a request to a server.' };
const input = { message: 'Who sends the request?', selectedText: 'The browser asks.', stepId: 'one', requestId: crypto.randomUUID() };

describe('lesson tutor', () => {
  it('sends only two recent messages and validates source and diagram references', () => {
    const recent = Array.from({ length: 3 }, (_, index) => ({ role: 'user', body: `Turn ${index}`,
      selectedText: null, stepId: null }) as TutorMessage);
    const prompt = tutorPrompt(lesson, input, [passage], recent);
    expect(prompt).not.toContain('Turn 0');
    expect(prompt).toContain('Turn 1');
    expect(prompt).toContain('Turn 2');
    expect(prompt).toContain(chunkId);
    const good = { answer: 'The browser sends it.', sourceMode: 'source_grounded',
      citationChunkIds: [chunkId], highlightNodeIds: ['client'], highlightEdgeIds: ['request'] };
    expect(validateTutorOutput(good, [passage], lesson, 'one')).toEqual(good);
    expect(() => validateTutorOutput({ ...good, citationChunkIds: [crypto.randomUUID()] }, [passage], lesson, 'one')).toThrow();
    expect(() => validateTutorOutput({ ...good, highlightNodeIds: ['unknown'] }, [passage], lesson, 'one')).toThrow();
    expect(() => validateTutorOutput({ ...good, citationChunkIds: [] }, [passage], lesson, 'one')).toThrow();
  });

  it('authenticates the session routes and passes the selected text to the tutor service', async () => {
    const profile = { userId: crypto.randomUUID(), isAnonymous: true } as Profile;
    const message = { id: crypto.randomUUID(), sequenceNo: 0, role: 'user', body: input.message,
      selectedText: input.selectedText, stepId: 'one', citationChunkIds: [], sourceMode: 'source_grounded',
      highlightNodeIds: [], highlightEdgeIds: [], createdAt: new Date().toISOString() } as TutorMessage;
    const reply = { ...message, id: crypto.randomUUID(), sequenceNo: 1, role: 'assistant',
      body: 'The browser sends it.', selectedText: null, citationChunkIds: [chunkId] } as TutorMessage;
    const service = { list: vi.fn(async () => ({ messages: [message, reply], nextBefore: null })),
      send: vi.fn(async () => ({ userMessage: message, reply })), close: vi.fn(async () => {}) } satisfies TutorService;
    const app = createApp({ getProfile: async () => profile }, undefined, undefined, undefined, undefined, service);
    await request(app).post(`/api/sessions/${sessionId}/tutor`).send(input).expect(401);
    await request(app).post(`/api/sessions/${sessionId}/tutor`).set('Authorization', 'Bearer good-token')
      .send({ ...input, message: '' }).expect(400);
    const sent = await request(app).post(`/api/sessions/${sessionId}/tutor`).set('Authorization', 'Bearer good-token')
      .send(input).expect(200);
    expect(service.send).toHaveBeenCalledWith(profile, sessionId, input);
    expect(sent.body.data.reply.body).toBe('The browser sends it.');
    const history = await request(app).get(`/api/sessions/${sessionId}/messages`).set('Authorization', 'Bearer good-token').expect(200);
    expect(history.body.data.messages).toHaveLength(2);
    expect(history.body.data.messages[0].selectedText).toBe(input.selectedText);
  });
});
