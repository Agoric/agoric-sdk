/* global __dirname */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

async function main(basedir, argv) {
  const dir = path.resolve(`${__dirname}/..`, basedir);
  const config = await loadBasedir(dir);
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const sharedMapContentsGolden = ['starting testSharedMapStorage'];

test('run sharing Demo --sharedMap contents', async t => {
  const dump = await main('sharingService', ['sharedMap']);
  t.deepEqual(dump.log, sharedMapContentsGolden);
});

const sharingTestGolden = [
  'starting testSharingStorage',
  'expected validate to throw',
];

test('run sharing Demo --sharing service', async t => {
  const dump = await main('sharingService', ['sharing']);
  t.deepEqual(dump.log, sharingTestGolden);
});

const twoPartySharingGolden = [
  'starting testSharingStorage',
  'expecting coordination on 42.',
];

test('run sharing Demo --Two Party handoff', async t => {
  const dump = await main('sharingService', ['twoVatSharing']);
  t.deepEqual(dump.log, twoPartySharingGolden);
});
