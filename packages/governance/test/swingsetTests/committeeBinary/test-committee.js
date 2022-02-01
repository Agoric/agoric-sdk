// @ts-check

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/babel-standalone';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@endo/init';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@endo/bundle-source';
import path from 'path';

const CONTRACT_FILES = ['committee', 'binaryVoteCounter'];

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

test.before(async t => {
  const start = Date.now();
  const kernelBundles = await buildKernelBundles();
  const step2 = Date.now();
  const contractBundles = {};
  await Promise.all(
    CONTRACT_FILES.map(async settings => {
      const bundleName = settings;
      const contractPath = settings;
      const source = `${dirname}/../../../src/${contractPath}`;
      const bundle = await bundleSource(source);
      contractBundles[bundleName] = bundle;
    }),
  );
  const step3 = Date.now();

  const vats = {};
  await Promise.all(
    ['voter', 'zoe'].map(async name => {
      const source = `${dirname}/vat-${name}.js`;
      const bundle = await bundleSource(source);
      vats[name] = { bundle };
    }),
  );
  const bootstrapSource = `${dirname}/bootstrap.js`;
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
  'Alice voted for {"text":"Eeny"}',
  'Bob voted for {"text":"Meeny"}',
  'Carol voted for {"text":"Eeny"}',
  'Dave voted for {"text":"Eeny"}',
  'Emma voted for {"text":"Meeny"}',
  'verify question from instance: {"text":"Choose"}, [{"text":"Eeny"},{"text":"Meeny"}], unranked',
  'Verify: q: {"text":"Choose"}, max: 1, committee: TheCommittee',
  'Verify instances: electorate: true, counter: true',
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
  'Alice voted on {"text":"Choose"} for {"text":"One Potato"}',
  'Bob voted on {"text":"Choose"} for {"text":"One Potato"}',
  'Carol voted on {"text":"Choose"} for {"text":"Two Potato"}',
  'Dave voted on {"text":"Choose"} for {"text":"One Potato"}',
  'Emma voted on {"text":"Choose"} for {"text":"One Potato"}',
  '@@ schedule task for:4, currently: 0 @@',
  'Alice voted on {"text":"How high?"} for {"text":"1 foot"}',
  'Bob voted on {"text":"How high?"} for {"text":"2 feet"}',
  'Carol voted on {"text":"How high?"} for {"text":"1 foot"}',
  'Dave voted on {"text":"How high?"} for {"text":"1 foot"}',
  'Emma voted on {"text":"How high?"} for {"text":"2 feet"}',
  'verify question from instance: {"text":"Choose"}, [{"text":"One Potato"},{"text":"Two Potato"}], unranked',
  'Verify: q: {"text":"Choose"}, max: 1, committee: TheCommittee',
  'Verify instances: electorate: true, counter: true',
  'verify question from instance: {"text":"How high?"}, [{"text":"1 foot"},{"text":"2 feet"}], unranked',
  'Verify: q: {"text":"How high?"}, max: 1, committee: TheCommittee',
  'Verify instances: electorate: true, counter: true',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '@@ tick:3 @@',
  '&& running a task scheduled for 3. &&',
  '@@ tick:4 @@',
  '&& running a task scheduled for 4. &&',
  'vote outcome: {"text":"One Potato"}',
  'vote outcome: {"text":"1 foot"}',
];

test.serial('zoe - committee binary vote - TwoQuestions', async t => {
  const dump = await main(t, ['committeeBinaryTwoQuestions']);
  t.deepEqual(dump.log, expectedCommitteeBinaryTwoQuestionsLog);
});
