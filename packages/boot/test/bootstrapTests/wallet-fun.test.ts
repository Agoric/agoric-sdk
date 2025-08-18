/** @file use capabilities in smart wallet without offers */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import { start as startPriceContract } from '@agoric/smart-wallet/test/wallet-fun.contract.js';
import type { IssuerKeywordRecord } from '@agoric/zoe';
import type { Installation } from '@agoric/zoe/src/zoeService/utils';
import bundleSource from '@endo/bundle-source';
import type { ExecutionContext, TestFn } from 'ava';
import { createRequire } from 'node:module';
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

const showInvitationBalance = (addr: string, r: CurrentWalletRecord) => [
  addr,
  'has invitations',
  r.purses.flatMap(p => p.balance.value),
];

test('use offer result without zoe', async t => {
  const { walletFactoryDriver, agoricNamesRemotes } = t.context;

  const makeCoreCtx = (addr: string) => {
    const start = async () => {
      const { EV } = t.context.runUtils;
      const namesByAddress =
        await EV.vat('bootstrap').consumeItem('namesByAddress');

      const started = await startContract(
        t,
        startPriceContract,
        '@agoric/smart-wallet/test/wallet-fun.contract.js',
        'walletFun',
      );
      const toSetPrices = await EV(started.creatorFacet).makeAdminInvitation();
      const df = await EV(namesByAddress).lookup(addr, 'depositFacet');
      const rxd = EV(df).receive(toSetPrices);
      const getPrices = async () => {
        const p = await EV(started.publicFacet).getPrices();
        return p;
      };
      return harden({ getReceived: () => rxd, getPrices });
    };

    return harden({ start });
  };

  // client-side presence
  const addr = 'agoric1admin';
  const wd = await walletFactoryDriver.provideSmartWallet(addr);

  const makePriceOracle = () => {
    const redeemInvitation = async () => {
      const { walletFun } = agoricNamesRemotes.instance;
      t.truthy(walletFun);

      t.log(...showInvitationBalance(addr, wd.getCurrentWalletRecord()));

      await wd.executeOffer({
        id: 'redeemInvitation',
        invitationSpec: {
          source: 'purse',
          description: 'admin',
          instance: walletFun,
        },
        proposal: {},
        saveResult: { name: 'priceSetter' },
      });
      t.log('redeemInvitation last update', wd.getLatestUpdateRecord());
    };

    const useOfferResult = () =>
      wd.invokeEntry({
        targetName: 'priceSetter',
        method: 'setPrice',
        args: [100n],
      });

    return harden({ redeemInvitation, useOfferResult });
  };

  const core = makeCoreCtx(addr);
  const { getPrices, getReceived } = await core.start();

  const oracle = makePriceOracle();
  await oracle.redeemInvitation();
  await getReceived();
  const initialPrices = await getPrices();
  t.log({ initialPrices });
  t.deepEqual(initialPrices, [0n], 'initial price');

  await oracle.useOfferResult();
  await eventLoopIteration();
  const actual = await getPrices();
  t.log('prices after', actual);
  t.deepEqual(actual, [100n], 'updated price');
});
