/** @file use capabilities in smart wallet without offers */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, type DepositFacet } from '@agoric/ertp';
import {
  after,
  type CurrentWalletRecord,
} from '@agoric/smart-wallet/src/smartWallet.js';
import type { NameHub } from '@agoric/vats';
import type {
  AmountKeywordRecord,
  ContractStartFn,
  IssuerKeywordRecord,
} from '@agoric/zoe';
import { start as startSwap } from '@agoric/zoe/src/contracts/atomicSwap.js';
import type {
  ContractStartFunction,
  Installation,
  StartParams,
} from '@agoric/zoe/src/zoeService/utils';
import bundleSource from '@endo/bundle-source';
import { E, type EProxy } from '@endo/eventual-send';
import type { ExecutionContext, TestFn } from 'ava';
import { createRequire } from 'node:module';
import { start as startCarrierContract } from './wallet-fun-carrier.contract.js';
import { start as startPriceContract } from './wallet-fun.contract.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext as TC,
} from './walletFactory.ts';
import { slotToBoardRemote } from '@agoric/internal/src/marshal.js';

const nodeRequire = createRequire(import.meta.url);

const test = anyTest as TestFn<TC>;

test.before(async t => {
  t.context = await makeWalletFactoryContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

const startContract = async <SF extends ContractStartFunction>(
  t: ExecutionContext<TC>,
  _startFn: SF,
  specifier: string,
  {
    name = undefined as string | undefined,
    issuers = {} as IssuerKeywordRecord,
    terms = {} as StartParams<SF>['terms'],
    privateArgs = {} as Parameters<SF>[1],
  } = {},
) => {
  const { runUtils, refreshAgoricNamesRemotes } = t.context;
  const { EV } = runUtils;
  const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  const bundle = await bundleSource(nodeRequire.resolve(specifier));

  const installation: Installation<SF> = await EV(zoe).install(bundle);
  const started = await EV(zoe).startInstance(
    installation,
    issuers,
    terms,
    privateArgs,
  );
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
    { name: 'walletFun' },
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
    (
      my = {} as { priceSetter: { setPrice(p: bigint) } },
      E = <T>(x: Awaited<T>) => x,
    ) =>
    () =>
      E(my.priceSetter).setPrice(100n);

  await wd.evalExpr(arrowBody(setPriceFn));
  const actual = await EV(started.publicFacet).getPrices();
  t.log('prices after', actual);
  t.deepEqual(actual, [100n]);
});

type WalletDriver = Awaited<
  ReturnType<TC['walletFactoryDriver']['provideSmartWallet']>
>;

const makeTrader = (
  addr: string,
  wd: WalletDriver,
  atomicSwap: Instance<typeof startSwap>,
  // XXX should be able to getTerms()
  { Asset, Price }: AmountKeywordRecord,
) => {
  return harden({
    wd,
    async startSale(t: ExecutionContext<TC>, counterpartyAddr: string) {
      t.log(...showInvitationBalance(addr, wd.getCurrentWalletRecord()));
      await wd.sendOffer({
        id: 'initate',
        invitationSpec: {
          source: 'purse',
          description: 'firstOffer',
          instance: atomicSwap,
        },
        proposal: { give: { Asset }, want: { Price } },
        after: { saveAs: 'swapInv1' },
      });
      t.log(...showInvitationBalance(addr, wd.getCurrentWalletRecord()));

      const sendFn =
        (
          my = {} as { swapInv1: Invitation },
          namesByAddress = null as unknown as NameHub,
          E = <T>(x: Awaited<T>) => x,
        ) =>
        () =>
          E(E(namesByAddress).lookup('agoric1partyB', 'depositFacet')).receive(
            my.swapInv1,
          );
      t.log(addr, 'sends firstOffer to', counterpartyAddr, arrowBody(sendFn));
      await wd.evalExpr(arrowBody(sendFn));
    },

    async buy(t: ExecutionContext<TC>) {
      t.log(...showInvitationBalance(addr, wd.getCurrentWalletRecord()));
      t.log('TODO: Bob verifies installation, issuers');
      t.like(wd.getCurrentWalletRecord().purses[0].balance.value, [
        {
          customDetails: {
            asset: { value: Asset.value },
            price: { value: Price.value },
          },
          description: 'matchOffer',
        },
      ]);

      await wd.executeOffer({
        id: 'buy',
        invitationSpec: {
          source: 'purse',
          description: 'matchOffer',
          instance: atomicSwap,
        },
        proposal: { want: { Asset }, give: { Price } },
      });

      const update = wd.getLatestUpdateRecord();
      assert.equal(update.updated, 'offerStatus');
      t.log('Buyer payouts', update.status.payouts);
      t.like(update.status.payouts, {
        Asset: { value: Asset.value },
      });
    },

    async completeSale(t: ExecutionContext<TC>) {
      const update = wd.getLatestUpdateRecord();
      assert.equal(update.updated, 'offerStatus');
      t.log('Seller payouts', update.status.payouts);
      t.like(update.status.payouts, {
        Price: { value: Price.value },
      });
    },
  });
};

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
    // XXX seller should start contract
    const swap = await startContract(
      t,
      startSwap as ContractStartFn,
      '@agoric/zoe/src/contracts/atomicSwap.js',
      { name: 'atomicSwap', issuers },
    );
    const namesByAddress =
      await EV.vat('bootstrap').consumeItem('namesByAddress');
    const depositA = await EV(namesByAddress).lookup(addr.A, 'depositFacet');
    await EV(depositA).receive(swap.creatorInvitation);
  }

  const { brand } = agoricNamesRemotes;
  const Asset = AmountMath.make(brand.ATOM as unknown as Brand, 2n);
  const Price = AmountMath.make(brand.BLD as unknown as Brand, 30n);
  // client-side presence
  const { atomicSwap } = agoricNamesRemotes.instance;
  t.truthy(atomicSwap);
  const party = {
    A: makeTrader(addr.A, wd.A, atomicSwap, { Asset, Price }),
    B: makeTrader(addr.B, wd.B, atomicSwap, { Asset, Price }),
  };

  await party.A.startSale(t, addr.B);
  await party.B.buy(t);
  await party.A.completeSale(t);
});

const makeUpgradeAdmin = (
  wd: WalletDriver,
  carrier: Instance<typeof startCarrierContract>,
) => {
  return harden({
    async redeem(t: ExecutionContext) {
      await wd.executeOffer({
        id: 'redeemInvitation',
        invitationSpec: {
          source: 'purse',
          description: 'admin',
          instance: carrier,
        },
        proposal: {},
        after: { saveAs: 'kit' },
      });
      return wd.getLatestUpdateRecord();
    },
    async restart(t: ExecutionContext) {
      const restartFn =
        (
          E = null as unknown as EProxy,
          my = {} as { kit: StartedInstanceKit<typeof startPriceContract> },
        ) =>
        () =>
          E(
            after(my.kit.publicFacet, {
              rx: my.kit.adminFacet as any, // XXX after() type
              method: 'restartContract',
              args: [my.kit.privateArgs],
            }),
          ).getIncarnation(); // use the public (TODO: creator) facet

      await wd.evalExpr(arrowBody(restartFn));
    },
    // TODO: upgrade
  });
};

// cf packages/fast-usdc-deploy/src/update-settler-reference.core.js
test('upgrade a deployed contract', async t => {
  const { walletFactoryDriver } = t.context;
  const { EV } = t.context.runUtils;
  const addr = 'agoric1admin';
  const wd = await walletFactoryDriver.provideSmartWallet(addr);

  const depositFacet = await (async () => {
    const { EV } = t.context.runUtils;
    const namesByAddress =
      await EV.vat('bootstrap').consumeItem('namesByAddress');
    const df: DepositFacet = await EV(namesByAddress).lookup(
      addr,
      'depositFacet',
    );
    return df;
  })();

  const subject = await startContract(
    t,
    startPriceContract,
    './wallet-fun.contract.js',
    { name: 'walletFun' },
  );

  const carrier = await startContract(
    t,
    startCarrierContract,
    './wallet-fun-carrier.contract.js',
    { privateArgs: { prize: subject } },
  );

  // client-side presence
  const board = await EV.vat('bootstrap').consumeItem('board');
  const carrierId = await EV(board).getId(carrier.instance);
  const cinst = slotToBoardRemote(carrierId, 'Instance') as unknown as Instance<
    typeof startCarrierContract
  >;
  const admin = makeUpgradeAdmin(wd, cinst);

  {
    const toGetPrize = await EV(carrier.creatorFacet).makeInvitation();
    t.log('sending carrier invitation facets to', addr, toGetPrize);
    await EV(depositFacet).receive(toGetPrize);
  }

  const update = await admin.redeem(t);
  t.log('redeemInvitation last update', update);
  t.like(update, {
    status: { after: { saveAs: 'kit' }, result: 'copyRecord' },
  });

  await admin.restart(t);
  t.is(await EV(subject.publicFacet).getIncarnation(), 1n);

  await admin.restart(t);
  t.is(await EV(subject.publicFacet).getIncarnation(), 2n);
});
