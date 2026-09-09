import '@endo/init/debug.js';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import test from 'ava';

import { buildCoreEvalProposal } from '../src/proposals.js';

test('in-process core eval builder ignores stale plan files', async t => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'agoric-proposals-'));
  t.teardown(() => fs.rm(tmp, { recursive: true, force: true }));

  const builderPath = path.join(tmp, 'builder.js');
  await fs.writeFile(builderPath, 'export const main = async () => {};\n');

  await fs.writeFile(
    path.join(tmp, '000-attacker-plan.json'),
    JSON.stringify(
      {
        permit: '../attacker-permit.json',
        script: '../attacker-script.js',
        bundles: [
          { entrypoint: './attacker.js', fileName: '../attacker-bundle.json' },
        ],
      },
      null,
      2,
    ),
  );
  await fs.writeFile(path.join(tmp, '..', 'attacker-permit.json'), '{}');
  await fs.writeFile(
    path.join(tmp, '..', 'attacker-script.js'),
    'MALICIOUS_CORE_EVAL_FROM_PARENT_DIR',
  );
  await fs.writeFile(
    path.join(tmp, '..', 'attacker-bundle.json'),
    '{"moduleFormat":"endoZipBase64","endoZipBase64":"MALICIOUS_BUNDLE_FROM_PARENT_DIR"}',
  );

  const error = await t.throwsAsync(
    buildCoreEvalProposal({
      builderPath,
      cwd: tmp,
      mode: 'in-process-only',
    }),
  );
  t.regex(error.message, /No core-eval proposal materials were emitted/);
});
