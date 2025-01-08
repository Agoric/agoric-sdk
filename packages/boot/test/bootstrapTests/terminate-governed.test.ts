import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { makeSwingsetTestKit } from '../../tools/supports.js';

// A more minimal set would be better. We need governance, but not econ vats.
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';

const makeDefaultTestContext = async t => {
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: PLATFORM_CONFIG,
  });
  const { runUtils } = swingsetTestKit;
  const { EV } = runUtils;

  // We need to poke at bootstrap vat and wait for results to allow
  // SwingSet to finish its boot process before we start the test
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  return { zoe, ...swingsetTestKit };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});

test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test(`Create a contract via core-eval and kill it via core-eval by boardID `, async t => {
  const TEST_CONTRACT_LABEL = 'testContractLabel';
  const { runUtils, buildProposal, evalProposal, zoe } = t.context;
  const { EV } = runUtils;

  // Create a contract via core-eval.
  const creatorProposal = buildProposal(
    '@agoric/governance/test/swingsetTests/contractGovernor/add-governedContract.js',
    [TEST_CONTRACT_LABEL],
  );
  await evalProposal(creatorProposal);

  const { boardID, governor, instance, publicFacet } = (await EV.vat(
    'bootstrap',
  ).consumeItem(TEST_CONTRACT_LABEL)) as {
    boardID: string;
    governor: any;
    instance: any;
    publicFacet: any;
  };
  t.log('boardID', boardID);

  // Confirm behavior of the contract and its governor.
  const num = await EV(publicFacet).getNum();
  t.is(num, 602214090000000000000000n);
  const governorPublicFacet = await EV(zoe).getPublicFacet(governor);
  const governedInstance = await EV(governorPublicFacet).getGovernedContract();
  t.is(governedInstance.getKref(), instance.getKref());

  // Terminate the pair via proposal.
  const terminatorProposal = buildProposal(
    '@agoric/builders/scripts/vats/terminate-governed-instance.js',
    [`${boardID}:${TEST_CONTRACT_LABEL}`],
  );
  await evalProposal(terminatorProposal);

  // Confirm termination.
  const expectTerminationError = p =>
    t.throwsAsync(p, { message: 'vat terminated' });
  await expectTerminationError(EV(publicFacet).getNum());
  await expectTerminationError(EV(governorPublicFacet).getGovernedContract());
});
