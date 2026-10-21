import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const snapshotCli = './test/tools/create-runutils-snapshot.ts';
const runCli = (args: string[]) =>
  execFileSync(
    process.execPath,
    ['--import', 'ts-blank-space/register', snapshotCli, ...args],
    {
      cwd: packageRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
type CliExecError = Error & { stderr?: string | Buffer };

test('create-runutils-snapshot --list includes known snapshot names', t => {
  const output = runCli(['--list']);
  t.regex(output, /^orchestration-base$/m);
});

test('create-runutils-snapshot rejects unknown snapshot names', t => {
  const err = t.throws(() => runCli(['not-a-fixture']));
  t.truthy(err);
  t.regex(String((err as CliExecError).stderr), /Unknown snapshot name/);
});
