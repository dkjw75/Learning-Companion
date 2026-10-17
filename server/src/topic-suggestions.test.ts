import { describe, expect, it } from 'vitest';
import { candidateUrls } from './topic-suggestions.js';
import { allowedUrl, chunkArticle, coversObjective } from './source-import.js';

describe('source discovery candidates', () => {
  it('uses bounded HTTPS URLs from grounding chunks only', () => {
    expect(candidateUrls([
      { web: { uri: 'https://docs.example.com/topic' } },
      { web: { uri: 'https://docs.example.com/topic' } },
      { web: { uri: 'http://docs.example.com/unsafe' } },
      { web: { uri: 'https://user:pass@docs.example.com/private' } },
      { web: { uri: 'javascript:alert(1)' } },
      {},
    ])).toEqual(['https://docs.example.com/topic']);
  });

  it('omits rejected candidates while retaining fresh grounded links', () => {
    expect(candidateUrls([
      { web: { uri: 'https://docs.example.com/rejected' } },
      { web: { uri: 'https://docs.example.com/fresh' } },
    ], ['https://docs.example.com/rejected'])).toEqual(['https://docs.example.com/fresh']);
  });
});

describe('automatic page checks', () => {
  it('accepts public HTTPS hosts while rejecting unsafe URLs', () => {
    expect(allowedUrl('https://developer.mozilla.org/en-US/docs/Web/HTTP').hostname).toBe('developer.mozilla.org');
    expect(allowedUrl('https://docs.aws.amazon.com/guide').hostname).toBe('docs.aws.amazon.com');
    expect(allowedUrl('https://ocw.mit.edu/course').hostname).toBe('ocw.mit.edu');
    expect(() => allowedUrl('http://developer.mozilla.org/lesson')).toThrow('public HTTPS');
    expect(() => allowedUrl('https://user:pass@developer.mozilla.org/lesson')).toThrow('public HTTPS');
    expect(() => allowedUrl('https://127.0.0.1/lesson')).toThrow('public HTTPS');
    expect(() => allowedUrl('https://intranet.local/lesson')).toThrow('public HTTPS');
    expect(() => allowedUrl('https://www.w3schools.com/js/')).toThrow('terms');
  });

  it('extracts bounded passages and requires objective coverage', () => {
    const paragraph = 'An HTTP request asks a server for a resource and the HTTP response reports the status and returns the representation. ';
    const html = `<html><head><title>HTTP request and response</title></head><body><main><h1>HTTP request and response</h1>
      <h2>Request</h2>${Array(6).fill(`<p>${paragraph.repeat(8)}</p>`).join('')}
      <h2>Response</h2>${Array(6).fill(`<p>${paragraph.repeat(8)}</p>`).join('')}</main></body></html>`;
    const page = chunkArticle(html, 'https://developer.mozilla.org/en-US/docs/Web/HTTP');
    expect(page.passages.length).toBeGreaterThanOrEqual(2);
    expect(page.passages.every(passage => passage.body.split(/\s+/).length <= 450)).toBe(true);
    expect(coversObjective('HTTP request and response', 'Explain how HTTP requests and responses work', page)).toBe(true);
    expect(coversObjective('Database transactions', 'Explain database transactions', page)).toBe(false);
  });
});
