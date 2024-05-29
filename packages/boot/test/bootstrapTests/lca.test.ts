import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import type { start as stakeBldStart } from '@agoric/orchestration/src/examples/stakeBld.contract.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { M, matches } from '@endo/patterns';
import { makeWalletFactoryContext } from './walletFactory.ts';

type DefaultTestContext = Awaited<ReturnType<typeof makeWalletFactoryContext>>;

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeWalletFactoryContext(t)));
test.after.always(t => t.context.shutdown?.());

test.serial('stakeBld', async t => {
  const {
    agoricNamesRemotes,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
  } = t.context;
  // TODO move into a vm-config for u15
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-localchain.js'),
  );
  // start-stakeBld depends on this. Sanity check in case the context changes.
  const { BLD } = agoricNamesRemotes.brand;
  BLD || Fail`BLD missing from agoricNames`;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeBld.js'),
  );
  // update now that stakeBld is instantiated
  refreshAgoricNamesRemotes();
  const stakeBld = agoricNamesRemotes.instance.stakeBld as Instance<
    typeof stakeBldStart
  >;
  t.truthy(stakeBld);

  const wd = await t.context.walletFactoryDriver.provideSmartWallet(
    'agoric1testStakeBld',
  );

  await wd.executeOffer({
    id: 'request-stake',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeBld'],
      callPipe: [['makeStakeBldInvitation']],
    },
    proposal: {
      give: {
        // @ts-expect-error XXX BoardRemote
        In: { brand: BLD, value: 10n },
      },
    },
  });

  const current = await wd.getCurrentWalletRecord();
  const latest = await wd.getLatestUpdateRecord();
  t.like(current, {
    offerToPublicSubscriberPaths: [
      // TODO publish something useful
      ['request-stake', { account: 'published.stakeBld' }],
    ],
  });
  t.like(latest, {
    status: { id: 'request-stake', numWantsSatisfied: 1 },
  });

  await wd.executeOffer({
    id: 'request-delegate',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-stake',
      invitationMakerName: 'Delegate',
      invitationArgs: ['agoric1validator1', { brand: BLD, value: 10n }],
    },
    proposal: {
      give: {
        // @ts-expect-error XXX BoardRemote
        In: { brand: BLD, value: 10n },
      },
    },
  });
});
