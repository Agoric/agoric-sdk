// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { promises as fsPromises } from 'fs';
import path from 'path';

import { mustMatch } from '@agoric/store';
import { shape as ssShape } from '@agoric/swingset-vat';
import { ParametersShape as BootParametersShape } from '../src/core/boot-psm.js';

const CONFIG_FILES = [
  'decentral-core-config.json',
  'decentral-demo-config.json',
  'decentral-devnet-config.json',
  'decentral-main-psm-config.json',
  'decentral-psm-config.json',
  'decentral-test-psm-config.json',
  'decentral-test-vaults-config.json',
];

/**
 * @typedef {{
 *   asset: (...ps: string[]) => Promise<string>,
 * }} Context
 * @typedef {import('ava').ExecutionContext<Context> } TestCtx
 */

// NOTE: confine ambient authority to test.before
test.before(t => {
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);
  const asset = (...ps) =>
    fsPromises.readFile(path.join(dirname, ...ps), 'utf-8');
  t.context = { asset };
});

test('Bootstrap SwingSet config file syntax', /** @param {TestCtx} t */ async t => {
  const { asset } = t.context;

  await Promise.all(
    CONFIG_FILES.map(async f => {
      const txt = await asset('..', f);
      const config = harden(JSON.parse(txt));
      await t.notThrows(() => mustMatch(config, ssShape.SwingSetConfig), f);
      const parameters = config?.vats?.bootstrap?.parameters;
      t.log('syntax check:', f, parameters ? 'and parameters' : '');
      (await parameters) &&
        t.notThrows(() => mustMatch(parameters, BootParametersShape), f);
    }),
  );
});
