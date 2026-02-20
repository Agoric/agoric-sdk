import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const fixtureCli = './test/tools/create-runutils-fixture.ts';
const runCli = (args: string[]) =>
  execFileSync(
    process.execPath,
    ['--import', 'ts-blank-space/register', fixtureCli, ...args],
    {
      cwd: packageRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
type CliExecError = Error & { stderr?: string | Buffer };

test('create-runutils-fixture --list includes known fixture names', t => {
  const output = runCli(['--list']);
  t.regex(output, /^vow-offer-results$/m);
});

test('create-runutils-fixture rejects unknown fixture names', t => {
  const err = t.throws(() => runCli(['not-a-fixture']));
  t.truthy(err);
  t.regex(String((err as CliExecError).stderr), /Unknown fixture name/);
});
