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
  config.defaultManagerType = 'xs-worker';

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
  'Alice cast a ballot for {"text":"Eeny"}',
  'Bob cast a ballot for {"text":"Meeny"}',
  'Carol cast a ballot for {"text":"Eeny"}',
  'Dave cast a ballot for {"text":"Eeny"}',
  'Emma cast a ballot for {"text":"Meeny"}',
  'Verify ballot from instance: {"text":"Choose"}, [{"text":"Eeny"},{"text":"Meeny"}], choose_n',
  'Verify: q: {"text":"Choose"}, max: 1, committee: TheCommittee',
  'Verify instances: registrar: true, counter: true',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '@@ tick:3 @@',
  '&& running a task scheduled for 3. &&',
  'vote outcome: {"text":"Eeny"}',
];

test.serial('zoe - committee binary vote - valid inputs', async t => {
  const dump = await main(t, ['committeeBinaryStart']);
  t.deepEqual(dump.log, expectedCommitteeBinaryStartLog);
});

const expectedCommitteeBinaryTwoQuestionsLog = [
  '=> voter vat is set up',
  'starting TWO questions test',
  'invitation details check: true Voter2',
  '@@ schedule task for:3, currently: 0 @@',
  'Alice cast a ballot on {"text":"Choose"} for {"text":"One Potato"}',
  'Bob cast a ballot on {"text":"Choose"} for {"text":"One Potato"}',
  'Carol cast a ballot on {"text":"Choose"} for {"text":"Two Potato"}',
  'Dave cast a ballot on {"text":"Choose"} for {"text":"One Potato"}',
  'Emma cast a ballot on {"text":"Choose"} for {"text":"One Potato"}',
  '@@ schedule task for:3, currently: 0 @@',
  'Alice cast a ballot on {"text":"How high?"} for {"text":"1 foot"}',
  'Bob cast a ballot on {"text":"How high?"} for {"text":"2 feet"}',
  'Carol cast a ballot on {"text":"How high?"} for {"text":"1 foot"}',
  'Dave cast a ballot on {"text":"How high?"} for {"text":"1 foot"}',
  'Emma cast a ballot on {"text":"How high?"} for {"text":"2 feet"}',
  'Verify ballot from instance: {"text":"Choose"}, [{"text":"One Potato"},{"text":"Two Potato"}], choose_n',
  'Verify: q: {"text":"Choose"}, max: 1, committee: TheCommittee',
  'Verify instances: registrar: true, counter: true',
  'Verify ballot from instance: {"text":"How high?"}, [{"text":"1 foot"},{"text":"2 feet"}], choose_n',
  'Verify: q: {"text":"How high?"}, max: 1, committee: TheCommittee',
  'Verify instances: registrar: true, counter: true',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '@@ tick:3 @@',
  '&& running a task scheduled for 3. &&',
  '&& running a task scheduled for 3. &&',
  '@@ tick:4 @@',
  'vote outcome: {"text":"One Potato"}',
  'vote outcome: {"text":"1 foot"}',
];

test.serial('zoe - committee binary vote - TwoQuestions', async t => {
  const dump = await main(t, ['committeeBinaryTwoQuestions']);
  t.deepEqual(dump.log, expectedCommitteeBinaryTwoQuestionsLog);
});
