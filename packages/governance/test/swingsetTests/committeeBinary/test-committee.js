/* global __dirname */

// @ts-check

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@agoric/bundle-source';

const CONTRACT_FILES = ['committeeRegistrar', 'binaryBallotCounter'];

test.before(async t => {
  const start = Date.now();
  const kernelBundles = await buildKernelBundles();
  const step2 = Date.now();
  const contractBundles = {};
  await Promise.all(
    CONTRACT_FILES.map(async settings => {
      let bundleName;
      let contractPath;
      if (typeof settings === 'string') {
        bundleName = settings;
        contractPath = settings;
      } else {
        ({ bundleName, contractPath } = settings);
      }
      const source = `${__dirname}/../../../src/${contractPath}`;
      const bundle = await bundleSource(source);
      contractBundles[bundleName] = bundle;
    }),
  );
  const step3 = Date.now();

  const vats = {};
  await Promise.all(
    ['voter', 'zoe'].map(async name => {
      const source = `${__dirname}/vat-${name}.js`;
      const bundle = await bundleSource(source);
      vats[name] = { bundle };
    }),
  );
  const bootstrapSource = `${__dirname}/bootstrap.js`;
  vats.bootstrap = {
    bundle: await bundleSource(bootstrapSource),
    parameters: { contractBundles }, // argv will be added to this
  };
  const config = { bootstrap: 'bootstrap', vats };

  const step4 = Date.now();
  const ktime = `${(step2 - start) / 1000}s kernel`;
  const ctime = `${(step3 - step2) / 1000}s contracts`;
  const vtime = `${(step4 - step3) / 1000}s vats`;
  const ttime = `${(step4 - start) / 1000}s total`;
  console.log(`bundling: ${ktime}, ${ctime}, ${vtime}, ${ttime}`);

  // @ts-ignore
  t.context.data = { kernelBundles, config };
});

async function main(t, argv) {
  const { kernelBundles, config } = t.context.data;
  const controller = await buildVatController(config, argv, { kernelBundles });
  await controller.run();
  return controller.dump();
}

const expectedCommitteeBinaryStartLog = [
  '=> voter vat is set up',
  '@@ schedule task for:3, currently: 0 @@',
  'invitation details check: true Voter2',
  'Alice cast a ballot on Choose for Eeny',
  'Bob cast a ballot on Choose for Meeny',
  'Carol cast a ballot on Choose for Eeny',
  'Dave cast a ballot on Choose for Eeny',
  'Verify ballot from instance: Choose, Eeny,Meeny, choose_n',
  'Emma cast a ballot on Choose for Meeny',
  'Verify: q: Choose, max: 1, committee: TheCommittee',
  'Verify: registrar: [Alleged: InstanceHandle], counter: [Alleged: InstanceHandle]',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '@@ tick:3 @@',
  '&& running a task scheduled for 3. &&',
  'vote outcome: Eeny',
];

test.serial('zoe - committee binary vote - valid inputs', async t => {
  // test.serial('zoe - committee binary vote - valid inputs', async t => {
  const dump = await main(t, ['committeeBinaryStart']);
  t.deepEqual(dump.log, expectedCommitteeBinaryStartLog);
});
