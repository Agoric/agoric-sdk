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

test.serial('stakeAtom - repl-style', async t => {
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

  const account = await EV(publicFacet).makeAccount();
  t.log('account', account);
  t.truthy(account, 'makeAccount returns an account on ATOM connection');
  t.truthy(
    matches(account, M.remotable('ChainAccount')),
    'account is a remotable',
  );

  const atomBrand = await EV(agoricNames).lookup('brand', 'ATOM');
  const atomAmount = AmountMath.make(atomBrand, 10n);

  const res = await EV(account).delegate('cosmosvaloper1test', atomAmount);
  t.is(res, 'Success', 'delegate returns Success');
});

test.serial('stakeAtom - smart wallet', async t => {
  const { agoricNamesRemotes } = t.context;

  const wd = await t.context.walletFactoryDriver.provideSmartWallet(
    'agoric1testStakAtom',
  );

  await wd.executeOffer({
    id: 'request-account',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeAtom'],
      callPipe: [['makeAccountInvitation']],
    },
    proposal: {},
  });
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      ['request-account', { account: 'published.stakeAtom' }],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-account', numWantsSatisfied: 1 },
  });

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;

  await t.notThrowsAsync(
    wd.executeOffer({
      id: 'request-delegate-success',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: ['cosmosvaloper1test', { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
  );
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-delegate-success', numWantsSatisfied: 1 },
  });

  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-fail',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: ['cosmosvaloper1fail', { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
    'delegate fails with invalid validator',
  );
});
