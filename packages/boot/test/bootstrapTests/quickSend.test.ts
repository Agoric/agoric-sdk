import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';
import { WalletFactoryDriver } from '../../tools/drivers.js';
import { computronCounter } from '../../tools/computron-counter.js';

const makeMeter = () => {
  const beansPer = 100n;
  // see https://cosgov.org/agoric?msgType=parameterChangeProposal&network=main
  const mainParams = {
    blockComputeLimit: 65_000_000n * beansPer,
    vatCreation: 300_000n * beansPer,
    xsnapComputron: beansPer,
  };

  let metering = false;
  let policy;

  const meter = harden({
    makeRunPolicy: () => {
      policy = metering ? computronCounter(mainParams) : undefined;
      return policy;
    },
    setMetering: x => (metering = x),
    getValue: () => policy.remainingBeans(),
  });
  return meter;
};

const test: TestFn<
  WalletFactoryTestContext & { meter: ReturnType<typeof makeMeter> }
> = anyTest;

test.before('bootstrap', async t => {
  const meter = makeMeter();
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
    { defaultManagerType: 'xsnap', meter },
  );
  t.context = { ...ctx, meter };

  // TODO: handle creating watcher smart wallet _after_ deploying contract
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');
});
test.after.always(t => t.context.shutdown?.());

test.serial('deploy contract', async t => {
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');

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
  const { agoricNamesRemotes, meter } = t.context;

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

  t.log('start metering');
  meter.setMetering(true);
  await william(wd);
  t.log('metered cost (beans)', meter.getValue());
});
