// @ts-check

import { makeIssuerKit } from '@agoric/ertp';
import { connectFaucet } from '@agoric/inter-protocol/src/proposals/demoIssuers.js';
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
import { makeChainStorageRoot } from '@agoric/vats/src/lib-chainStorage.js';
import { buildRootObject as boardRoot } from '@agoric/vats/src/vat-board.js';
import { buildRootObject as mintsRoot } from '@agoric/vats/src/vat-mints.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';
import { devices } from './devices.js';

import '@agoric/vats/src/core/types.js';
import '@agoric/zoe/exported.js';

// TODO use a common makeFakeStorageNode when available
export const mockChainStorageRoot = () => {
  const handleMessage = message => {
    switch (message.method) {
      case 'getStoreKey': {
        return {
          storeName: 'swingset',
          storeSubkey: `fake:${message.key}`,
        };
      }
      default:
        return null;
    }
  };
  return makeChainStorageRoot(
    handleMessage,
    'swingset',
    'mockChainStorageRoot',
  );
};

/**
 *
 * @param {Promise<StoredFacet>} subscription
 */
export const subscriptionKey = subscription => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => {
      const [prefix, unique] = storeKey.storeSubkey.split(':');
      assert(
        prefix === 'fake',
        'subscriptionKey helper only supports fake storage',
      );
      return unique;
    });
};

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

/**
 *
 * @param {*} log
 * @returns {Promise<ChainBootstrapSpace>}>}
 */
export const makeTestSpace = async log => {
  const space = /** @type {any} */ (makePromiseSpace(log));
  const { consume, produce } =
    /** @type { BootstrapPowers & { consume: { loadVat: (n: 'mints') => MintsVat, loadCriticalVat: (n: 'mints') => MintsVat }} } */ (
      space
    );
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccess } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const vatLoader = name => {
    switch (name) {
      case 'mints':
        return mintsRoot();
      case 'board':
        return boardRoot();
      default:
        throw Error('unknown loadVat name');
    }
  };
  produce.loadVat.resolve(vatLoader);
  produce.loadCriticalVat.resolve(vatLoader);

  const bldKit = makeIssuerKit('BLD');
  produce.bldIssuerKit.resolve(bldKit);
  produce.chainStorage.resolve(mockChainStorageRoot());

  produce.bankManager.resolve(
    Promise.resolve(
      Far(
        'mockBankManager',
        /** @type {any} */ ({
          getBankForAddress: _a =>
            Far('mockBank', {
              getPurse: () => ({
                deposit: async (_, _x) => {
                  assert.fail('not impl');
                },
              }),
              getAssetSubscription: () => assert.fail('not impl'),
            }),
        }),
      ),
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

  return space;
};
