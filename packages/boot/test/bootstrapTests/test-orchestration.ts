import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import { Fail } from '@agoric/assert';
import type { start as stakeBldStart } from '@agoric/orchestration/src/contracts/stakeBld.contract.js';
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
  console.log({ current, latest });
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

test.serial('stakeAtom', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;
  // TODO move into a vm-config for u15
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-network.js'),
  );
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-orchestration.js'),
  );
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js'),
  );

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const instance = await EV(agoricNames).lookup('instance', 'stakeAtom');
  t.truthy(instance, 'stakeAtom instance is available');

  const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  const publicFacet = await EV(zoe).getPublicFacet(instance);
  t.truthy(publicFacet, 'stakeAtom publicFacet is available');

  const account = await EV(publicFacet).createAccount();
  t.log('account', account);
  t.truthy(account, 'createAccount returns an account on ATOM connection');
  t.truthy(
    matches(account, M.remotable('ChainAccount')),
    'account is a remotable',
  );
});
