// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import { Fail } from '@agoric/assert';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import { BridgeId, VBankAccount } from '@agoric/internal';
import {
  makeFakeStorageKit,
  slotToRemotable,
} from '@agoric/internal/src/storage-test-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-liveslots/test/kmarshal.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { E } from '@endo/eventual-send';
import { makeQueue } from '@endo/stream';
import { promises as fs } from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { unmarshalFromVstorage } from '@agoric/internal/src/lib-chainStorage.js';
import { boardSlottingMarshaller } from '../../tools/board-utils.js';

// to retain for ESlint, used by typedef
E;

const sink = () => {};

/** @typedef {Awaited<ReturnType<import('@agoric/vats/src/core/lib-boot').makeBootstrap>>} BootstrapRootObject */

/** @type {Record<keyof BootstrapRootObject, keyof BootstrapRootObject>} */
export const bootstrapMethods = {
  bootstrap: 'bootstrap',
  consumeItem: 'consumeItem',
  produceItem: 'produceItem',
  resetItem: 'resetItem',
  messageVat: 'messageVat',
  messageVatObject: 'messageVatObject',
  messageVatObjectSendOnly: 'messageVatObjectSendOnly',
  awaitVatObject: 'awaitVatObject',
  snapshotStore: 'snapshotStore',
};

/**
 * @template {PropertyKey} K
 * @template V
 * @param {K[]} keys
 * @param {(key: K, i: number) => V} valueMaker
 */
const keysToObject = (keys, valueMaker) => {
  return Object.fromEntries(keys.map((key, i) => [key, valueMaker(key, i)]));
};

/**
 * AVA's default t.deepEqual() is nearly unreadable for sorted arrays of strings.
 *
 * @param {{ deepEqual: (a: unknown, b: unknown, message?: string) => void}} t
 * @param {PropertyKey[]} a
 * @param {PropertyKey[]} b
 * @param {string} [message]
 */
export const keyArrayEqual = (t, a, b, message) => {
  const aobj = keysToObject(a, () => 1);
  const bobj = keysToObject(b, () => 1);
  return t.deepEqual(aobj, bobj, message);
};

/**
 * @param {import('@agoric/swingset-vat/src/controller/controller').SwingsetController} controller
 * @param {(..._: any[]) => any} log
 */
export const makeRunUtils = (controller, log = (..._) => {}) => {
  let cranksRun = 0;

  const mutex = makeQueue();

  mutex.put(controller.run());

  /**
   * @template {() => any} T
   * @param {T} thunk
   * @returns {Promise<ReturnType<T>>}
   */
  const runThunk = async thunk => {
    try {
      // this promise for the last lock may fail
      await mutex.get();
    } catch {
      // noop because the result will resolve for the previous runMethod return
    }

    const thunkResult = await thunk();

    const result = controller.run().then(cranks => {
      cranksRun += cranks;
      log(`kernel ran ${cranks} cranks`);
      return thunkResult;
    });
    mutex.put(result.then(sink, sink));
    return result;
  };

  const runMethod = async (method, args = []) => {
    log('runMethod', method, args, 'at', cranksRun);
    assert(Array.isArray(args));

    const kpid = await runThunk(() =>
      controller.queueToVatRoot('bootstrap', method, args),
    );

    const status = controller.kpStatus(kpid);
    switch (status) {
      case 'fulfilled':
        return kunser(controller.kpResolution(kpid));
      case 'rejected':
        throw kunser(controller.kpResolution(kpid));
      case 'unresolved':
        throw Error(`unresolved for method ${method}`);
      default:
        throw Fail`unknown status ${status}`;
    }
  };

  /**
   * @type {typeof E & {
   *   sendOnly: (presence: unknown) => Record<string, (...args: any) => void>,
   *   vat: (name: string) => Record<string, (...args: any) => Promise<any>>,
   *   rawBoot: Record<string, (...args: any) => Promise<any>>,
   * }}
   */
  // @ts-expect-error cast, approximate
  const EV = presence =>
    new Proxy(harden({}), {
      get: (_t, methodName, _rx) =>
        harden((...args) =>
          runMethod('messageVatObject', [{ presence, methodName, args }]),
        ),
    });
  EV.vat = name =>
    new Proxy(harden({}), {
      get: (_t, methodName, _rx) =>
        harden((...args) => {
          if (name === 'meta') {
            return runMethod(methodName, args);
          }
          return runMethod('messageVat', [{ name, methodName, args }]);
        }),
    });
  EV.rawBoot = new Proxy(harden({}), {
    get: (_t, methodName, _rx) =>
      harden((...args) => runMethod(methodName, args)),
  });
  // @ts-expect-error xxx
  EV.sendOnly = presence =>
    new Proxy(
      {},
      {
        get:
          (_t, methodName, _rx) =>
          (...args) =>
            runMethod('messageVatObjectSendOnly', [
              { presence, methodName, args },
            ]),
      },
    );
  // @ts-expect-error xxx
  EV.get = presence =>
    new Proxy(harden({}), {
      get: (_t, pathElement, _rx) =>
        runMethod('awaitVatObject', [{ presence, path: [pathElement] }]),
    });

  return harden({ runThunk, EV });
};

/**
 * @param {ReturnType<typeof makeRunUtils>} runUtils
 * @param {import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit} storage
 * @param {import('../../tools/board-utils.js').AgoricNamesRemotes} agoricNamesRemotes
 */
export const makeWalletFactoryDriver = async (
  runUtils,
  storage,
  agoricNamesRemotes,
) => {
  const { EV } = runUtils;

  const walletFactoryStartResult = await EV.vat('bootstrap').consumeItem(
    'walletFactoryStartResult',
  );
  const bankManager = await EV.vat('bootstrap').consumeItem('bankManager');
  const namesByAddressAdmin = await EV.vat('bootstrap').consumeItem(
    'namesByAddressAdmin',
  );

  const marshaller = boardSlottingMarshaller(slotToRemotable);

  /**
   * @param {string} walletAddress
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} walletPresence
   * @param {boolean} isNew
   */
  const makeWalletDriver = (walletAddress, walletPresence, isNew) => ({
    isNew,

    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    executeOffer(offer) {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );
      return EV(walletPresence).handleBridgeAction(offerCapData, true);
    },
    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    sendOffer(offer) {
      const offerCapData = marshaller.toCapData(
        harden({
          method: 'executeOffer',
          offer,
        }),
      );

      return EV.sendOnly(walletPresence).handleBridgeAction(offerCapData, true);
    },
    tryExitOffer(offerId) {
      const capData = marshaller.toCapData(
        harden({
          method: 'tryExitOffer',
          offerId,
        }),
      );
      return EV(walletPresence).handleBridgeAction(capData, true);
    },
    /**
     * @template {(brands: Record<string, Brand>, ...rest: any) => import('@agoric/smart-wallet/src/offers.js').OfferSpec} M offer maker function
     * @param {M} makeOffer
     * @param {Parameters<M>[1]} firstArg
     * @param {Parameters<M>[2]} [secondArg]
     * @returns {Promise<void>}
     */
    executeOfferMaker(makeOffer, firstArg, secondArg) {
      const offer = makeOffer(agoricNamesRemotes.brand, firstArg, secondArg);
      return this.executeOffer(offer);
    },
    /**
     * @template {(brands: Record<string, Brand>, ...rest: any) => import('@agoric/smart-wallet/src/offers.js').OfferSpec} M offer maker function
     * @param {M} makeOffer
     * @param {Parameters<M>[1]} firstArg
     * @param {Parameters<M>[2]} [secondArg]
     * @returns {Promise<void>}
     */
    sendOfferMaker(makeOffer, firstArg, secondArg) {
      const offer = makeOffer(agoricNamesRemotes.brand, firstArg, secondArg);
      return this.sendOffer(offer);
    },
    /**
     * @returns {import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord}
     */
    getLatestUpdateRecord() {
      const fromCapData = (...args) =>
        Reflect.apply(marshaller.fromCapData, marshaller, args);
      return unmarshalFromVstorage(
        storage.data,
        `published.wallet.${walletAddress}`,
        fromCapData,
      );
    },
  });

  return {
    /**
     * @param {string} walletAddress
     */
    async provideSmartWallet(walletAddress) {
      const bank = await EV(bankManager).getBankForAddress(walletAddress);
      return EV(walletFactoryStartResult.creatorFacet)
        .provideSmartWallet(walletAddress, bank, namesByAddressAdmin)
        .then(([walletPresence, isNew]) =>
          makeWalletDriver(walletAddress, walletPresence, isNew),
        );
    },
  };
};

export const getNodeTestVaultsConfig = async (
  bundleDir = 'bundles',
  specifier = '@agoric/vats/decentral-test-vaults-config.json',
) => {
  const fullPath = await importMetaResolve(specifier, import.meta.url).then(
    u => new URL(u).pathname,
  );
  const config = await loadSwingsetConfigFile(fullPath);
  assert(config);

  // speed up (e.g. 80s vs 133s with xs-worker in production config)
  config.defaultManagerType = 'local';
  // speed up build (60s down to 10s in testing)
  config.bundleCachePath = bundleDir;
  await fs.mkdir(bundleDir, { recursive: true });

  // remove Pegasus because it relies on IBC to Golang that isn't running
  config.coreProposals = config.coreProposals?.filter(
    v => v !== '@agoric/pegasus/scripts/init-core.js',
  );
  // set to high interestRateBP to accelerate liquidation
  for (const addVaultTypeProposal of (config.coreProposals || []).filter(
    p =>
      typeof p === 'object' &&
      p.module === '@agoric/inter-protocol/scripts/add-collateral-core.js' &&
      p.entrypoint === 'defaultProposalBuilder',
  )) {
    const opt = /** @type {any} */ (addVaultTypeProposal).args[0];
    opt.interestRateBP = 10 * 100 * 100; // 10x APR
  }

  const testConfigPath = `${bundleDir}/decentral-test-vaults-config.json`;
  await fs.writeFile(testConfigPath, JSON.stringify(config), 'utf-8');
  return testConfigPath;
};

/**
 * Start a SwingSet kernel to be shared across all tests. By default Ava tests
 * run in parallel, so be careful to avoid ordering dependencies between them.
 * For example, test accounts balances using separate wallets or test vault
 * factory metrics using separate collateral managers. (Or use test.serial)
 *
 * The shutdown() function *must* be called after the test is
 * complete, or else V8 will see the xsnap workers still running, and
 * will never exit (leading to a timeout error). Use
 * t.after.always(shutdown), because the normal t.after() hooks are
 * not run if a test fails.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {string} bundleDir directory to write bundles and config to
 * @param {object} [options]
 * @param {string} [options.configSpecifier] bootstrap config specifier
 * @param {import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit} [options.storage]
 */
export const makeSwingsetTestKit = async (
  t,
  bundleDir = 'bundles',
  { configSpecifier, storage = makeFakeStorageKit('bootstrapTests') } = {},
) => {
  console.time('makeSwingsetTestKit');
  const configPath = await getNodeTestVaultsConfig(bundleDir, configSpecifier);
  const swingStore = initSwingStore();
  const { kernelStorage, hostStorage } = swingStore;
  const { fromCapData } = boardSlottingMarshaller(slotToRemotable);

  const readLatest = path =>
    unmarshalFromVstorage(storage.data, path, fromCapData);

  let lastNonce = 0n;

  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   *
   * @param {string} bridgeId
   * @param {*} obj
   */
  const bridgeOutbound = (bridgeId, obj) => {
    switch (bridgeId) {
      case BridgeId.BANK: {
        // bridgeOutbound bank : {
        //   moduleName: 'vbank/reserve',
        //   type: 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        // }
        switch (obj.type) {
          case 'VBANK_GET_MODULE_ACCOUNT_ADDRESS': {
            const { moduleName } = obj;
            const moduleDescriptor = Object.values(VBankAccount).find(
              ({ module }) => module === moduleName,
            );
            if (!moduleDescriptor) {
              return 'undefined';
            }
            return moduleDescriptor.address;
          }

          // Observed message:
          // address: 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346',
          // denom: 'ibc/toyatom',
          // type: 'VBANK_GET_BALANCE'
          case 'VBANK_GET_BALANCE': {
            // empty balances for test.
            return '0';
          }

          case 'VBANK_GRAB':
          case 'VBANK_GIVE': {
            lastNonce += 1n;
            // Also empty balances.
            return harden({
              type: 'VBANK_BALANCE_UPDATE',
              nonce: `${lastNonce}`,
              updated: [],
            });
          }

          default: {
            return 'undefined';
          }
        }
      }
      case BridgeId.CORE:
      case BridgeId.DIBC:
      case BridgeId.PROVISION:
      case BridgeId.PROVISION_SMART_WALLET:
      case BridgeId.WALLET:
        console.warn('Bridge returning undefined for', bridgeId, ':', obj);
        return undefined;
      case BridgeId.STORAGE:
        return storage.toStorage(obj);
      default:
        throw Error(`unknown bridgeId ${bridgeId}`);
    }
  };

  const { controller, timer } = await buildSwingset(
    new Map(),
    bridgeOutbound,
    kernelStorage,
    configPath,
    {},
    {},
    { debugName: 'TESTBOOT' },
  );
  console.timeLog('makeSwingsetTestKit', 'buildSwingset');

  const runUtils = makeRunUtils(controller, t.log);

  console.timeEnd('makeSwingsetTestKit');

  let currentTime = 0;
  const setTime = time => {
    currentTime = time;
    return runUtils.runThunk(() => timer.poll(currentTime));
  };
  /**
   *
   * @param {number} n
   * @param {'seconds' | 'minutes' | 'hours'| 'days'} unit
   */
  const advanceTime = (n, unit) => {
    const multiplier = {
      seconds: 1,
      minutes: 60,
      hours: 60 * 60,
      days: 60 * 60 * 24,
    };
    currentTime += multiplier[unit] * n;
    return runUtils.runThunk(() => timer.poll(currentTime));
  };

  const shutdown = async () =>
    Promise.all([controller.shutdown(), hostStorage.close()]).then(() => {});

  return {
    advanceTime,
    swingStore,
    controller,
    readLatest,
    runUtils,
    setTime,
    shutdown,
    storage,
    timer,
  };
};
