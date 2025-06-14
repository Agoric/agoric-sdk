import test from 'ava';
import { makeWebRd, makeWebCache } from '../src/net.js';

const mockFetch = () => Promise.resolve({ ok: true, text: () => 'content', json: () => ({}) });

test('makeWebRd returns frozen object', t => {
  const webRd = makeWebRd('https://example.com', { fetch: mockFetch });
  t.true(Object.isFrozen(webRd), 'WebRd object should be frozen');
});

test('makeWebRd joined objects are frozen', t => {
  const webRd = makeWebRd('https://example.com', { fetch: mockFetch });
  const joined = webRd.join('path');
  t.true(Object.isFrozen(joined), 'Joined WebRd object should be frozen');
});

test('makeWebCache returns frozen object', t => {
  const webRd = makeWebRd('https://example.com', { fetch: mockFetch });
  const mockFileRW = {
    join: () => mockFileRW,
    mkdir: () => Promise.resolve(),
    writeText: () => Promise.resolve(),
    readOnly: () => ({ readText: () => Promise.resolve('content'), unlink: () => Promise.resolve() }),
    rmdir: () => Promise.resolve(),
  };
  const webCache = makeWebCache(webRd, mockFileRW);
  t.true(Object.isFrozen(webCache), 'WebCache object should be frozen');
});
