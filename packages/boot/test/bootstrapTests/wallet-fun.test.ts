/** @file use capabilities in smart wallet without offers */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { IssuerKeywordRecord } from '@agoric/zoe';
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
});
