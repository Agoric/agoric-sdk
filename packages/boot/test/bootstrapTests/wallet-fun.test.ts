/** @file use capabilities in smart wallet without offers */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { NameHub } from '@agoric/vats';
import type { IssuerKeywordRecord } from '@agoric/zoe';
import { start as startSwap } from '@agoric/zoe/src/contracts/atomicSwap.js';
import type { Installation } from '@agoric/zoe/src/zoeService/utils';
import bundleSource from '@endo/bundle-source';
import type { ExecutionContext, TestFn } from 'ava';
import { createRequire } from 'node:module';
import { start as startPriceContract } from './wallet-fun.contract.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext as TC,
} from './walletFactory.ts';

const nodeRequire = createRequire(import.meta.url);

const test = anyTest as TestFn<TC>;

test.before(async t => {
  t.context = await makeWalletFactoryContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

const startContract = async <SF>(
  t: ExecutionContext<TC>,
  _startFn: SF,
  specifier: string,
  name?: string,
  issuers?: IssuerKeywordRecord,
) => {
  const { runUtils, refreshAgoricNamesRemotes } = t.context;
  const { EV } = runUtils;
  const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  const bundle = await bundleSource(nodeRequire.resolve(specifier));

  const installation: Installation<SF> = await EV(zoe).install(bundle);
  const started = await EV(zoe).startInstance(installation, issuers);
  t.log('started', specifier, Object.keys(started));

  if (name) {
    const agoricNamesAdmin =
      await EV.vat('bootstrap').consumeItem('agoricNamesAdmin');
    const instanceAdmin = await EV(agoricNamesAdmin).lookupAdmin('instance');
    await EV(instanceAdmin).update(name, started.instance);
    refreshAgoricNamesRemotes();
  }
  return started;
};

const arrowBody = (f: Function) =>
  `${f}`.match(/\(\) =>\s*(?<body>[\s\S]*)/m)?.groups?.body || assert.fail();

const showInvitationBalance = (addr: string, r: CurrentWalletRecord) => [
  addr,
  'has invitations',
  r.purses.flatMap(p => p.balance.value),
];

test('use offer result without zoe', async t => {
  const { walletFactoryDriver, agoricNamesRemotes } = t.context;
  const { EV } = t.context.runUtils;
  const namesByAddress =
    await EV.vat('bootstrap').consumeItem('namesByAddress');

  const started = await startContract(
    t,
    startPriceContract,
    './wallet-fun.contract.js',
    'walletFun',
  );
  const toSetPrices = await EV(started.creatorFacet).makeAdminInvitation();

  // client-side presence
  const { walletFun } = agoricNamesRemotes.instance;
  t.truthy(walletFun);

  const addr = 'agoric1admin';
  const wd = await walletFactoryDriver.provideSmartWallet(addr);
  const df = await EV(namesByAddress).lookup(addr, 'depositFacet');
  await EV(df).receive(toSetPrices);
  t.log(...showInvitationBalance(addr, wd.getCurrentWalletRecord()));

  await wd.executeOffer({
    id: 'redeemInvitation',
    invitationSpec: {
      source: 'purse',
      description: 'admin',
      instance: walletFun,
    },
    proposal: {},
    after: { saveAs: 'priceSetter' },
  });
  t.log('redeemInvitation last update', wd.getLatestUpdateRecord());

  const initialPrices = await EV(started.publicFacet).getPrices();
  t.log({ initialPrices });
  t.deepEqual(initialPrices, [0n]);

  const setPriceFn =
    (nameHub = null as unknown as NameHub, E = <T>(x: Awaited<T>) => x) =>
    () =>
      E(nameHub.lookup('priceSetter')).setPrice(100n);

  await wd.evalExpr(arrowBody(setPriceFn));
  const actual = await EV(started.publicFacet).getPrices();
  t.log('prices after', actual);
  t.deepEqual(actual, [100n]);
});

test('use Invitation offer result in atomicSwap', async t => {
  const { walletFactoryDriver, agoricNamesRemotes } = t.context;
  const addr = { A: 'agoric1partyA', B: 'agoric1partyB' };
  const wd = {
    A: await walletFactoryDriver.provideSmartWallet(addr.A),
    B: await walletFactoryDriver.provideSmartWallet(addr.B),
  };

  {
    // in kernel world...
    const { EV } = t.context.runUtils;
    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    const issuerHub = await EV(agoricNames).lookup('issuer');
    const issuers = {
      Asset: await EV(issuerHub).lookup('ATOM'),
      Price: await EV(issuerHub).lookup('BLD'),
    };
    const swap = await startContract(
      t,
      startSwap,
      '@agoric/zoe/src/contracts/atomicSwap.js',
      'atomicSwap',
      issuers,
    );
    const namesByAddress =
      await EV.vat('bootstrap').consumeItem('namesByAddress');
    const depositA = await EV(namesByAddress).lookup(addr.A, 'depositFacet');
    // @ts-expect-error atomicSwap provides creatorInvitation
    await EV(depositA).receive(swap.creatorInvitation);
    t.log(...showInvitationBalance(addr.A, wd.A.getCurrentWalletRecord()));
  }

  const { brand } = agoricNamesRemotes;
  const Asset = AmountMath.make(brand.ATOM as unknown as Brand, 2n);
  const Price = AmountMath.make(brand.BLD as unknown as Brand, 30n);
  // client-side presence
  const { atomicSwap } = agoricNamesRemotes.instance;
  t.truthy(atomicSwap);
  await wd.A.sendOffer({
    id: 'offer1st',
    invitationSpec: {
      source: 'purse',
      description: 'firstOffer',
      instance: atomicSwap,
    },
    proposal: { give: { Asset }, want: { Price } },
    after: { saveAs: 'swapInv1' },
  });

  t.log(...showInvitationBalance(addr.A, wd.A.getCurrentWalletRecord()));

  const sendFn =
    (
      nameHub = null as unknown as NameHub,
      namesByAddress = null as unknown as NameHub,
      E = <T>(x: Awaited<T>) => x,
    ) =>
    () =>
      E(E(namesByAddress).lookup('agoric1partyB', 'depositFacet')).receive(
        nameHub.lookup('swapInv1'),
      );
  t.log('A sends firstOffer to B', arrowBody(sendFn));
  await wd.A.evalExpr(arrowBody(sendFn));
  t.log(...showInvitationBalance(addr.A, wd.A.getCurrentWalletRecord()));
  t.log(...showInvitationBalance(addr.B, wd.B.getCurrentWalletRecord()));
  t.log('TODO: Bob verifies installation, issuers');
  t.like(wd.B.getCurrentWalletRecord().purses[0].balance.value, [
    {
      customDetails: {
        asset: { value: Asset.value },
        price: { value: Price.value },
      },
      description: 'matchOffer',
    },
  ]);

  await wd.B.executeOffer({
    id: 'offerB',
    invitationSpec: {
      source: 'purse',
      description: 'matchOffer',
      instance: atomicSwap,
    },
    proposal: { want: { Asset }, give: { Price } },
  });
  t.log('A last update after swap', wd.A.getLatestUpdateRecord());
  // @ts-expect-error TODO: .status type check
  t.log('A payouts', wd.A.getLatestUpdateRecord().status.payouts);
  t.log('B last update after swap', wd.B.getLatestUpdateRecord());
  // @ts-expect-error TODO: .status type check
  t.log('B payouts', wd.B.getLatestUpdateRecord().status.payouts);
});
