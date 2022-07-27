// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/vats/src/core/types.js';
import '@agoric/zoe/exported.js';

import { makeIssuerKit } from '@agoric/ertp';
import { connectFaucet } from '@agoric/inter-protocol/src/proposals/demoIssuers.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { setupClientManager } from '@agoric/vats/src/core/chain-behaviors.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import {
  makeChainStorageRoot,
  makeStorageNode,
} from '@agoric/vats/src/lib-chainStorage.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { buildRootObject as boardRoot } from '@agoric/vats/src/vat-board.js';
import { buildRootObject as mintsRoot } from '@agoric/vats/src/vat-mints.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';
import path from 'path';
import { devices } from './devices.js';
import { subscriptionKey } from './supports.js';

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
  );
  /** @type {import('@endo/far').ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};
harden(setUpZoeForTest);

export const mockChainStorageRoot = () => {
  const toStorage = v => v;
  return makeChainStorageRoot(toStorage, 'swingset', 'mockChainStorageRoot');
};

const makeTestContext = async t => {
  const space = /** @type {any} */ (makePromiseSpace(t.log));
  const { consume, produce } =
    /** @type { BootstrapPowers & { consume: { loadVat: (n: 'mints') => MintsVat }} } */ (
      space
    );
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccess } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  produce.loadVat.resolve(name => {
    switch (name) {
      case 'mints':
        return mintsRoot();
      case 'board':
        return boardRoot();
      default:
        throw Error('unknown loadVat name');
    }
  });

  const bldKit = makeIssuerKit('BLD');
  produce.bldIssuerKit.resolve(bldKit);
  produce.chainStorage.resolve(mockChainStorageRoot());

  produce.bankManager.resolve(
    Promise.resolve(
      Far('mockBankManager', {
        // @ts-expect-error
        getBankForAddress: _a =>
          Far('mockBank', {
            getPurse: () => ({
              deposit: async (_, _x) => {
                return null;
              },
            }),
            getAssetSubscription: () => null,
          }),
      }),
    ),
  );

  const vatPowers = {
    D: x => x,
  };

  await Promise.all([
    // @ts-expect-error
    makeBoard({ consume, produce, ...spaces }),
    makeAddressNameHubs({ consume, produce, ...spaces }),
    installBootContracts({ vatPowers, devices, consume, produce, ...spaces }),
    setupClientManager({ consume, produce, ...spaces }),
    connectFaucet({ consume, produce, ...spaces }),
  ]);

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

  const address = 'bogusAddress';
  await reserveAddress(address);

  // #region Installs
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);

  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    `${dirname}/../src/singleWallet.js`,
    'singleWallet',
  );
  /** @type {Promise<Installation<import('../src/singleWallet.js').start>>} */
  // @ts-expect-error cast
  const installation = E(zoe).install(bundle);
  // #endregion

  // copied from makeClientBanks()
  const bank = E(consume.bankManager).getBankForAddress(address);
  const myAddressNameAdmin = E(consume.namesByAddressAdmin).lookupAdmin(
    address,
  );

  // copied from makeClientBanks()
  const storageNode = await makeStorageNode(consume.chainStorage, 'wallet');
  const marshaller = E(consume.board).getPublishingMarshaller();

  const singleWallet = E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      bank,
      namesByAddress: consume.namesByAddress,
      myAddressNameAdmin,
      board: consume.board,
    },
    { storageNode, marshaller },
  );

  return {
    singleWallet,
    zoe,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});

test('basic', async t => {
  const { singleWallet, zoe } = t.context;
  const { creatorFacet } = await singleWallet;

  const bridge = await E(creatorFacet).getBridge();
  t.is(await E(bridge).getZoe(), await zoe);

  t.is(
    await subscriptionKey(E(creatorFacet).getSubscription()),
    'mockChainStorageRoot.wallet.bogusAddress',
  );
});
