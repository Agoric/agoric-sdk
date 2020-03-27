// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';

import path from 'path';
import bundleSource from '@agoric/bundle-source';
import fs from 'fs';

async function buildBundle(contract) {
  const { source, moduleFormat } = await bundleSource(
    `${__dirname}/../../../src/contracts/${contract}`,
  );
  const obj = { source, moduleFormat, contract };
  fs.writeFileSync(
    `${__dirname}/bundle-${contract}.js`,
    `export default ${JSON.stringify(obj)};`,
  );
}

async function main(withSES, basedir, argv) {
  const dir = path.resolve('test/swingsetTests', basedir);
  const config = await loadBasedir(dir);
  const ldSrcPath = require.resolve(
    '@agoric/swingset-vat/src/devices/loopbox-src',
  );
  buildBundle('dvp');
  config.devices = [['loopbox', ldSrcPath, {}]];
  const controller = await buildVatController(config, withSES, argv);
  await controller.run();
  return controller.dump();
}

const expectedAutoswapOkLog = [
  '=> alice, bob, carol, and dvpCore are set up',
  'Bob received the Assurance: <something>',
];

test.only('zoe - dvp - happy case', async t => {
  t.plan(1);
  // Bob/payment firm starts with money. Everyone starts with no assurance.
  // Carol will have the assurance mint so she can create assurances as needed.
  const startingExtents = [
    [[], 0],
    [[], 1],
    [[], 0],
    [[], 0],
  ];
  const dump = await main(true, 'dvp', ['dvp', startingExtents]);
  t.deepEquals(dump.log, expectedAutoswapOkLog);
});
