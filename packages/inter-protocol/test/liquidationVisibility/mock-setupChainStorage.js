/* eslint-disable import/no-extraneous-dependencies */
import { E } from '@endo/eventual-send';
import { M } from '@endo/patterns';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import '../../src/vaultFactory/types.js';
import '@agoric/zoe/exported.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { makeScalarBigMapStore } from '@agoric/vat-data/src/index.js';
import { providePriceAuthorityRegistry } from '@agoric/vats/src/priceAuthorityRegistry.js';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';
import * as utils from '@agoric/vats/src/core/utils.js';
import { makePromiseSpace, makeAgoricNamesAccess } from '@agoric/vats';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { produceDiagnostics } from '@agoric/vats/src/core/basic-behaviors.js';
import { Far } from '@endo/far';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { bindAllMethods } from '@agoric/internal/src/method-tools.js';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import {
  isStreamCell,
  assertPathSegment,
} from '@agoric/internal/src/lib-chainStorage.js';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import * as cb from '@agoric/internal/src/callback.js';
import { installPuppetGovernance, produceInstallations } from '../supports.js';
import { startEconomicCommittee } from '../../src/proposals/startEconCommittee.js';
import {
  SECONDS_PER_WEEK,
  setupReserve,
  startAuctioneer,
} from '../../src/proposals/econ-behaviors.js';

let blockMakeChildNode = '';

export const setBlockMakeChildNode = nodeName => {
  blockMakeChildNode = nodeName;
  return `LOG: blockMakeChildNode set to node ${nodeName}`;
};

/**
 * This represents a node in an IAVL tree.
 *
 * The active implementation is x/vstorage, an Agoric extension of the Cosmos
 * SDK.
 *
 * Vstorage is a hierarchical externally-reachable storage structure that
 * identifies children by restricted ASCII name and is associated with arbitrary
 * string-valued data for each node, defaulting to the empty string.
 *
 * @typedef {object} StorageNode
 * @property {(data: string) => Promise<void>} setValue publishes some data
 * @property {() => string} getPath the chain storage path at which the node was
 *   constructed
 * @property {() => Promise<VStorageKey>} getStoreKey DEPRECATED use getPath
 * @property {(
 *   subPath: string,
 *   options?: { sequence?: boolean },
 * ) => StorageNode} makeChildNode
 */

const ChainStorageNodeI = M.interface('StorageNode', {
  setValue: M.callWhen(M.string()).returns(),
  getPath: M.call().returns(M.string()),
  getStoreKey: M.callWhen().returns(M.record()),
  makeChildNode: M.call(M.string())
    .optional(M.splitRecord({}, { sequence: M.boolean() }, {}))
    .returns(M.or(M.remotable('StorageNode'), M.promise())),
});

/**
 * Must match the switch in vstorage.go using `vstorageMessage` type
 *
 * @typedef {| 'get'
 *   | 'getStoreKey'
 *   | 'has'
 *   | 'children'
 *   | 'entries'
 *   | 'values'
 *   | 'size'} StorageGetByPathMessageMethod
 *
 * @typedef {'set' | 'setWithoutNotify' | 'append'} StorageUpdateEntriesMessageMethod
 *
 * @typedef {| StorageGetByPathMessageMethod
 *   | StorageUpdateEntriesMessageMethod} StorageMessageMethod
 *
 * @typedef {[path: string]} StorageGetByPathMessageArgs
 *
 * @typedef {[path: string, value?: string | null]} StorageEntry
 *
 * @typedef {StorageEntry[]} StorageUpdateEntriesMessageArgs
 *
 * @typedef {| {
 *       method: StorageGetByPathMessageMethod;
 *       args: StorageGetByPathMessageArgs;
 *     }
 *   | {
 *       method: StorageUpdateEntriesMessageMethod;
 *       args: StorageUpdateEntriesMessageArgs;
 *     }} StorageMessage
 */

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareChainStorageNode = zone => {
  /**
   * Create a storage node for a given backing storage interface and path.
   *
   * @param {import('@agoric/internal/src/callback.js').Callback<
   *   (message: StorageMessage) => any
   * >} messenger
   *   a callback for sending a storageMessage object to the storage
   *   implementation (cf. golang/cosmos/x/vstorage/vstorage.go)
   * @param {string} path
   * @param {object} [options]
   * @param {boolean} [options.sequence] set values with `append` messages
   *   rather than `set` messages so the backing implementation employs a
   *   wrapping structure that preserves each value set within a single block.
   *   Child nodes default to inheriting this option from their parent.
   * @returns {StorageNode}
   */
  const makeChainStorageNode = zone.exoClass(
    'ChainStorageNode',
    ChainStorageNodeI,
    /**
     * @param {import('@agoric/internal/src/callback.js').Callback<
     *   (message: StorageMessage) => any
     * >} messenger
     * @param {string} path
     * @param {object} [options]
     * @param {boolean} [options.sequence]
     */
    (messenger, path, { sequence = false } = {}) => {
      assert.typeof(path, 'string');
      assert.typeof(sequence, 'boolean');
      return harden({ path, messenger, sequence });
    },
    {
      getPath() {
        return this.state.path;
      },
      /**
       * @deprecated use getPath
       * @type {() => Promise<VStorageKey>}
       */
      async getStoreKey() {
        const { path, messenger } = this.state;
        return cb.callE(messenger, {
          method: 'getStoreKey',
          args: [path],
        });
      },

      makeChildNode(name, childNodeOptions = {}) {
        if (blockMakeChildNode === name) {
          console.log(`Log: MOCK makeChildNode REJECTED for node ${name}`);
          setBlockMakeChildNode('');
          return Promise.reject();
        }

        const { sequence, path, messenger } = this.state;
        assertPathSegment(name);
        const mergedOptions = { sequence, ...childNodeOptions };
        return makeChainStorageNode(
          messenger,
          `${path}.${name}`,
          mergedOptions,
        );
      },
      /** @type {(value: string) => Promise<void>} */
      async setValue(value) {
        const { sequence, path, messenger } = this.state;
        assert.typeof(value, 'string');
        /** @type {StorageEntry} */
        let entry;
        if (!sequence && !value) {
          entry = [path];
        } else {
          entry = [path, value];
        }
        await cb.callE(messenger, {
          method: sequence ? 'append' : 'set',
          args: [entry],
        });
      },
      // Possible extensions:
      // * getValue()
      // * getChildNames() and/or makeChildNodes()
      // * getName()
      // * recursive delete
      // * batch operations
      // * local buffering (with end-of-block commit)
    },
  );
  return makeChainStorageNode;
};

const makeHeapChainStorageNode = prepareChainStorageNode(makeHeapZone());

/**
 * Create a heap-based root storage node for a given backing function and root
 * path.
 *
 * @param {(message: StorageMessage) => any} handleStorageMessage a function for
 *   sending a storageMessage object to the storage implementation (cf.
 *   golang/cosmos/x/vstorage/vstorage.go)
 * @param {string} rootPath
 * @param {object} [rootOptions]
 * @param {boolean} [rootOptions.sequence] employ a wrapping structure that
 *   preserves each value set within a single block, and default child nodes to
 *   do the same
 */
function makeChainStorageRoot(
  handleStorageMessage,
  rootPath,
  rootOptions = {},
) {
  const messenger = cb.makeFunctionCallback(handleStorageMessage);

  // Use the heapZone directly.
  const rootNode = makeHeapChainStorageNode(messenger, rootPath, rootOptions);
  return rootNode;
}

const { Fail } = assert;

/**
 * A map corresponding with a total function such that `get(key)` is assumed to
 * always succeed.
 *
 * @template K, V
 * @typedef {{ [k in Exclude<keyof Map<K, V>, 'get'>]: Map<K, V>[k] } & {
 *   get: (key: K) => V;
 * }} TotalMap
 */

/**
 * For testing, creates a chainStorage root node over an in-memory map and
 * exposes both the map and the sequence of received messages. The `sequence`
 * option defaults to true.
 *
 * @param {string} rootPath
 * @param {Parameters<typeof makeChainStorageRoot>[2]} [rootOptions]
 */
const makeFakeStorageKit = (rootPath, rootOptions) => {
  const trace = makeTracer('StorTU', false);
  const resolvedOptions = { sequence: true, ...rootOptions };
  /** @type {TotalMap<string, string>} */
  const data = new Map();
  /** @param {string} prefix */
  const getChildEntries = prefix => {
    assert(prefix.endsWith('.'));
    const childEntries = new Map();
    for (const [path, value] of data.entries()) {
      if (!path.startsWith(prefix)) {
        continue;
      }
      const [segment, ...suffix] = path.slice(prefix.length).split('.');
      if (suffix.length === 0) {
        childEntries.set(segment, value);
      } else if (!childEntries.has(segment)) {
        childEntries.set(segment, null);
      }
    }
    return childEntries;
  };
  /** @type {import('@agoric/internal/src/lib-chainStorage.js').StorageMessage[]} */
  const messages = [];
  /** @param {import('@agoric/internal/src/lib-chainStorage.js').StorageMessage} message */
  // eslint-disable-next-line consistent-return
  const toStorage = message => {
    messages.push(message);
    switch (message.method) {
      case 'getStoreKey': {
        const [key] = message.args;
        return { storeName: 'swingset', storeSubkey: `fake:${key}` };
      }
      case 'get': {
        const [key] = message.args;
        return data.has(key) ? data.get(key) : null;
      }
      case 'children': {
        const [key] = message.args;
        const childEntries = getChildEntries(`${key}.`);
        return [...childEntries.keys()];
      }
      case 'entries': {
        const [key] = message.args;
        const childEntries = getChildEntries(`${key}.`);
        return [...childEntries.entries()].map(entry =>
          entry[1] != null ? entry : [entry[0]],
        );
      }
      case 'set':
      case 'setWithoutNotify': {
        trace('toStorage set', message);
        /** @type {import('@agoric/internal/src/lib-chainStorage.js').StorageEntry[]} */
        const newEntries = message.args;
        for (const [key, value] of newEntries) {
          if (value != null) {
            data.set(key, value);
          } else {
            data.delete(key);
          }
        }
        break;
      }
      case 'append': {
        trace('toStorage append', message);
        /** @type {import('@agoric/internal/src/lib-chainStorage.js').StorageEntry[]} */
        const newEntries = message.args;
        for (const [key, value] of newEntries) {
          value != null || Fail`attempt to append with no value`;
          // In the absence of block boundaries, everything goes in a single StreamCell.
          const oldVal = data.get(key);
          let streamCell;
          if (oldVal != null) {
            try {
              streamCell = JSON.parse(oldVal);
              assert(isStreamCell(streamCell));
            } catch (_err) {
              streamCell = undefined;
            }
          }
          if (streamCell === undefined) {
            streamCell = {
              blockHeight: '0',
              values: oldVal != null ? [oldVal] : [],
            };
          }
          streamCell.values.push(value);
          data.set(key, JSON.stringify(streamCell));
        }
        break;
      }
      case 'size':
        // Intentionally incorrect because it counts non-child descendants,
        // but nevertheless supports a "has children" test.
        return [...data.keys()].filter(k => k.startsWith(`${message.args[0]}.`))
          .length;
      default:
        throw Error(`unsupported method: ${message.method}`);
    }
  };
  const rootNode = makeChainStorageRoot(toStorage, rootPath, resolvedOptions);
  return {
    rootNode,
    // eslint-disable-next-line object-shorthand
    data: /** @type {Map<string, string>} */ (data),
    messages,
    toStorage,
  };
};
harden(makeFakeStorageKit);
/** @typedef {ReturnType<typeof makeFakeStorageKit>} FakeStorageKit */

const makeMockChainStorageRoot = () => {
  const { rootNode, data } = makeFakeStorageKit('mockChainStorageRoot');
  return Far('mockChainStorage', {
    ...bindAllMethods(rootNode),
    /**
     * Defaults to deserializing slot references into plain Remotable objects
     * having the specified interface name (as from `Far(iface)`), but can
     * accept a different marshaller for producing Remotables that e.g. embed
     * the slot string in their iface name.
     *
     * @param {string} path
     * @param {import('@agoric/internal/src/lib-chainStorage.js').Marshaller} marshaller
     * @param {number} [index]
     * @returns {unknown}
     */
    getBody: (path, marshaller = defaultMarshaller, index = -1) => {
      data.size || Fail`no data in storage`;
      /**
       * @type {ReturnType<
       *   typeof import('@endo/marshal').makeMarshal
       * >['fromCapData']}
       */
      const fromCapData = (...args) =>
        Reflect.apply(marshaller.fromCapData, marshaller, args);
      return unmarshalFromVstorage(data, path, fromCapData, index);
    },
    keys: () => [...data.keys()],
  });
};
/** @typedef {ReturnType<typeof makeMockChainStorageRoot>} MockChainStorageRoot */

/**
 * @param {any} t
 * @param {import('@agoric/time').TimerService} [optTimer]
 */
const setupBootstrap = async (t, optTimer) => {
  const trace = makeTracer('PromiseSpace', false);
  const space = /** @type {any} */ (makePromiseSpace(trace));
  const { produce, consume } = /**
   * @type {import('../../src/proposals/econ-behaviors.js').EconomyBootstrapPowers &
   *     BootstrapPowers}
   */ (space);

  await produceDiagnostics(space);

  const timer = optTimer || buildManualTimer(t.log);
  produce.chainTimerService.resolve(timer);
  // @ts-expect-error
  produce.chainStorage.resolve(makeMockChainStorageRoot());
  produce.board.resolve(makeFakeBoard());

  const { zoe, feeMintAccess, run } = t.context;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  const { agoricNames, agoricNamesAdmin, spaces } =
    await makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const { brand, issuer } = spaces;
  brand.produce.IST.resolve(run.brand);
  issuer.produce.IST.resolve(run.issuer);

  return { produce, consume, modules: { utils: { ...utils } }, ...spaces };
};

/**
 * @typedef {Record<string, any> & {
 *   aeth: IssuerKit & import('../supports.js').AmountUtils;
 *   run: IssuerKit & import('../supports.js').AmountUtils;
 *   bundleCache: Awaited<
 *     ReturnType<
 *       typeof import('@agoric/swingset-vat/tools/bundleTool.js').unsafeMakeBundleCache
 *     >
 *   >;
 *   rates: VaultManagerParamValues;
 *   interestTiming: InterestTiming;
 *   zoe: ZoeService;
 * }} Context
 */

/**
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {IssuerKit<'nat'>} run
 * @param {IssuerKit<'nat'>} aeth
 * @param {NatValue[] | Ratio} priceOrList
 * @param {RelativeTime} quoteInterval
 * @param {Amount | undefined} unitAmountIn
 * @param {Partial<import('../../src/auction/params.js').AuctionParams>} actionParamArgs
 * @param {| {
 *       btc: any;
 *       btcPrice: Ratio;
 *       btcAmountIn: any;
 *     }
 *   | undefined} extraAssetKit
 */
export const setupElectorateReserveAndAuction = async (
  t,
  run,
  aeth,
  priceOrList,
  quoteInterval,
  unitAmountIn,
  {
    StartFrequency = SECONDS_PER_WEEK,
    DiscountStep = 2000n,
    LowestRate = 5500n,
    ClockStep = 2n,
    StartingRate = 10_500n,
    AuctionStartDelay = 10n,
    PriceLockPeriod = 3n,
  },
  extraAssetKit = undefined,
) => {
  const {
    zoe,
    electorateTerms = { committeeName: 'The Cabal', committeeSize: 1 },
    timer,
  } = t.context;

  const space = await setupBootstrap(t, timer);
  installPuppetGovernance(zoe, space.installation.produce);
  produceInstallations(space, t.context.installation);

  await startEconomicCommittee(space, electorateTerms);
  await setupReserve(space);
  const quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET);

  // priceAuthorityReg is the registry, which contains and multiplexes multiple
  // individual priceAuthorities, including aethPriceAuthority.
  // priceAuthorityAdmin supports registering more individual priceAuthorities
  // with the registry.
  /** @type {import('@agoric/zoe/tools/manualPriceAuthority.js').ManualPriceAuthority} */
  // @ts-expect-error scriptedPriceAuthority doesn't actually match this, but manualPriceAuthority does
  const aethTestPriceAuthority = Array.isArray(priceOrList)
    ? makeScriptedPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        priceList: priceOrList,
        timer,
        quoteMint: quoteIssuerKit.mint,
        unitAmountIn,
        quoteInterval,
      })
    : makeManualPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        initialPrice: priceOrList,
        timer,
        quoteIssuerKit,
      });

  let abtcTestPriceAuthority;
  if (extraAssetKit) {
    abtcTestPriceAuthority = Array.isArray(extraAssetKit.btcPrice)
      ? makeScriptedPriceAuthority({
          actualBrandIn: extraAssetKit.btc.brand,
          actualBrandOut: run.brand,
          priceList: extraAssetKit.btcPrice,
          timer,
          quoteMint: quoteIssuerKit.mint,
          unitAmountIn: extraAssetKit.btcAmountIn,
          quoteInterval,
        })
      : makeManualPriceAuthority({
          actualBrandIn: extraAssetKit.btc.brand,
          actualBrandOut: run.brand,
          initialPrice: extraAssetKit.btcPrice,
          timer,
          quoteIssuerKit,
        });
  }

  const baggage = makeScalarBigMapStore('baggage');
  const { priceAuthority: priceAuthorityReg, adminFacet: priceAuthorityAdmin } =
    providePriceAuthorityRegistry(baggage);
  await E(priceAuthorityAdmin).registerPriceAuthority(
    aethTestPriceAuthority,
    aeth.brand,
    run.brand,
  );

  if (extraAssetKit && abtcTestPriceAuthority) {
    await E(priceAuthorityAdmin).registerPriceAuthority(
      abtcTestPriceAuthority,
      extraAssetKit.btc.brand,
      run.brand,
    );
  }

  space.produce.priceAuthority.resolve(priceAuthorityReg);

  const auctionParams = {
    StartFrequency,
    ClockStep,
    StartingRate,
    LowestRate,
    DiscountStep,
    AuctionStartDelay,
    PriceLockPeriod,
  };

  await startAuctioneer(space, { auctionParams });
  return {
    space,
    priceAuthority: priceAuthorityReg,
    priceAuthorityAdmin,
    aethTestPriceAuthority,
    abtcTestPriceAuthority,
  };
};
