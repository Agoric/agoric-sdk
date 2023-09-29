import { Fail } from '@agoric/assert';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import * as ActionType from '@agoric/internal/src/action-types.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import {
  type BridgeManager,
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { setupClientManager } from '@agoric/vats/src/core/chain-behaviors.js';
import '@agoric/vats/src/core/types-ambient.js';
import { buildRootObject as boardRoot } from '@agoric/vats/src/vat-board.js';
import { buildRootObject as mintsRoot } from '@agoric/vats/src/vat-mints.js';
import { makeFakeBankKit } from '@agoric/vats/tools/bank-utils.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { TopicsRecord } from '@agoric/zoe/src/contractSupport/topics.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, Far } from '@endo/far';

export { ActionType };

export const withAmountUtils = (
  kit: Pick<IssuerKit<'nat'>, 'brand' | 'issuer'>,
) => {
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
      return Far('scopedBridgeManager', {
        fromBridge(_obj) {
          assert.fail(`expected fromBridge`);
        },
        toBridge(obj) {
          if (!handler) {
            Fail`No handler for ${bridgeId}`;
          }
          // Rely on interface guard for validation.
          // This should also be validated upstream but don't rely on it.
          // @ts-expect-error handler possibly undefined
          return E(handler).fromBridge(obj);
        },
        initHandler(newHandler) {
          !handler || Fail`Handler already set`;
          handler = newHandler;
        },
        setHandler(newHandler) {
          !!handler || Fail`Handler not set`;
          handler = newHandler;
        },
      });
    },
  });

export const makeMockTestSpace = async (log): Promise<ChainBootstrapSpace> => {
  const space = makePromiseSpace(log) as any as BootstrapPowers & {
    consume: {
      loadVat: (n: 'mints') => MintsVat;
      loadCriticalVat: (n: 'mints') => MintsVat;
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

  const vatLoader = name => {
    switch (name) {
      case 'mints':
        return mintsRoot();
      case 'board': {
        const baggage = makeScalarBigMapStore<string, unknown>('baggage');
        return boardRoot({}, {}, baggage);
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

  const fakeBankKit = makeFakeBankKit([]);

  produce.bankManager.resolve(
    Promise.resolve(
      Far('mockBankManager', {
        getBankForAddress: _a => fakeBankKit.bank,
      } as any),
    ),
  );

  await Promise.all([
    // @ts-expect-error
    makeBoard({ consume, produce, ...spaces }),
    makeAddressNameHubs({ consume, produce, ...spaces }),
    installBootContracts({ consume, produce, ...spaces }),
    setupClientManager({ consume, produce, ...spaces }),
  ]);

  return space;
};

export const topicPath = (
  hasTopics: ERef<{ getPublicTopics: () => TopicsRecord }>,
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
