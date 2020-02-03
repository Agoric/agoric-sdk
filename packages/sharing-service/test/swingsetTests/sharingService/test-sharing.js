import { test } from 'tape-promise/tape';
import path from 'path';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';

async function main(withSES, basedir, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const sharedMapContentsGolden = [
  '=> setup called',
  'starting testSharedMapStorage',
];

test('run sharing Demo --sharedMap contents', async t => {
  const dump = await main(false, 'sharingService', ['sharedMap']);
  t.deepEquals(dump.log, sharedMapContentsGolden);
  t.end();
});

test('run sharing Demo --sharedMap contents', async t => {
  const dump = await main(true, 'sharingService', ['sharedMap']);
  t.deepEquals(dump.log, sharedMapContentsGolden);
  t.end();
});

const sharingTestGolden = [
  '=> setup called',
  'starting testSharingStorage',
  'expected validate to throw',
];

test('run sharing Demo --sharing service', async t => {
  const dump = await main(false, 'sharingService', ['sharing']);
  t.deepEquals(dump.log, sharingTestGolden);
  t.end();
});

test('run sharing Demo --sharing service', async t => {
  const dump = await main(true, 'sharingService', ['sharing']);
  t.deepEquals(dump.log, sharingTestGolden);
  t.end();
});

const twoPartySharingGolden = [
  '=> setup called',
  'starting testSharingStorage',
  'expecting coordination on 42.',
];

test('run sharing Demo --Two Party handoff', async t => {
  const dump = await main(false, 'sharingService', ['twoVatSharing']);
  t.deepEquals(dump.log, twoPartySharingGolden);
  t.end();
});

test('run sharing Demo --Two Party handoff', async t => {
  const dump = await main(true, 'sharingService', ['twoVatSharing']);
  t.deepEquals(dump.log, twoPartySharingGolden);
  t.end();
});
