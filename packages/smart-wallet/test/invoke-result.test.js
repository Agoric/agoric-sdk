/** @file test {@link InvokeStoreEntryAction} */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import { makeCopyBag } from '@agoric/store';
import { E, passStyleOf } from '@endo/far';
import { deploy } from '../tools/wf-tools.js';
import * as gameExports from './gameAssetContract.js';
import * as priceExports from './wallet-fun.contract.js';

/**
 * @import {TestFn, ExecutionContext, ThrowsExpectation} from 'ava'
 * @import {InvokeEntryMessage, OfferSpec, ResultPlan} from '../src/offers.js';
 * @import {InvokeStoreEntryAction, SmartWallet} from '../src/smartWallet.js';
 * @import {Instance} from '@agoric/zoe';
 */

/**
 * @typedef {Awaited<ReturnType<typeof makeTestContext>>} WTestCtx
 */

const contractName = 'walletFactory';
const { make } = AmountMath;

/** @type {TestFn<WTestCtx>} */
const test = anyTest;

const makeTestContext = async t => {
  t.log('contract deployment', contractName);
  const deployed = await deploy();
  return deployed;
};

test.beforeEach(async t => (t.context = await makeTestContext(t)));

test(`deploy ${contractName}`, async t => {
  const { walletFactoryFacets } = t.context;

  t.deepEqual(objectMap(walletFactoryFacets, passStyleOf), {
    adminFacet: 'remotable',
    creatorFacet: 'remotable',
    creatorInvitation: 'undefined',
    instance: 'remotable',
    publicFacet: 'remotable',
  });
});

test(`provision smartWallet`, async t => {
  const { provisionSmartWallet } = t.context;
  const addr = 'agoric1admin';
  const [wallet, isNew] = await provisionSmartWallet(addr);
  t.is(passStyleOf(wallet), 'remotable');
  t.true(isNew);
});

test('start game contract; make offer', async t => {
  const startGameContract = async () => {
    const { board, zoe, utils } = t.context.bootstrap;

    t.log('start game contract');
    const installation = utils.bundleAndInstall(gameExports);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const terms = { joinPrice: make(feeBrand, 0n) };
    const { instance } = await E(zoe).startInstance(installation, {}, terms);
    const { brands, issuers } = await E(zoe).getTerms(instance);

    const gameAsset = { issuer: issuers.Place, brand: brands.Place };
    t.log('authorize game asset for use by walletFactory', gameAsset);
    const { agoricNamesAdmin } = t.context.bootstrap;
    const { entries } = Object;
    for (const [kind, thing] of entries(gameAsset)) {
      await E(E(agoricNamesAdmin).lookupAdmin(kind)).update('Place', thing);
    }

    // the client can see objects via the board
    const ids = {
      instance: board.getId(instance),
      brand: board.getId(gameAsset.brand),
    };
    return { instance, issuers, brands, ids };
  };

  const { instance, brands, ids } = await startGameContract();

  const { provisionSmartWallet } = t.context;
  const { readLegible } = t.context.bootstrap.utils;

  const addr = 'agoric1player';
  const [wallet] = await provisionSmartWallet(addr);
  const { Place, Price } = brands;
  const proposal = {
    want: { Places: make(Place, makeCopyBag([['scroll', 1n]])) },
    give: { Price: make(Price, 0n) },
  };
  /** @type {OfferSpec} */
  const spec = {
    id: 'join-1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeJoinInvitation',
    },
    proposal,
  };

  const offersP = E(wallet).getOffersFacet();
  await t.notThrowsAsync(E(offersP).executeOffer(spec));

  const { structure, slots } = await readLegible(`ROOT.wallet.${addr}`);
  t.log('last wallet update', structure);
  t.log('payouts', structure.status.payouts);
  t.is(structure.status.result, 'welcome to the game');
  t.deepEqual(structure.status.payouts, {
    Places: {
      brand: '$1.Alleged: Place brand',
      value: {
        '#tag': 'copyBag',
        payload: [['scroll', '+1']],
      },
    },
    Price: {
      brand: '$2.Alleged: ZDEFAULT brand',
      value: '+0',
    },
  });
  t.deepEqual(slots, [ids.instance, ids.brand, 'board0371']);
});

/**
 * @param {ExecutionContext<Awaited<ReturnType<typeof makeTestContext>>>} t
 * @param {string} addr
 */
const startPriceContract = async (t, addr) => {
  const { board, zoe, namesByAddress, utils } = t.context.bootstrap;

  t.log('start price contract');
  const installation = utils.bundleAndInstall(priceExports);
  const { instance, creatorFacet, publicFacet } =
    await E(zoe).startInstance(installation);

  const toSetPrices = await E(creatorFacet).makeAdminInvitation();
  const df = await E(namesByAddress).lookup(addr, 'depositFacet');
  const rxd = E(df).receive(toSetPrices);
  const getPrices = async () => E(publicFacet).getPrices();
  const getValue = async () => E(publicFacet).getValue();

  // the client can see objects via the board
  const ids = {
    instance: board.getId(instance),
  };

  return harden({
    instance,
    ids,
    tools: { getReceived: () => rxd, getPrices, getValue },
  });
};

/**
 * @param {object} opts
 * @param {Instance} opts.instance
 * @param {string} [opts.id]
 * @returns {OfferSpec}
 */
const makeRedeemAdminInvitationOffer = ({ instance, id = 'redeem-1' }) => ({
  id,
  invitationSpec: {
    source: 'purse',
    instance,
    description: 'admin',
  },
  proposal: {},
  saveResult: { name: 'priceSetter' },
});

/**
 * @param {ExecutionContext<WTestCtx>} t
 * @param {object} powers
 * @param {SmartWallet} powers.wallet
 * @param {Instance} powers.instance
 * @param {ThrowsExpectation<any>} [expectedError]
 */
const redeemAdminInvitation = async (
  t,
  { wallet, instance },
  expectedError,
) => {
  t.log('redeem price admin invitation');
  const redeemSpec = makeRedeemAdminInvitationOffer({ instance });

  const offersP = E(wallet).getOffersFacet();
  const result = E(offersP).executeOffer(redeemSpec);
  const expectedOutcome = expectedError
    ? t.throwsAsync(result, expectedError)
    : t.notThrowsAsync(result);
  await expectedOutcome;
};

test('start price contract; set prices', async t => {
  const { provisionSmartWallet } = t.context;
  const addr = 'agoric1price-oracle';
  const [wallet] = await provisionSmartWallet(addr);
  const { instance, ids, tools } = await startPriceContract(t, addr);
  t.deepEqual(await tools.getPrices(), []); // no admins

  await tools.getReceived();
  await redeemAdminInvitation(t, { wallet, instance });

  const { readLegible } = t.context.bootstrap.utils;
  const { structure, slots } = await readLegible(`ROOT.wallet.${addr}`);
  t.log('last wallet update', structure);
  t.log('payouts', structure.status.payouts);
  t.deepEqual(structure.status.result, {
    name: 'priceSetter',
    passStyle: 'remotable',
  });
  t.deepEqual(structure.status.payouts, {});
  t.deepEqual(slots, [ids.instance]);

  t.deepEqual(await tools.getPrices(), [0n]); // 1 admin w/0 price

  const invokeP = E(wallet).getInvokeFacet();
  await t.notThrowsAsync(
    E(invokeP).invokeEntry({
      id: 123,
      targetName: 'priceSetter',
      method: 'setPrice',
      args: [100n],
    }),
  );

  t.deepEqual(await tools.getPrices(), [100n]); // 1 admin w/100 price

  {
    const tracked = await readLegible(`ROOT.wallet.${addr}`);
    t.log('tracked invocation ', tracked);
    t.like(tracked.structure, {
      updated: 'invocation',
      id: 123,
      result: { passStyle: 'undefined' },
    });
  }

  await E(invokeP).invokeEntry({
    id: 1234,
    targetName: 'priceSetter',
    method: 'setPrice',
    args: ['bogus'],
  });
  {
    const tracked = await readLegible(`ROOT.wallet.${addr}`);
    t.log('tracked invocation ', tracked);
    t.like(tracked.structure, {
      updated: 'invocation',
      id: 1234,
      error:
        'Error: In "setPrice" method of (Admin): arg 0: string "bogus" - Must be a bigint',
    });
  }
});

test('save result of method call - overwrite cases', async t => {
  const { provisionSmartWallet, bootstrap } = t.context;
  const addr = 'agoric1price-oracle2';
  const [wallet] = await provisionSmartWallet(addr);
  const offersP = E(wallet).getOffersFacet();
  const invokeP = E(wallet).getInvokeFacet();
  const { instance, tools } = await startPriceContract(t, addr);

  await tools.getReceived();
  await redeemAdminInvitation(t, { wallet, instance });

  /**
   * @param {number} offset
   * @param {ResultPlan} saveResult
   */
  const doOffsetOffer = async (offset, saveResult) => {
    await E(offersP).executeOffer({
      id: `setter-${offset}`,
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker: 'makeValueSetterInvitation',
      },
      proposal: {},
      offerArgs: { offset },
      saveResult,
    });
  };

  const useValue = async (targetName, value) => {
    await E(invokeP).invokeEntry({
      targetName,
      method: 'setValue',
      args: [value],
    });
    return tools.getValue();
  };

  const { readLegible } = bootstrap.utils;

  // present? no
  await doOffsetOffer(1, { name: `thing-1`, overwrite: false });
  t.is(await useValue('thing-1', 5), 6);
  await doOffsetOffer(2, { name: `thing-2`, overwrite: true });
  t.is(await useValue('thing-2', 6), 8);

  // present? yes
  await doOffsetOffer(11, { name: `thing-1`, overwrite: false });
  t.is(await useValue('thing-1', 5), 6);

  // what name was it stored under?
  const { structure } = await readLegible(`ROOT.wallet.${addr}`);
  const { name } = structure.status.result;
  t.log('overwrite: false, so name is', name);
  t.is(await useValue(name, 5), 16);

  await doOffsetOffer(12, { name: `thing-2`, overwrite: true });
  t.is(await useValue('thing-2', 6), 18);
});

test('invoke with bad targetName', async t => {
  const {
    provisionSmartWallet,
    bootstrap: {
      board,
      utils: { readLegible },
    },
  } = t.context;
  const marshaller = E(board).getReadonlyMarshaller();

  const addr = 'agoric1price-oracle2';
  const [wallet] = await provisionSmartWallet(addr);
  const invokeP = E(wallet).getInvokeFacet();

  await t.throwsAsync(
    E(invokeP).invokeEntry({ targetName: 'item3', method: '?', args: [] }),
    { message: /no such item/ },
  );

  const invokeActionCapData = await E(marshaller).toCapData({
    method: 'invokeEntry',
    message: { targetName: 'item4', method: '?', args: [] },
  });
  // The smart wallet reporting handles and doesn't pass through the error...
  await t.notThrowsAsync(
    E(wallet).handleBridgeAction(invokeActionCapData, true),
  );
  const { structure: bridgeActionWithoutId } = await readLegible(
    `ROOT.wallet.${addr}`,
  );
  t.like(bridgeActionWithoutId, {
    updated: 'walletAction',
    status: { error: 'cannot invoke "item4": no such item' },
  });

  await t.throwsAsync(
    E(invokeP).invokeEntry({
      id: 'bogusInvoke',
      targetName: 'item5',
      method: '?',
      args: [],
    }),
    { message: /no such item/ },
  );
  const { structure: invokeWithId } = await readLegible(`ROOT.wallet.${addr}`);
  t.like(invokeWithId, {
    updated: 'invocation',
    id: 'bogusInvoke',
    error: 'Error: cannot invoke "item5": no such item',
  });

  const invokeActionWithIdCapData = await E(marshaller).toCapData({
    method: 'invokeEntry',
    message: {
      id: 'bogusInvokeAction',
      targetName: 'item6',
      method: '?',
      args: [],
    },
  });
  await t.throwsAsync(
    E(wallet).handleBridgeAction(invokeActionWithIdCapData, true),
    {
      message: /no such item/,
    },
  );
  const { structure: bridgeActionWithId } = await readLegible(
    `ROOT.wallet.${addr}`,
  );
  t.like(bridgeActionWithId, {
    updated: 'invocation',
    id: 'bogusInvokeAction',
    error: 'Error: cannot invoke "item6": no such item',
  });
});

test('invoke with old wallet', async t => {
  const {
    provisionSmartWallet,
    testJig: { setWithMyStore },
    bootstrap: {
      board,
      utils: { readLegible },
    },
  } = t.context;
  const marshaller = E(board).getReadonlyMarshaller();

  setWithMyStore(false);
  const addr = 'agoric1-old-wallet';
  const [wallet] = await provisionSmartWallet(addr);

  const { instance, tools } = await startPriceContract(t, addr);
  await tools.getReceived();

  t.log('attempt redeem by bridge action');
  const redeemOfferSpec = makeRedeemAdminInvitationOffer({
    instance,
    id: 'redeem-2',
  });
  const redeemActionCapData = await E(marshaller).toCapData({
    method: 'executeOffer',
    offer: redeemOfferSpec,
  });
  await t.notThrowsAsync(
    E(wallet).handleBridgeAction(redeemActionCapData, true),
  );
  const { structure: redeemUpdateStructure } = await readLegible(
    `ROOT.wallet.${addr}`,
  );
  t.like(redeemUpdateStructure, {
    updated: 'offerStatus',
    status: {
      result: {
        name: 'priceSetter',
        passStyle: 'remotable',
      },
    },
  });

  /** @type {InvokeEntryMessage} */
  const message = {
    id: 123,
    targetName: 'priceSetter',
    method: 'setPrice',
    args: [100n],
  };

  t.log('attempt invokeEntry bridge action');
  const invokeActionCapData = await E(marshaller).toCapData({
    method: 'invokeEntry',
    message,
  });
  await t.notThrowsAsync(
    E(wallet).handleBridgeAction(invokeActionCapData, true),
  );
  const { structure: invokeUpdateStructure } = await readLegible(
    `ROOT.wallet.${addr}`,
  );
  t.like(invokeUpdateStructure, {
    updated: 'invocation',
    result: {
      passStyle: 'undefined',
    },
  });

  t.log('attempt direct invokeEntry');
  const invokeP = E(wallet).getInvokeFacet();
  await t.notThrowsAsync(E(invokeP).invokeEntry(message));
});
