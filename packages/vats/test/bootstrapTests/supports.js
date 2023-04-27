// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import { Fail } from '@agoric/assert';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-liveslots/test/kmarshal.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { E } from '@endo/eventual-send';
import { makeQueue } from '@endo/stream';
import { promises as fs } from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { boardSlottingMarshaller } from '../../tools/board-utils.js';

// to retain for ESlint, used by typedef
E;

const sink = () => {};

/** @typedef {ReturnType<import('@agoric/vats/src/core/lib-boot').makeBootstrap>} BootstrapRootObject */

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

  const runMethod = async (method, args = []) => {
    log('runMethod', method, args, 'at', cranksRun);
    assert(Array.isArray(args));

    try {
      // this promise for the last lock may fail
      await mutex.get();
    } catch {
      // noop because the result will resolve for the previous runMethod return
    }

    const kpid = controller.queueToVatRoot('bootstrap', method, args);

    const getResult = () => {
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

    const result = controller.run().then(cranks => {
      cranksRun += cranks;
      log(`kernel ran ${cranks} cranks`);
      return getResult();
    });
    mutex.put(result.then(sink, sink));
    return result;
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

  return harden({ EV });
};

/**
 *
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

  const marshaller = boardSlottingMarshaller();

  /**
   * @param {string} walletAddress
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} walletPresence
   */
  const makeWalletDriver = (walletAddress, walletPresence) => ({
    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    executeOffer(offer) {
      const offerCapData = marshaller.serialize({
        method: 'executeOffer',
        offer,
      });
      return EV(walletPresence).handleBridgeAction(offerCapData, true);
    },
    /**
     * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
     * @returns {Promise<void>}
     */
    sendOffer(offer) {
      const offerCapData = marshaller.serialize({
        method: 'executeOffer',
        offer,
      });

      return EV.sendOnly(walletPresence).handleBridgeAction(offerCapData, true);
    },
    tryExitOffer(offerId) {
      const capData = marshaller.serialize({
        method: 'tryExitOffer',
        offerId,
      });
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
     * @returns {void}
     */
    sendOfferMaker(makeOffer, firstArg, secondArg) {
      const offer = makeOffer(agoricNamesRemotes.brand, firstArg, secondArg);
      this.sendOffer(offer);
    },
    /**
     * @returns {import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord}
     */
    getLatestUpdateRecord() {
      const key = `published.wallet.${walletAddress}`;
      const lastWalletStatus = JSON.parse(storage.data.get(key)?.at(-1));
      return JSON.parse(lastWalletStatus.body);
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
        .then(([walletPresence, _isNew]) =>
          makeWalletDriver(walletAddress, walletPresence),
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
 * @param {string} [specifier] bootstrap config specifier
 */
export const makeSwingsetTestKit = async (
  t,
  bundleDir = 'bundles',
  specifier,
) => {
  console.time('makeSwingsetTestKit');
  const configPath = await getNodeTestVaultsConfig(bundleDir, specifier);
  const { kernelStorage, hostStorage } = initSwingStore();

  const storage = makeFakeStorageKit('bootstrapTests');

  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   *
   * @param {string} bridgeId
   * @param {*} obj
   */
  const bridgeOutbound = (bridgeId, obj) => {
    switch (bridgeId) {
      case BridgeId.BANK:
        // bridgeOutbound bank : {
        //   moduleName: 'vbank/reserve',
        //   type: 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        // }
        if (
          obj.moduleName === VBankAccount.reserve.module &&
          obj.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        ) {
          return VBankAccount.reserve.address;
        }
        if (
          obj.moduleName === VBankAccount.provision.module &&
          obj.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        ) {
          return VBankAccount.provision.address;
        }

        // Observed message:
        // address: 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346',
        // denom: 'ibc/toyatom',
        // type: 'VBANK_GET_BALANCE'
        if (obj.type === 'VBANK_GET_BALANCE') {
          // empty balances for test, passed to `BigInt`
          return '0';
        }

        return undefined;
      case BridgeId.CORE:
      case BridgeId.DIBC:
      case BridgeId.PROVISION:
      case BridgeId.PROVISION_SMART_WALLET:
      case BridgeId.WALLET:
        console.warn('Bridge returning undefined for', bridgeId, ':', obj);
        return undefined;
      case BridgeId.STORAGE:
        void storage.toStorage(obj);
        return undefined;
      default:
        throw Error(`unknown bridgeId ${bridgeId}`);
    }
  };

  const { controller } = await buildSwingset(
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

  const shutdown = async () =>
    Promise.all([controller.shutdown(), hostStorage.close()]).then(() => {});

  return { controller, runUtils, storage, shutdown };
};
