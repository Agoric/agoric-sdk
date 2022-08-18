// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/vats/src/core/types.js';
import '@agoric/zoe/exported.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import * as BRIDGE_ID from '@agoric/vats/src/bridge-ids.js';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { E, Far } from '@endo/far';
import path from 'path';
import { makeTestSpace, subscriptionKey } from './supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const mockAddress1 = 'mockAddress1';
const mockAddress2 = 'mockAddress2';
const mockAddress3 = 'mockAddress3';

const makeTestContext = async t => {
  const { consume } = await makeTestSpace(t.log);
  const { agoricNames, zoe } = consume;

  // Adapted from perAddress in makeAddressNameHubs()
  const reserveAddress = address => {
    // Create a name hub for this address.
    const { nameHub: myAddressNameHub, nameAdmin: rawMyAddressNameAdmin } =
      makeNameHubKit();

    /** @type {MyAddressNameAdmin} */
    const myAddressNameAdmin = Far('myAddressNameAdmin', {
      ...rawMyAddressNameAdmin,
      getMyAddress: () => address,
    });
    // reserve space for deposit facet
    myAddressNameAdmin.reserve('depositFacet');
    // Register it with the namesByAddress hub.
    return E(consume.namesByAddressAdmin).update(
      address,
      myAddressNameHub,
      myAddressNameAdmin,
    );
  };

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/walletFactory.js`,
    'walletFactory',
  );
  /** @type {Promise<Installation<import('../src/walletFactory.js').start>>} */
  const installation = E(zoe).install(bundle);
  // #endregion

  // copied from makeClientBanks()
  const storageNode = await makeStorageNodeChild(
    consume.chainStorage,
    'wallet',
  );

  /** @type {BridgeManager} */
  const bridgeManager = Far('fakeBridgeManager', {
    register(srcID, handler) {
      t.is(srcID, BRIDGE_ID.WALLET);
      t.assert(handler);
      t.assert(
        !t.context.walletHandler,
        'handler can only be registered once in test',
      );
    },
    toBridge(dstID, obj) {
      t.is(dstID, BRIDGE_ID.WALLET);
      let ret;
      switch (obj.type) {
        case 'WALLET_ACTION': {
          t.log('DEBUG toBridge', obj);
          break;
        }

        case 'VBANK_GET_BALANCE': {
          const { address, denom, type: _type, ...rest } = obj;
          t.is(address, 'agoricfoo');
          t.deepEqual(rest, {});
          if (denom === 'ubld') {
            ret = '11993';
          } else if (denom === 'ufee') {
            ret = '34';
          } else {
            t.fail(`unrecognized denomination ${denom}`);
          }
          break;
        }

        case 'VBANK_GIVE': {
          const { amount, denom, recipient, type: _type, ...rest } = obj;
          t.is(recipient, 'agoricfoo');
          t.is(denom, 'ubld');
          t.is(amount, '14');
          t.deepEqual(rest, {});
          ret = amount;
          break;
        }

        case 'VBANK_GRAB': {
          const { amount, denom, sender, type: _type, ...rest } = obj;
          t.is(sender, 'agoricfoo');
          t.deepEqual(rest, {});
          if (denom === 'ubld') {
            t.is(amount, '14');
            ret = amount;
          } else if (denom === 'ufee') {
            if (BigInt(amount) > 35n) {
              throw Error('insufficient ufee funds');
            } else {
              t.is(amount, '35');
              ret = amount;
            }
          } else {
            t.fail(`unrecognized denomination ${denom}`);
          }
          break;
        }

        case 'VBANK_GIVE_TO_REWARD_DISTRIBUTOR': {
          const { amount, denom, type: _type, ...rest } = obj;
          t.is(denom, 'ufee');
          t.is(amount, '12');
          t.deepEqual(rest, {});
          ret = true;
          break;
        }

        default: {
          t.fail(`unknown bridge obj type '${obj.type}'`);
          t.is(obj, null);
        }
      }
      return ret;
    },
    unregister(srcID) {
      t.is(srcID, BRIDGE_ID.WALLET);
      t.fail('no expected unregister');
    },
  });

  const walletFactory = E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      namesByAddress: consume.namesByAddress,
      board: consume.board,
    },
    {
      bridgeManager,
      storageNode,
    },
  );

  bridgeManager.toBridge(BRIDGE_ID.WALLET, {
    type: 'WALLET_ACTION',
    check: 12,
  });

  return {
    bankManager: consume.bankManager,
    namesByAddressAdmin: consume.namesByAddressAdmin,
    reserveAddress,
    walletFactory,
    zoe,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});

test('basic', async t => {
  const {
    bankManager,
    namesByAddressAdmin,
    reserveAddress,
    walletFactory,
    zoe,
  } = t.context;
  const { creatorFacet } = await walletFactory;

  await reserveAddress(mockAddress1);

  // copied from makeClientBanks()
  const bank = E(bankManager).getBankForAddress(mockAddress1);
  const myAddressNameAdmin = E(namesByAddressAdmin).lookupAdmin(mockAddress1);

  const smartWallet = await E(creatorFacet).provideSmartWallet(
    mockAddress1,
    bank,
    myAddressNameAdmin,
  );

  const bridge = await E(smartWallet).getBridge();
  t.is(await E(bridge).getZoe(), await zoe);
});

test('notifiers', async t => {
  const { bankManager, namesByAddressAdmin, reserveAddress, walletFactory } =
    t.context;
  const { creatorFacet } = await walletFactory;

  async function checkAddress(address) {
    await reserveAddress(address);

    const bank = E(bankManager).getBankForAddress(address);
    const myAddressNameAdmin = E(namesByAddressAdmin).lookupAdmin(address);

    const smartWallet = await E(creatorFacet).provideSmartWallet(
      address,
      bank,
      myAddressNameAdmin,
    );

    t.is(
      await subscriptionKey(E(smartWallet).getSubscriber()),
      `mockChainStorageRoot.wallet.${address}`,
    );
  }

  await Promise.all(
    [mockAddress1, mockAddress2, mockAddress3].map(checkAddress),
  );
});
