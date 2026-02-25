// @ts-check
import test from 'ava';

import path from 'node:path';
import { mkdir, readFile, utimes } from 'node:fs/promises';
import * as fsPromises from 'node:fs/promises';
import { makeTempDir } from '@agoric/pola-io/src/ambient/file.js';

import { makeDirectoryLock } from '../src/build-cache.js';

const makeFixture = async t => {
  const rootWr = await makeTempDir().mkdtemp('internal-build-cache-');
  const root = String(rootWr);
  t.teardown(async () => rootWr.rm({ recursive: true, force: true }));
  const lockRoot = path.join(root, '.locks');
  const cacheFile = path.join(root, 'artifact.json');
  return harden({
    root,
    rootWr,
    lockRoot,
    lockRootWr: rootWr.join(lockRoot),
    cacheFile,
    cacheFileWr: rootWr.join(cacheFile),
  });
};

test('FileRW.writeAtomic writes content atomically', async t => {
  const { cacheFile, cacheFileWr } = await makeFixture(t);

  await cacheFileWr.writeAtomic('{"hello":"world"}\n', {
    now: Date.now,
    pid: process.pid,
  });

  const written = await readFile(cacheFile, 'utf8');
  t.is(written, '{"hello":"world"}\n');
});

test('FileRW.writeAtomic avoids temp-file collisions with fixed timestamps', async t => {
  const { cacheFile, cacheFileWr } = await makeFixture(t);
  const now = () => 1_700_000_000_000;
  const writes = Array.from({ length: 16 }, (_, i) =>
    cacheFileWr.writeAtomic(`{"write":${i}}\n`, { now, pid: 12345 }),
  );

  await t.notThrowsAsync(() => Promise.all(writes));
  const written = await readFile(cacheFile, 'utf8');
  t.regex(written, /^\{"write":\d+\}\n$/);
});

test('makeDirectoryLock recovers dead-owner lock', async t => {
  const { lockRoot, rootWr } = await makeFixture(t);
  const key = 'dead-owner';
  const lockPath = path.join(lockRoot, `${encodeURIComponent(key)}.lock`);
  await mkdir(lockPath, { recursive: true });
  await fsPromises.writeFile(
    path.join(lockPath, 'owner.json'),
    JSON.stringify({ pid: 999_999_999, createdAt: Date.now() }),
    'utf8',
  );

  /** @type {Array<{type: string, reason?: string}>} */
  const events = [];
  const { withLock } = makeDirectoryLock({
    root: rootWr,
    delayMs: ms => new Promise(resolve => setTimeout(resolve, ms)),
    now: Date.now,
    pid: process.pid,
    isPidAlive: pid => pid === process.pid,
    lockRoot,
    staleLockMs: 60_000,
    acquireTimeoutMs: 1_000,
    onEvent: event => events.push(event),
  });

  const value = await withLock(key, async () => 'ok');
  t.is(value, 'ok');
  t.true(events.some(event => event.type === 'lock-broken'));
  t.true(
    events.some(
      event => event.type === 'lock-broken' && event.reason === 'dead-owner',
    ),
  );
});

test('makeDirectoryLock recovers stale lock by age', async t => {
  const { lockRoot, rootWr } = await makeFixture(t);
  const key = 'stale-age';
  const lockPath = path.join(lockRoot, `${encodeURIComponent(key)}.lock`);
  await mkdir(lockPath, { recursive: true });
  await fsPromises.writeFile(path.join(lockPath, 'owner.json'), '{', 'utf8');
  const staleTime = Date.now() - 120_000;
  await utimes(lockPath, staleTime / 1000, staleTime / 1000);

  /** @type {Array<{type: string, reason?: string}>} */
  const events = [];
  const { withLock } = makeDirectoryLock({
    root: rootWr,
    delayMs: ms => new Promise(resolve => setTimeout(resolve, ms)),
    now: Date.now,
    pid: process.pid,
    isPidAlive: () => true,
    lockRoot,
    staleLockMs: 100,
    acquireTimeoutMs: 1_000,
    onEvent: event => events.push(event),
  });

  await withLock(key, async () => undefined);
  t.true(
    events.some(
      event => event.type === 'lock-broken' && event.reason === 'stale-age',
    ),
  );
});

test('makeDirectoryLock times out waiting for active lock', async t => {
  const { lockRoot, rootWr } = await makeFixture(t);
  const key = 'timeout';
  const lockPath = path.join(lockRoot, `${encodeURIComponent(key)}.lock`);
  await mkdir(lockPath, { recursive: true });
  await fsPromises.writeFile(
    path.join(lockPath, 'owner.json'),
    JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
    'utf8',
  );

  let tick = 0;
  const { withLock } = makeDirectoryLock({
    root: rootWr,
    delayMs: () => Promise.resolve(),
    now: () => {
      tick += 25;
      return tick;
    },
    pid: process.pid,
    isPidAlive: () => true,
    lockRoot,
    staleLockMs: 60_000,
    acquireTimeoutMs: 100,
  });

  await t.throwsAsync(() => withLock(key, async () => undefined), {
    message: /Timed out waiting for cache lock/,
  });
});

test('makeDirectoryLock tolerates throwing event sinks', async t => {
  const { lockRoot, rootWr } = await makeFixture(t);
  const { withLock } = makeDirectoryLock({
    root: rootWr,
    delayMs: ms => new Promise(resolve => setTimeout(resolve, ms)),
    now: Date.now,
    pid: process.pid,
    isPidAlive: () => true,
    lockRoot,
    staleLockMs: 60_000,
    acquireTimeoutMs: 1_000,
    onEvent: () => {
      throw Error('sink-failure');
    },
  });

  const result = await withLock('event-throws', async () => 'ok');
  t.is(result, 'ok');
});
