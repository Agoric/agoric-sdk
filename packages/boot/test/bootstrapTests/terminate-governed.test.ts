import { createRequire } from 'node:module';

import type { TestFn } from 'ava';

import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { NonNullish } from '@agoric/internal';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const { resolve: resolvePath } = createRequire(import.meta.url);

// A more minimal set would be better. We need governance, but not econ vats.
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';

const makeDefaultTestContext = async () => {
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configOverrides: NonNullish(
      await loadSwingsetConfigFile(resolvePath(PLATFORM_CONFIG)),
    ),
  });

  const { runNextBlock, runUtils } = swingsetTestKit;
  await runNextBlock();

  const { EV } = runUtils;

  // We need to poke at bootstrap vat and wait for results to allow
  // SwingSet to finish its boot process before we start the test
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  return { ...swingsetTestKit, zoe };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => (t.context = await makeDefaultTestContext()));
test.after.always(t => t.context.shutdown?.());

test(`Create a contract via core-eval and kill it via core-eval by boardID `, async t => {
  const TEST_CONTRACT_LABEL = 'testContractLabel';
  const { evaluateProposal, runNextBlock, runUtils, zoe } = t.context;
  const { EV } = runUtils;

  // Create a contract via core-eval.
  const creatorProposal = await buildProposal(
    '@agoric/governance/test/swingsetTests/contractGovernor/add-governedContract.js',
    [TEST_CONTRACT_LABEL],
  );
  await evaluateProposal(creatorProposal);

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
  const terminatorProposal = await buildProposal(
    '@agoric/vats/src/proposals/terminate-governed-instance.js',
    [`${boardID}:${TEST_CONTRACT_LABEL}`],
  );
  await evaluateProposal(terminatorProposal);

  await runNextBlock();

  // Confirm termination.
  const expectTerminationError = p =>
    t.throwsAsync(p, { message: 'vat terminated' });
  await expectTerminationError(EV(publicFacet).getNum());
  await expectTerminationError(EV(governorPublicFacet).getGovernedContract());
});
