import type { TestFn } from 'ava';

import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const makeDefaultTestContext = async () => {
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    // A more minimal set would be better. We need governance, but not econ vats.
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
  });

  const { EV } = swingsetTestKit;

  // We need to poke at bootstrap vat and wait for results to allow
  // SwingSet to finish its boot process before we start the test
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  return { ...swingsetTestKit, zoe };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext();
});
test.after.always(t => t.context.shutdown?.());

test('Create a contract via core-eval and kill it via core-eval by boardID', async t => {
  const TEST_CONTRACT_LABEL = 'testContractLabel';
  const { EV, evaluateCoreProposal, zoe } = t.context;

  // Create a contract via core-eval.
  const creatorProposal = await buildProposal(
    '@agoric/governance/test/swingsetTests/contractGovernor/add-governedContract.js',
    [TEST_CONTRACT_LABEL],
  );
  await evaluateCoreProposal(creatorProposal);

  const { boardID, governor, instance, publicFacet } = (await EV.vat(
    'bootstrap',
  ).consumeItem(TEST_CONTRACT_LABEL)) as {
    boardID: string;
    governor: any;
    instance: any;
    publicFacet: any;
  };
  console.log('boardID', boardID);

  // Confirm behavior of the contract and its governor.
  const num = await EV(publicFacet).getNum();
  t.is(num, 602214090000000000000000n);
  const governorPublicFacet = await EV(zoe).getPublicFacet(governor);
  const governedInstance = await EV(governorPublicFacet).getGovernedContract();
  t.is(governedInstance.getKref(), instance.getKref());

  // Terminate the pair via proposal.
  const terminatorProposal = await buildProposal(
    '@agoric/vats/src/proposals/terminate-governed-instance.js',
    [`${boardID}:${TEST_CONTRACT_LABEL}`],
  );
  await evaluateCoreProposal(terminatorProposal);

  // Confirm termination.
  const expectTerminationError = p =>
    t.throwsAsync(p, { message: 'vat terminated' });
  await expectTerminationError(EV(publicFacet).getNum());
  await expectTerminationError(EV(governorPublicFacet).getGovernedContract());
});
