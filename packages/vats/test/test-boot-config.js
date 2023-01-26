// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { promises as fsPromises } from 'fs';
import path from 'path';

import { mustMatch } from '@agoric/store';
import { shape as ssShape } from '@agoric/swingset-vat';
import { ParametersShape as BootParametersShape } from '../src/core/boot-psm.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);
const asset = (...ps) =>
  fsPromises.readFile(path.join(dirname, ...ps), 'utf-8');

test('PSM config file is valid', async t => {
  const txt = await asset('..', 'decentral-psm-config.json');
  const config = harden(JSON.parse(txt));
  t.notThrows(() => mustMatch(config, ssShape.SwingSetConfig));
  t.notThrows(() =>
    mustMatch(config.vats.bootstrap.parameters, BootParametersShape),
  );
});
