/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { withChainCapabilities } from '@agoric/orchestration';
import type { start as startElysContract } from '@agoric/orchestration/src/examples/elys.contract.js';
import { commonSetup } from '@agoric/orchestration/test/supports.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

/**
 * This test core-evals an installation of the Elys contract that
 * initiates an IBC Transfer. Since that goes over a bridge and is tracked
 * by a vow, we can restart the contract and see that the vow settles. We
 * can manually trigger a bridge event in the testing context.
 *
 * As such, this demonstrates the ability to resume an async-flow for which
 * a host vow settles after an upgrade.
 */
test('resume', async t => {
  const {
    bridgeUtils: { runInbound },
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;

  // const {
  //   commonPrivateArgs,
  //   mocks: { transferBridge, ibcBridge },
  //   utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  // } = await commonSetup(t);

  await commonSetup(t);

  t.log('Initialising Elys contract');

  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/init-elys-contract.js', [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
      '--assetInfo',
      JSON.stringify([
        [
          'uist',
          {
            baseDenom: 'uist',
            brandKey: 'IST',
            baseName: 'agoric',
            chainName: 'agoric',
          },
        ],
      ]),
    ]),
  );
  let agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  let instance: Instance<typeof startElysContract> = await EV(
    agoricNames,
  ).lookup('instance', 'ElysContract');
  t.truthy(instance, 'elysContract instance is available');

  t.log('Upgrading elysContract');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/upgrade-elys-contract.js'),
  );

  agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  instance = await EV(agoricNames).lookup('instance', 'ElysContract');
  t.truthy(instance, 'elysContract instance is available');
});
