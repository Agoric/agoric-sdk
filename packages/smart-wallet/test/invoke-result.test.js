/** @file test {@link InvokeAction} */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { objectMap, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeCopyBag } from '@agoric/store';
import { makeNameHubKit } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import * as priceExports from './wallet-fun.contract.js';
import * as wfExports from '../src/walletFactory.js';
import * as gameExports from './gameAssetContract.js';

/**
 * @import {TestFn, ExecutionContext} from 'ava'
 * @import {start as StartFn} from '../src/walletFactory.js';
 * @import {OfferSpec} from '../src/offers.js';
 * @import {InvokeAction} from '../src/smartWallet.js';
 */

/**
 * @typedef {Awaited<ReturnType<makeTestContext>>} WTestCtx
 */

const contractName = 'walletFactory';
const ROOT_STORAGE_PATH = 'ROOT';
const { make } = AmountMath;

/** @type {TestFn<WTestCtx>} */
const test = anyTest;

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

const makeBootstrap = async () => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const storage = makeFakeStorageKit(ROOT_STORAGE_PATH);
  const board = makeFakeBoard();

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  await makeWellKnownSpaces(agoricNamesAdmin);
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();

  const bankBridgeMessages = [];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });

  const feeIssuer = await E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();
  await E(bankManager).addAsset('uist', 'IST', 'IST', {
    issuer: feeIssuer,
    brand: feeBrand,
  });
  await E(E(agoricNamesAdmin).lookupAdmin('issuer')).update('IST', feeIssuer);
  await E(E(agoricNamesAdmin).lookupAdmin('brand')).update('IST', feeBrand);
  board.getId(feeBrand);

  /** @param {string} path */
  const readLatest = async path => {
    await eventLoopIteration();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };

  return {
    agoricNames,
    agoricNamesAdmin,
    board,
    bankManager,
    namesByAddress,
    namesByAddressAdmin,
    storage,
    zoe,
    utils: { pourPayment, bundleAndInstall, readLatest },
  };
};

const deploy = async () => {
  const bootstrap = await makeBootstrap();
  const { zoe, utils } = bootstrap;

  /** @type {Installation<StartFn>} */
  const installation = await utils.bundleAndInstall(wfExports);
  assert.equal(passStyleOf(installation), 'remotable');

  const { agoricNames, board, bankManager, storage } = bootstrap;
  const storageNode = storage.rootNode.makeChildNode('wallet');

  const assetPublisher = await bankManager.getBankForAddress(
    VBankAccount.provision.address,
  );
  const walletFactoryFacets = await E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      board,
      assetPublisher,
    },
    { storageNode },
  );

  const { creatorFacet } = walletFactoryFacets;
  const { namesByAddressAdmin } = bootstrap;

  /** @param {string} addr */
  const provisionSmartWallet = async addr => {
    const bank = bankManager.getBankForAddress(addr);
    return E(creatorFacet).provideSmartWallet(addr, bank, namesByAddressAdmin);
  };

  return { walletFactoryFacets, bootstrap, provisionSmartWallet };
};

const makeTestContext = async t => {
  t.log('contract deployment', contractName);
  const deployed = await deploy();
  return deployed;
};

test.before(async t => (t.context = await makeTestContext(t)));

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
  const { readLatest } = t.context.bootstrap.utils;

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

  const { structure, slots } = await readLatest(`ROOT.wallet.${addr}`);
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

test('start price contract; make offer', async t => {
  /** @param {string} addr */
  const startPriceContract = async addr => {
    const { board, zoe, namesByAddress, utils } = t.context.bootstrap;

    t.log('start price contract');
    const installation = utils.bundleAndInstall(priceExports);
    const { instance, creatorFacet, publicFacet } =
      await E(zoe).startInstance(installation);

    const toSetPrices = await E(creatorFacet).makeAdminInvitation();
    const df = await E(namesByAddress).lookup(addr, 'depositFacet');
    const rxd = E(df).receive(toSetPrices);
    const getPrices = async () => {
      const p = await E(publicFacet).getPrices();
      return p;
    };

    // the client can see objects via the board
    const ids = {
      instance: board.getId(instance),
    };

    return harden({
      instance,
      ids,
      tools: { getReceived: () => rxd, getPrices },
    });
  };

  const { provisionSmartWallet } = t.context;
  const addr = 'agoric1price-oracle';
  const [wallet] = await provisionSmartWallet(addr);
  const { instance, ids, tools } = await startPriceContract(addr);
  t.deepEqual(await tools.getPrices(), []); // no admins

  const { readLatest } = t.context.bootstrap.utils;

  t.log('redeem price admin invitation');
  /** @type {OfferSpec} */
  const redeemSpec = {
    id: 'redeem-1',
    invitationSpec: {
      source: 'purse',
      instance,
      description: 'admin',
    },
    proposal: {},
    after: { saveAs: 'priceSetter' },
  };

  const offersP = E(wallet).getOffersFacet();
  await tools.getReceived();
  await t.notThrowsAsync(E(offersP).executeOffer(redeemSpec));

  const { structure, slots } = await readLatest(`ROOT.wallet.${addr}`);
  t.log('last wallet update', structure);
  t.log('payouts', structure.status.payouts);
  t.is(structure.status.result, 'UNPUBLISHED');
  t.deepEqual(structure.status.payouts, {});
  t.deepEqual(slots, [ids.instance]);

  t.deepEqual(await tools.getPrices(), [0n]); // 1 admin w/0 price

  const invokeP = E(wallet).getInvokeFacet();
  await t.notThrowsAsync(
    E(invokeP).invokeItem('priceSetter', {
      method: 'setPrice',
      args: [100n],
    }),
  );

  t.deepEqual(await tools.getPrices(), [100n]); // 1 admin w/100 price
});
