import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';
import { WalletFactoryDriver } from '../../tools/drivers.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test.serial('deploy contract', async t => {
  const {
    agoricNamesRemotes,
    evalProposal,
    buildProposal,
    refreshAgoricNamesRemotes,
  } = t.context;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-quickSend.js'),
  );
  // update now that quickSend is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.quickSend);
});

type SmartWallet = Awaited<
  ReturnType<WalletFactoryDriver['provideSmartWallet']>
>;

test.serial('expedited send', async t => {
  const alice = async (sw: SmartWallet) => {
    await sw.executeOffer({
      id: 'request-dest-addr',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['quickSend'],
        callPipe: [['makeInvitation']],
      },
      proposal: {},
    });
    const update = sw.getLatestUpdateRecord();
    t.like(update, {
      updated: 'offerStatus',
      status: { id: 'request-dest-addr', numWantsSatisfied: 1, result: 'TODO' },
    });
  };

  const wd =
    await t.context.walletFactoryDriver.provideSmartWallet('agoric1alice');

  await alice(wd);
});
