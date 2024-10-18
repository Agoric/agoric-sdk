import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';
import { WalletFactoryDriver } from '../../tools/drivers.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before('bootstrap', async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

  // TODO: handle creating watcher smart wallet _after_ deploying contract
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');
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

test.serial('accept watcher invitation', async t => {
  const { agoricNamesRemotes } = t.context;

  const william = async (sw: SmartWallet) => {
    await sw.executeOffer({
      id: 'accept',
      invitationSpec: {
        source: 'purse',
        instance: agoricNamesRemotes.instance.quickSend,
        description: 'initAccounts',
      },
      proposal: {},
    });
    const update = sw.getLatestUpdateRecord();
    t.like(update, {
      updated: 'offerStatus',
      status: { id: 'accept', numWantsSatisfied: 1, result: 'UNPUBLISHED' },
    });
  };

  const wd =
    await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');

  await william(wd);
});
