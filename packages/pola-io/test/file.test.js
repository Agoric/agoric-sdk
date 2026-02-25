import test from 'ava';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import os from 'node:os';
import * as path from 'node:path';
import { makeFileRd, makeFileRW, makeFileRWResolve } from '../src/file.js';

const { isFrozen } = Object;

test('makeFileRd returns frozen object', t => {
  const fileRd = makeFileRd('/tmp', { fs, fsp, path });
  t.true(isFrozen(fileRd), 'FileRd object should be frozen');
});

test('makeFileRW returns frozen object', t => {
  const fileRW = makeFileRW('/tmp', { fs, fsp, path });
  t.true(isFrozen(fileRW), 'FileRW object should be frozen');
});

test('makeFileRd joined objects are frozen', t => {
  const fileRd = makeFileRd('/tmp', { fs, fsp, path });
  const joined = fileRd.join('subdir');
  t.true(isFrozen(joined), 'Joined FileRd object should be frozen');
});

test('makeFileRW joined objects are frozen', t => {
  const fileRW = makeFileRW('/tmp', { fs, fsp, path });
  const joined = fileRW.join('subdir');
  t.true(isFrozen(joined), 'Joined FileRW object should be frozen');
});

test('makeFileRW readOnly returns frozen object', t => {
  const fileRW = makeFileRW('/tmp', { fs, fsp, path });
  const readOnly = fileRW.readOnly();
  t.true(isFrozen(readOnly), 'ReadOnly object should be frozen');
});

test('makeFileRWResolve join handles absolute path inputs', t => {
  const fileRW = makeFileRWResolve('/tmp', { fs, fsp, path });
  const joined = fileRW.join('/var/log');
  t.is(String(joined), path.resolve('/var/log'));
});

test('writeAtomic avoids collisions under fixed now/pid', async t => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'pola-file-'));
  t.teardown(async () => fsp.rm(root, { recursive: true, force: true }));
  const rootWr = makeFileRWResolve(root, { fs, fsp, path });
  const target = rootWr.join('artifact.json');
  const now = () => 1_700_000_000_000;
  const writes = Array.from({ length: 16 }, (_, i) =>
    target.writeAtomic(`{"write":${i}}\n`, { now, pid: 12345 }),
  );
  await t.notThrowsAsync(() => Promise.all(writes));
  const written = await target.readOnly().readText();
  t.regex(written, /^\{"write":\d+\}\n$/);
});
