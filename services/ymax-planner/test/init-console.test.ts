import test from 'ava';

import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileP = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const serviceRoot = path.join(repoRoot, 'services/ymax-planner');

test('init console pipeline expands Error logs before JSONL output', async t => {
  const env = {
    ...process.env,
    DEBUG: 'agoric:log',
    FORCE_COLOR: '0',
  };
  delete env.LOCKDOWN_OPTIONS;
  delete env.LOCKDOWN_ERROR_TAMING;

  const { stdout, stderr } = await execFileP(process.execPath, ['test/init-console.fixture.mjs'], {
    env,
  });

  t.is(stderr, '');

  const records = stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

  t.is(records.length, 1);
  t.is(records[0].label, 'ymax-planner');
  t.is(records[0].level, 30);

  const { msg } = records[0];
  t.regex(msg, /^My error: \(Error#\d+\) > you like\?\nError#\d+: something\n\n/);
  t.notRegex(msg, /\bError: something\b/);

  // Remove the non-deterministic parts of the output so that we can snapshot
  // test the rest of it.
  const stableRecords = records.map(({ hostname, pid, time, msg, ...rest }) => ({
    hostname: '<hostname>',
    ...rest,
    msg: msg.replaceAll(/\b(at file:\/\/)[^\n]+/g, '$1<filename>'),
    pid: '<pid>',
    time: '<timestamp>',
  }));
  t.snapshot(stableRecords, 'stabilized output should match');
});
