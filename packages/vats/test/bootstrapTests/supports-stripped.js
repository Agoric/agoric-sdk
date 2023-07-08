//wip hackery do not merge
// @ts-check
/* global process */
import * as fsAmbient from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { basename } from 'path';
import { inspect } from 'util';
import childProcessAmbient from 'child_process';

import { Fail } from '@agoric/assert';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain-stripped.js';
import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-liveslots/test/kmarshal.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
/* eslint-disable import/no-extraneous-dependencies */
import { E } from '@endo/eventual-send';
import { makeQueue } from '@endo/stream';
import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '../../tools/board-utils.js';

const sink = () => {};

/**
 * @param {import('@agoric/swingset-vat/src/controller/controller').SwingsetController} controller
 * @param {(..._: any[]) => any} log
 */
const makeRunUtils = (controller, log = (..._) => {}) => {
  let cranksRun = 0;

  const mutex = makeQueue();

  mutex.put(controller.run());

  const go = async () => {
    try {
      await mutex.get();
    } catch {
      // noop because the result will resolve for the previous runMethod return
    }
  };

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

    if (method === 'messageVat') {
      console.log(`@@@@ start runMethod messageVat ${args[0].name}<-${args[0].methodName}(${inspect(args[0].args)})`);
    } else if (method === 'messageVatObject') {
      console.log(`@@@@ start runMethod messageVatObject ${inspect(args[0].presence)}<-${args[0].methodName}(${inspect(args[0].args)})`);
    } else {
      console.log(`@@@@ start runMethod ${method} ${inspect(args)}`);
    }
    const kpid = await runThunk(() =>
      controller.queueToVatRoot('bootstrap', method, args),
    );
    console.log(`@@@@ end runMethod ${method}`);

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

  return harden({ runThunk, EV, go });
};

const getNodeTestVaultsConfig = async (
  bundleDir = './bundles',
  specifier = '@agoric/vats/decentral-itest-vaults-config.json',
) => {
  const fullPath = new URL(await importMetaResolve(specifier, import.meta.url)).pathname;

  const config = /** @type {SwingSetConfig & {coreProposals?: any[]}} */ (
    await loadSwingsetConfigFile(fullPath)
  );
  assert(config);

  // speed up (e.g. 80s vs 133s with xs-worker in production config)
  config.defaultManagerType = 'local';
  // speed up build (60s down to 10s in testing)
  config.bundleCachePath = bundleDir;
  await fsAmbient.promises.mkdir(bundleDir, { recursive: true });

  if (config.coreProposals) {
    // remove Pegasus because it relies on IBC to Golang that isn't running
    config.coreProposals = config.coreProposals.filter(
      v => v !== '@agoric/pegasus/scripts/init-core.js',
    );
  }

  const testConfigPath = `${bundleDir}/${basename(specifier)}`;
  await fsAmbient.promises.writeFile(
    testConfigPath,
    JSON.stringify(config),
    'utf-8',
  );
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
 */
export const makeSwingsetTestKit = async t => {
  const chainStorage = makeFakeStorageKit('bootstrapTests');
  const configPath = await getNodeTestVaultsConfig('./bundles', undefined);
  const swingStore = initSwingStore();
  const { kernelStorage, hostStorage } = swingStore;
  const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

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
            // TODO consider letting config specify vbank assets
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
        return chainStorage.toStorage(obj);
      default:
        throw Error(`unknown bridgeId ${bridgeId}`);
    }
  };

  const { controller } = await buildSwingset(
    bridgeOutbound,
    kernelStorage,
    configPath,
    [],
    {},
    { debugName: 'TESTBOOT' },
  );

  const runUtils = makeRunUtils(controller, t.log);

  const shutdown = async () =>
    Promise.all([controller.shutdown(), hostStorage.close()]).then(() => {});

  return {
    runUtils,
    shutdown,
    chainStorage,
  };
};
