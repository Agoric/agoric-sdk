import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
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
  t.deepEquals(dump.log, sharedMapContentsGolden);
  t.end();
});

const sharingTestGolden = [
  'starting testSharingStorage',
  'expected validate to throw',
];

test('run sharing Demo --sharing service', async t => {
  const dump = await main('sharingService', ['sharing']);
  t.deepEquals(dump.log, sharingTestGolden);
  t.end();
});

const twoPartySharingGolden = [
  'starting testSharingStorage',
  'expecting coordination on 42.',
];

test('run sharing Demo --Two Party handoff', async t => {
  const dump = await main('sharingService', ['twoVatSharing']);
  t.deepEquals(dump.log, twoPartySharingGolden);
  t.end();
});
