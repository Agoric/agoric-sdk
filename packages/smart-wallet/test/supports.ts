import { Fail } from '@endo/errors';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import * as ActionType from '@agoric/internal/src/action-types.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeAgoricNamesAccess, makePromiseSpace } from '@agoric/vats';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { setupClientManager } from '@agoric/vats/src/core/chain-behaviors.js';
import { buildRootObject as boardRoot } from '@agoric/vats/src/vat-board.js';
import { buildRootObject as mintsRoot } from '@agoric/vats/src/vat-mints.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeRatio } from '@agoric/ertp/src/ratio.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, Far, type ERef } from '@endo/far';
import type { Brand, Issuer, Mint, NatValue } from '@agoric/ertp';
import type { StoredFacet } from '@agoric/internal/src/lib-chainStorage.js';
import type { Subscriber } from '@agoric/notifier';
import type { BridgeManager } from '@agoric/vats';

export { ActionType };

export const withAmountUtils = (kit: {
  brand: Brand<'nat'>;
  issuer: Issuer<'nat'>;
  mint?: Mint<'nat'>;
}) => {
  return {
    ...kit,
    make: (v: NatValue) => AmountMath.make(kit.brand, v),
    makeEmpty: () => AmountMath.makeEmpty(kit.brand),
    makeRatio: (n: NatValue, d?: NatValue) => makeRatio(n, kit.brand, d),
  };
};
export type AmountUtils = ReturnType<typeof withAmountUtils>;

export const subscriptionKey = (subscription: ERef<StoredFacet>) => {
  return E(subscription)
    .getStoreKey()
    .then(storeKey => {
      const [prefix, unique] = storeKey.storeSubkey.split(':');
      prefix === 'fake' ||
        Fail`subscriptionKey helper only supports fake storage`;
      return unique;
    });
};

const makeFakeBridgeManager = (): BridgeManager =>
  Far('fakeBridgeManager', {
    register(bridgeId, handler) {
      let currentHandler = handler;
      return Far('scopedBridgeManager', {
        getBridgeId() {
          return bridgeId;
        },
        fromBridge(_obj) {
          assert.fail(`expected fromBridge`);
        },
        toBridge(obj) {
          if (!currentHandler) {
            throw Fail`No handler for ${bridgeId}`;
          }
          // Rely on interface guard for validation.
          // This should also be validated upstream but don't rely on it.
          return E(currentHandler).fromBridge(obj);
        },
        initHandler(newHandler) {
          !currentHandler || Fail`Handler already set`;
          currentHandler = newHandler;
        },
        setHandler(newHandler) {
          !!currentHandler || Fail`Handler not set`;
          currentHandler = newHandler;
        },
      });
    },
  });
export const makeMockTestSpace = async (
  log: (...args: unknown[]) => void,
): Promise<ChainBootstrapSpace> => {
  const space = makePromiseSpace(log) as ChainBootstrapSpace & {
    produce: ChainBootstrapSpace['produce'] & {
      loadVat: Producer<VatLoader>;
      loadCriticalVat: Producer<VatLoader>;
    };
  };
  const { consume, produce } = space;
  const { agoricNames, agoricNamesAdmin, spaces } =
    await makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const { zoe, feeMintAccessP } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccessP);

  // @ts-expect-error XXX VatLoader type
  const vatLoader: VatLoader<'mints' | 'board'> = async name => {
    type ReturnedVat = Awaited<WellKnownVats[typeof name]>;
    switch (name) {
      case 'mints':
        return mintsRoot() as ReturnedVat;
      case 'board': {
        const baggage = makeScalarBigMapStore<string, unknown>('baggage');
        return boardRoot({}, {}, baggage) as ReturnedVat;
      }
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

  const { bankManager } = await makeFakeBankManagerKit();

  produce.bankManager.resolve(bankManager);

  await Promise.all([
    // @ts-expect-error
    makeBoard({ consume, produce, ...spaces }),
    // @ts-expect-error XXX bootstrap type
    makeAddressNameHubs({ consume, produce, ...spaces }),
    // @ts-expect-error XXX bootstrap type
    installBootContracts({ consume, produce, ...spaces }),
    // @ts-expect-error XXX bootstrap type
    setupClientManager({ consume, produce, ...spaces }),
  ]);

  return space;
};

export const topicPath = (
  hasTopics: ERef<{
    getPublicTopics: () => import('@agoric/zoe/src/contractSupport/index.js').TopicsRecord;
  }>,
  subscriberName: string,
) => {
  return E(hasTopics)
    .getPublicTopics()
    .then(subscribers => subscribers[subscriberName])
    .then(tr => tr.storagePath);
};

export const headValue = async <T>(
  subscriber: ERef<Subscriber<T>>,
): Promise<T> => {
  await eventLoopIteration();
  const record = await E(subscriber).subscribeAfter();
  return record.head.value;
};
