// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

async function main(basedir, argv) {
  const dir = path.resolve(`${dirname}/..`, basedir);
  const config = await loadBasedir(dir, { includeDevDependencies: true });
  config.defaultManagerType = 'xs-worker';
  const controller = await buildVatController(config, argv);
  await controller.run();
  const res = controller.dump();
  await controller.shutdown();
  return res;
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
