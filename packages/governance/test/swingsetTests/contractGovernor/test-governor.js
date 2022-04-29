// @ts-check

import '@endo/init';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import path from 'path';

import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import bundleSource from '@endo/bundle-source';
import zcfBundle from '@agoric/zoe/bundles/bundle-contractFacet.js';

const CONTRACT_FILES = [
  'committee',
  'contractGovernor',
  'binaryVoteCounter',
  {
    contractPath: '/governedContract',
    bundleName: 'governedContract',
  },
];

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

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
        contractPath = `/../../../src/${settings}`;
      } else {
        ({ bundleName, contractPath } = settings);
      }
      const source = `${dirname}${contractPath}`;
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
  config.bundles = { zcf: { bundle: zcfBundle } };
  config.defaultManagerType = 'xs-worker';

  const step4 = Date.now();
  const ktime = `${(step2 - start) / 1000}s kernel`;
  const ctime = `${(step3 - step2) / 1000}s contracts`;
  const vtime = `${(step4 - step3) / 1000}s vats`;
  const ttime = `${(step4 - start) / 1000}s total`;
  console.log(`bundling: ${ktime}, ${ctime}, ${vtime}, ${ttime}`);

  // @ts-expect-error
  t.context.data = { kernelBundles, config };
});

const main = async (t, argv) => {
  const { kernelBundles, config } = t.context.data;
  const controller = await buildVatController(config, argv, { kernelBundles });
  await controller.run();
  return controller.dump();
};

const expectedcontractGovernorStartLog = [
  '=> voter and electorate vats are set up',
  'Number before: 602214090000000000000000',
  '@@ schedule task for:3, currently: 0 @@',
  'Voter Alice voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Bob voted for {"noChange":["MalleableNumber"]}',
  'Voter Carol voted for {"noChange":["MalleableNumber"]}',
  'Voter Dave voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Emma voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Alice validated all the things',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '@@ tick:3 @@',
  '&& running a task scheduled for 3. &&',
  'vote outcome: {"changes":{"MalleableNumber":"[299792458n]"}}',
  'updated to {"changes":{"MalleableNumber":"[299792458n]"}}',
  'current value of MalleableNumber is 299792458',
  'Electorate,MalleableNumber changed in a vote.',
  'Number after: 299792458',
  'MalleableNumber changed in a vote.',
];

test.serial('contract governance', async t => {
  const dump = await main(t, ['contractGovernorStart']);
  t.deepEqual(dump.log, expectedcontractGovernorStartLog);
});

const expectedChangeElectorateLog = [
  '=> voter and electorate vats are set up',
  '@@ schedule task for:2, currently: 0 @@',
  'Voter Alice voted for {"noChange":["Electorate"]}',
  'Voter Bob voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]}}}',
  'Voter Carol voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]}}}',
  'Voter Dave voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]}}}',
  'Voter Emma voted for {"noChange":["Electorate"]}',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '&& running a task scheduled for 2. &&',
  'vote outcome: {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]}}}',
  'updated to ({"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]}}})',
  'Validation complete: true',
  '@@ schedule task for:4, currently: 2 @@',
  'Voter Alice voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Bob voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Carol voted for {"noChange":["MalleableNumber"]}',
  'Voter Dave voted for {"changes":{"MalleableNumber":"[299792458n]"}}',
  'Voter Emma voted for {"noChange":["MalleableNumber"]}',
  '@@ tick:3 @@',
  '@@ tick:4 @@',
  '&& running a task scheduled for 4. &&',
  'vote outcome: {"changes":{"MalleableNumber":"[299792458n]"}}',
  'updated to {"changes":{"MalleableNumber":"[299792458n]"}}',
  'current value of MalleableNumber is 299792458',
  'Electorate,MalleableNumber changed in a vote.',
  'Electorate changed in a vote.',
  'MalleableNumber changed in a vote.',
];

test.serial('change electorate', async t => {
  const dump = await main(t, ['changeElectorateStart']);
  t.deepEqual(dump.log, expectedChangeElectorateLog);
});

const expectedBrokenUpdateLog = [
  '=> voter and electorate vats are set up',
  '@@ schedule task for:2, currently: 0 @@',
  'Voter Alice voted for {"noChange":["Electorate","MalleableNumber"]}',
  'Voter Bob voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Carol voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Dave voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Emma voted for {"noChange":["Electorate","MalleableNumber"]}',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '&& running a task scheduled for 2. &&',
  'vote outcome: {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Validation complete: true',
  // [`prepareToSetInvitation`](https://github.com/Agoric/agoric-sdk/blob/c6570b015fd23c411e48981bec309b32eedd3a28/packages/governance/src/contractGovernance/paramManager.js#L199-L212)
  // does a `Promise.all` on 2 calls using the `invite` promise. If that promise
  // is rejected, this will result in a rejection race between the 2 paths. The
  // following 2 entries may come back as the commented out lines if the kernel
  // changes the order in which messages are processed.
  // TODO: allow either message
  // 'vote rejected outcome: Error: (an object) was not a live payment for brand (an object). It could be a used-up payment, a payment for another brand, or it might not be a payment at all.',
  // 'update failed: Error: (an object) was not a live payment for brand (an object). It could be a used-up payment, a payment for another brand, or it might not be a payment at all.',
  'vote rejected outcome: Error: A Zoe invitation is required, not (an object)',
  'update failed: Error: A Zoe invitation is required, not (an object)',
  'current value of MalleableNumber is 602214090000000000000000',
  'Electorate,MalleableNumber changed in a vote.',
];

test.serial('brokenUpdateStart', async t => {
  const dump = await main(t, ['brokenUpdateStart']);
  t.deepEqual(dump.log, expectedBrokenUpdateLog);
});

const changeTwoParamsLog = [
  '=> voter and electorate vats are set up',
  '@@ schedule task for:2, currently: 0 @@',
  'Voter Alice voted for {"noChange":["Electorate","MalleableNumber"]}',
  'Voter Bob voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Carol voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Dave voted for {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Voter Emma voted for {"noChange":["Electorate","MalleableNumber"]}',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '&& running a task scheduled for 2. &&',
  'vote outcome: {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}}',
  'Validation complete: true',
  'updated to ({"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}})',
  'successful outcome: {"changes":{"Electorate":{"brand":"[Alleged: Zoe Invitation brand]","value":[{"description":"questionPoser","handle":"[Alleged: InvitationHandle]","installation":"[Alleged: Installation]","instance":"[Alleged: InstanceHandle]"}]},"MalleableNumber":"[42n]"}} ',
  'current value of MalleableNumber is 42',
  'Electorate,MalleableNumber changed in a vote.',
  'Electorate,MalleableNumber changed in a vote.',
];

test.serial('changeTwoParams', async t => {
  const dump = await main(t, ['changeTwoParams']);
  t.deepEqual(dump.log, changeTwoParamsLog);
});

const expectedApiGovernanceLog = [
  '=> voter and electorate vats are set up',
  'Number before: 0',
  '@@ schedule task for:2, currently: 0 @@',
  'Voter Alice voted for {"dontInvoke":"governanceApi"}',
  'Voter Bob voted for {"apiMethodName":"governanceApi","methodArgs":[]}',
  'Voter Carol voted for {"apiMethodName":"governanceApi","methodArgs":[]}',
  'Voter Dave voted for {"apiMethodName":"governanceApi","methodArgs":[]}',
  'Voter Emma voted for {"dontInvoke":"governanceApi"}',
  '@@ tick:1 @@',
  '@@ tick:2 @@',
  '&& running a task scheduled for 2. &&',
  'vote outcome: {"apiMethodName":"governanceApi","methodArgs":[]}',
  'update value: {"apiMethodName":"governanceApi","methodArgs":[]}',
  'Number after: 1',
];

test.serial('api Governance', async t => {
  const dump = await main(t, ['contractApiGovernanceStart']);
  t.deepEqual(dump.log, expectedApiGovernanceLog);
});
