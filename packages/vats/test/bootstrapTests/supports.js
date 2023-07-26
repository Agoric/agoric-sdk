// @ts-check
/* global process */

import { promises as fsAmbientPromises } from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { basename } from 'path';
import { inspect } from 'util';
import childProcessAmbient from 'child_process';

import { Fail } from '@agoric/assert';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import { BridgeId, makeTracer, VBankAccount } from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-liveslots/test/kmarshal.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { E } from '@endo/eventual-send';
import { makeQueue } from '@endo/stream';
import { TimeMath } from '@agoric/time';
import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '../../tools/board-utils.js';

// to retain for ESlint, used by typedef
E;

const sink = () => {};

const trace = makeTracer('BSTSupport', false);

/**
 * @typedef {Awaited<
 *   ReturnType<import('@agoric/vats/src/core/lib-boot').makeBootstrap>
 * >} BootstrapRootObject
 */

/** @type {{ [P in keyof BootstrapRootObject]: P }} */
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
 * AVA's default t.deepEqual() is nearly unreadable for sorted arrays of
 * strings.
 *
 * @param {{
 *   deepEqual: (a: unknown, b: unknown, message?: string) => void;
 * }} t
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
   *   sendOnly: (presence: unknown) => Record<string, (...args: any) => void>;
   *   vat: (name: string) => Record<string, (...args: any) => Promise<any>>;
   *   rawBoot: Record<string, (...args: any) => Promise<any>>;
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

export const getNodeTestVaultsConfig = async (
  bundleDir = 'bundles',
  specifier = '@agoric/boot/decentral-itest-vaults-config.json',
) => {
  const fullPath = await importMetaResolve(specifier, import.meta.url).then(
    u => new URL(u).pathname,
  );
  const config = /** @type {SwingSetConfig & { coreProposals?: any[] }} */ (
    await loadSwingsetConfigFile(fullPath)
  );
  assert(config);

  // speed up (e.g. 80s vs 133s with xs-worker in production config)
  config.defaultManagerType = 'local';
  // speed up build (60s down to 10s in testing)
  config.bundleCachePath = bundleDir;
  await fsAmbientPromises.mkdir(bundleDir, { recursive: true });

  if (config.coreProposals) {
    // remove Pegasus because it relies on IBC to Golang that isn't running
    config.coreProposals = config.coreProposals.filter(
      v => v !== '@agoric/pegasus/scripts/init-core.js',
    );
  }

  const testConfigPath = `${bundleDir}/${basename(specifier)}`;
  await fsAmbientPromises.writeFile(
    testConfigPath,
    JSON.stringify(config),
    'utf-8',
  );
  return testConfigPath;
};

/**
 * @param {object} powers
 * @param {Pick<typeof import('node:child_process'), 'execFileSync'>} powers.childProcess
 * @param {typeof import('node:fs/promises')} powers.fs
 */
export const makeProposalExtractor = ({ childProcess, fs }) => {
  const getPkgPath = (pkg, fileName = '') =>
    new URL(`../../../${pkg}/${fileName}`, import.meta.url).pathname;

  const runPackageScript = async (pkg, name, env) => {
    console.warn(pkg, 'running package script:', name);
    const pkgPath = getPkgPath(pkg);
    return childProcess.execFileSync('yarn', ['run', name], {
      cwd: pkgPath,
      env,
    });
  };

  const loadJSON = async filePath =>
    harden(JSON.parse(await fs.readFile(filePath, 'utf8')));

  // XXX parses the output to find the files but could write them to a path that can be traversed
  /** @param {string} txt */
  const parseProposalParts = txt => {
    const evals = [
      ...txt.matchAll(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/g),
    ].map(m => {
      if (!m.groups) throw Fail`Invalid proposal output ${m[0]}`;
      const { permit, script } = m.groups;
      return { permit, script };
    });
    evals.length ||
      Fail`No swingset-core-eval found in proposal output: ${txt}`;

    const bundles = [
      ...txt.matchAll(/swingset install-bundle @([^\n]+)/gm),
    ].map(([, bundle]) => bundle);
    bundles.length || Fail`No bundles found in proposal output: ${txt}`;

    return { evals, bundles };
  };

  /**
   * @param {object} options
   * @param {string} options.package
   * @param {string} options.packageScriptName
   * @param {Record<string, string>} [options.env]
   */
  const buildAndExtract = async ({
    package: packageName,
    packageScriptName,
    env = {},
  }) => {
    const scriptEnv = Object.assign(Object.create(process.env), env);
    // XXX use '@agoric/inter-protocol'?
    const out = await runPackageScript(
      packageName,
      packageScriptName,
      scriptEnv,
    );
    const built = parseProposalParts(out.toString());

    const loadAndRmPkgFile = async fileName => {
      const filePath = getPkgPath(packageName, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.rm(filePath);
      return content;
    };

    const evalsP = Promise.all(
      built.evals.map(async ({ permit, script }) => {
        const [permits, code] = await Promise.all([
          loadAndRmPkgFile(permit),
          loadAndRmPkgFile(script),
        ]);
        return { json_permits: permits, js_code: code };
      }),
    );

    const bundlesP = Promise.all(
      built.bundles.map(
        async bundleFile =>
          /** @type {Promise<EndoZipBase64Bundle>} */ (loadJSON(bundleFile)),
      ),
    );
    return Promise.all([evalsP, bundlesP]).then(([evals, bundles]) => ({
      evals,
      bundles,
    }));
  };
  return buildAndExtract;
};
harden(makeProposalExtractor);

/**
 * Start a SwingSet kernel to be shared across all tests. By default Ava tests
 * run in parallel, so be careful to avoid ordering dependencies between them.
 * For example, test accounts balances using separate wallets or test vault
 * factory metrics using separate collateral managers. (Or use test.serial)
 *
 * The shutdown() function _must_ be called after the test is complete, or else
 * V8 will see the xsnap workers still running, and will never exit (leading to
 * a timeout error). Use t.after.always(shutdown), because the normal t.after()
 * hooks are not run if a test fails.
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
  const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

  const readLatest = path => {
    const data = unmarshalFromVstorage(storage.data, path, fromCapData);
    trace('readLatest', path, 'returning', inspect(data, false, 20, true));
    return data;
  };

  let lastNonce = 0n;

  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   *
   * @param {string} bridgeId
   * @param {any} obj
   */
  const bridgeOutbound = (bridgeId, obj) => {
    switch (bridgeId) {
      case BridgeId.BANK: {
        trace(
          'bridgeOutbound BANK',
          obj.type,
          obj.recipient,
          obj.amount,
          obj.denom,
        );
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

  const buildProposal = makeProposalExtractor({
    childProcess: childProcessAmbient,
    fs: fsAmbientPromises,
  });

  console.timeEnd('makeSwingsetTestKit');

  let currentTime = 0n;
  /** @param {Timestamp} targetTime */
  const jumpTimeTo = targetTime => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    currentTime = targetTime;
    trace('jumpTimeTo', currentTime);
    return runUtils.runThunk(() => timer.poll(currentTime));
  };
  /** @param {Timestamp} targetTime */
  const advanceTimeTo = async targetTime => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    while (currentTime < targetTime) {
      trace('stepping time from', currentTime, 'towards', targetTime);
      currentTime += 1n;
      await runUtils.runThunk(() => timer.poll(currentTime));
    }
  };
  /**
   * @param {number} n
   * @param {'seconds' | 'minutes' | 'hours' | 'days'} unit
   */
  const advanceTimeBy = (n, unit) => {
    const multiplier = {
      seconds: 1,
      minutes: 60,
      hours: 60 * 60,
      days: 60 * 60 * 24,
    };
    const targetTime = currentTime + BigInt(multiplier[unit] * n);
    trace('advanceTimeBy', n, unit, 'to', targetTime);
    return advanceTimeTo(targetTime);
  };

  const shutdown = async () =>
    Promise.all([controller.shutdown(), hostStorage.close()]).then(() => {});

  return {
    advanceTimeBy,
    advanceTimeTo,
    buildProposal,
    controller,
    jumpTimeTo,
    readLatest,
    runUtils,
    shutdown,
    storage,
    swingStore,
    timer,
  };
};
