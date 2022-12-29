import * as ActionType from '@agoric/cosmic-swingset/src/action-types.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import centralSupplyBundle from '@agoric/vats/bundles/bundle-centralSupply.js';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { setupClientManager } from '@agoric/vats/src/core/chain-behaviors.js';
import '@agoric/vats/src/core/types.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { buildRootObject as boardRoot } from '@agoric/vats/src/vat-board.js';
import { buildRootObject as mintsRoot } from '@agoric/vats/src/vat-mints.js';
import { makeMockChainStorageRoot } from '@agoric/vats/tools/storage-test-utils.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';
import { devices } from './devices.js';

export { ActionType };

/**
 * @param {object} kit
 * @param {Brand<'nat'>} kit.brand
 * @param {Issuer<'nat'>} kit.issuer
 * @param {Mint<'nat'>} [kit.mint]
 */
export const withAmountUtils = kit => {
  return {
    ...kit,
    /**
     * @param {NatValue} v
     */
    make: v => AmountMath.make(kit.brand, v),
    makeEmpty: () => AmountMath.makeEmpty(kit.brand),
    /**
     * @param {NatValue} n
     * @param {NatValue} [d]
     */
    makeRatio: (n, d) => makeRatio(n, kit.brand, d),
  };
};
/** @typedef {ReturnType<typeof withAmountUtils>} AmountUtils */

/**
 *
 * @param {ERef<StoredFacet>} subscription
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
  const {
    zoeServices: {
      zoeService: zoeServiceNear,
      feeMintAccessRetriever: feeMintAccessRetrieverNear,
    },
  } = makeZoeKit(makeFakeVatAdmin(() => {}).admin);
  const {
    zoeServiceNear: zoe,
    feeMintAccessRetrieverNear: feeMintAccessRetriever,
  } = await makeFar(harden({ zoeServiceNear, feeMintAccessRetrieverNear }));

  /** @type {import('@endo/far').ERef<ZoeService>} */
  return {
    zoe,
    feeMintAccessRetriever,
  };
};
harden(setUpZoeForTest);

/** @returns {import('@agoric/vats').BridgeManager} */
const makeFakeBridgeManager = () =>
  Far('fakeBridgeManager', {
    register(bridgeId, handler) {
      return Far('scopedBridgeManager', {
        fromBridge(_obj) {
          assert.fail(`expected fromBridge`);
        },
        toBridge(obj) {
          assert(handler, `No handler for ${bridgeId}`);
          switch (obj.type) {
            case ActionType.WALLET_ACTION:
            case ActionType.WALLET_SPEND_ACTION: {
              // @ts-expect-error handler possibly undefined
              return E(handler).fromBridge(obj);
            }

            default: {
              assert.fail(`Unsupported bridge object type ${obj.type}`);
            }
          }
        },
        setHandler(newHandler) {
          handler = newHandler;
        },
      });
    },
  });
/**
 *
 * @param {*} log
 * @returns {Promise<ChainBootstrapSpace>}>}
 */
export const makeMockTestSpace = async log => {
  const space = /** @type {any} */ (makePromiseSpace(log));
  const { consume, produce } =
    /** @type { BootstrapPowers & { consume: { loadVat: (n: 'mints') => MintsVat, loadCriticalVat: (n: 'mints') => MintsVat }} } */ (
      space
    );
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccessP } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  const feeMintAccess = await feeMintAccessP;
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
  produce.bridgeManager.resolve(makeFakeBridgeManager());

  const storageRoot = makeMockChainStorageRoot();
  produce.chainStorage.resolve(storageRoot);

  produce.testFirstAnchorKit.resolve(makeIssuerKit('AUSD', 'nat'));

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
  ]);

  return space;
};

/**
 * @param {bigint} value
 * @param {{
 *   feeMintAccess: ERef<FeeMintAccess>,
 *   zoe: ERef<ZoeService>,
 * }} powers
 * @returns {Promise<Payment>}
 */
export const mintCentralPayment = async (
  value,
  { feeMintAccess: feeMintAccessP, zoe },
) => {
  const feeMintAccess = await feeMintAccessP;

  const centralSupply = await E(zoe).install(centralSupplyBundle);

  const { creatorFacet: supplier } = await E(zoe).startInstance(
    centralSupply,
    {},
    { bootstrapPaymentValue: value },
    { feeMintAccess },
  );
  return E(supplier).getBootstrapPayment();
};

/** @type {<T>(subscriber: ERef<Subscriber<T>>) => Promise<T>} */
export const headValue = async subscriber => {
  await eventLoopIteration();
  const record = await E(subscriber).subscribeAfter();
  return record.head.value;
};
