// @ts-check
import test from 'ava';

import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, utimes } from 'node:fs/promises';
import * as fsPromises from 'node:fs/promises';

import { makeDirectoryLock, writeFileAtomic } from '../src/build-cache.js';

const makeFixture = async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'internal-build-cache-'));
  t.teardown(async () => rm(root, { recursive: true, force: true }));
  return harden({
    root,
    lockRoot: path.join(root, '.locks'),
    cacheFile: path.join(root, 'artifact.json'),
  });
};

test('writeFileAtomic writes content atomically', async t => {
  const { cacheFile } = await makeFixture(t);

  await writeFileAtomic({
    fs: fsPromises,
    filePath: cacheFile,
    data: '{"hello":"world"}\n',
    now: Date.now,
    pid: process.pid,
  });

  const written = await readFile(cacheFile, 'utf8');
  t.is(written, '{"hello":"world"}\n');
});

test('makeDirectoryLock recovers dead-owner lock', async t => {
  const { lockRoot } = await makeFixture(t);
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
    fs: fsPromises,
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
  const { lockRoot } = await makeFixture(t);
  const key = 'stale-age';
  const lockPath = path.join(lockRoot, `${encodeURIComponent(key)}.lock`);
  await mkdir(lockPath, { recursive: true });
  await fsPromises.writeFile(path.join(lockPath, 'owner.json'), '{', 'utf8');
  const staleTime = Date.now() - 120_000;
  await utimes(lockPath, staleTime / 1000, staleTime / 1000);

  /** @type {Array<{type: string, reason?: string}>} */
  const events = [];
  const { withLock } = makeDirectoryLock({
    fs: fsPromises,
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
  const { lockRoot } = await makeFixture(t);
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
    fs: fsPromises,
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
