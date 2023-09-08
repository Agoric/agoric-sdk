/* eslint-disable jsdoc/require-param-type, jsdoc/require-param, @jessie.js/safe-await-separator */
/* global process */

import childProcessAmbient from 'child_process';
import { promises as fsAmbientPromises } from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { basename } from 'path';
import { inspect } from 'util';

import { Fail, NonNullish } from '@agoric/assert';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import { BridgeId, VBankAccount, makeTracer } from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import {
  FakeStorageKit,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-liveslots/test/kmarshal.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { TimeMath, Timestamp } from '@agoric/time';
import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import { makeQueue } from '@endo/stream';

import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import type { BootstrapRootObject } from '@agoric/vats/src/core/lib-boot';
import type { ExecutionContext } from 'ava';
import type { E } from '@endo/eventual-send';

const sink = () => {};

const trace = makeTracer('BSTSupport', false);

export const bootstrapMethods: { [P in keyof BootstrapRootObject]: P } = {
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

const keysToObject = <K extends PropertyKey, V>(
  keys: K[],
  valueMaker: (key: K, i: number) => V,
) => {
  return Object.fromEntries(keys.map((key, i) => [key, valueMaker(key, i)]));
};

/**
 * AVA's default t.deepEqual() is nearly unreadable for sorted arrays of
 * strings.
 */
export const keyArrayEqual = (
  t: ExecutionContext,
  a: PropertyKey[],
  b: PropertyKey[],
  message?: string,
) => {
  const aobj = keysToObject(a, () => 1);
  const bobj = keysToObject(b, () => 1);
  return t.deepEqual(aobj, bobj, message);
};

export const makeRunUtils = (
  controller: SwingsetController,
  log = (..._) => {},
) => {
  let cranksRun = 0;

  const mutex = makeQueue();

  mutex.put(controller.run());

  const runThunk = async <T extends () => any>(
    thunk: T,
  ): Promise<ReturnType<T>> => {
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

  const runMethod = async (method: string, args: object[] = []) => {
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

  type EVProxy = typeof E & {
    sendOnly: (presence: unknown) => Record<string, (...args: any) => void>;
    vat: (name: string) => Record<string, (...args: any) => Promise<any>>;
    rawBoot: Record<string, (...args: any) => Promise<any>>;
  };
  // @ts-expect-error XXX casting
  const EV: EVProxy = presence =>
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
          assert.string(methodName);
          if (name === 'meta') {
            return runMethod(methodName, args);
          }
          return runMethod('messageVat', [{ name, methodName, args }]);
        }),
    });
  EV.rawBoot = new Proxy(harden({}), {
    get: (_t, methodName, _rx) =>
      // @ts-expect-error FIXME runMethod takes string but proxy allows symbol
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
  // @ts-expect-error 'get' is a read-only property
  EV.get = presence =>
    new Proxy(harden({}), {
      get: (_t, pathElement, _rx) =>
        runMethod('awaitVatObject', [{ presence, path: [pathElement] }]),
    });

  return harden({ runThunk, EV });
};
export type RunUtils = ReturnType<typeof makeRunUtils>;

export const getNodeTestVaultsConfig = async (
  bundleDir = 'bundles',
  specifier = '@agoric/vm-config/decentral-itest-vaults-config.json',
) => {
  const fullPath = await importMetaResolve(specifier, import.meta.url).then(
    u => new URL(u).pathname,
  );
  const config: SwingSetConfig & { coreProposals?: any[] } = NonNullish(
    await loadSwingsetConfigFile(fullPath),
  );

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

interface Powers {
  childProcess: Pick<typeof import('node:child_process'), 'execFileSync'>;
  fs: typeof import('node:fs/promises');
}

export const makeProposalExtractor = ({ childProcess, fs }: Powers) => {
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
  const parseProposalParts = (txt: string) => {
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

  const buildAndExtract = async ({
    package: packageName,
    packageScriptName,
    env = {},
  }: {
    package: string;
    packageScriptName: string;
    env?: Record<string, string>;
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
          loadJSON(bundleFile) as Promise<EndoZipBase64Bundle>,
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
 * @param t
 * @param bundleDir directory to write bundles and config to
 * @param [options]
 * @param [options.configSpecifier] bootstrap config specifier
 * @param [options.storage]
 */
export const makeSwingsetTestKit = async (
  t: ExecutionContext,
  bundleDir: string = 'bundles',
  {
    configSpecifier,
    storage = makeFakeStorageKit('bootstrapTests'),
  }: { configSpecifier?: string; storage?: FakeStorageKit } = {},
) => {
  console.time('makeSwingsetTestKit');
  const configPath = await getNodeTestVaultsConfig(bundleDir, configSpecifier);
  const swingStore = initSwingStore();
  const { kernelStorage, hostStorage } = swingStore;
  const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

  const readLatest = path => {
    const data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    trace('readLatest', path, 'returning', inspect(data, false, 20, true));
    return data;
  };

  let lastNonce = 0n;

  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   */
  const bridgeOutbound = (bridgeId: string, obj: any) => {
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
    [],
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
  const jumpTimeTo = (targetTime: Timestamp) => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    currentTime = targetTime;
    trace('jumpTimeTo', currentTime);
    return runUtils.runThunk(() => timer.poll(currentTime));
  };
  const advanceTimeTo = async (targetTime: Timestamp) => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    while (currentTime < targetTime) {
      trace('stepping time from', currentTime, 'towards', targetTime);
      currentTime += 1n;
      await runUtils.runThunk(() => timer.poll(currentTime));
    }
  };
  const advanceTimeBy = (
    n: number,
    unit: 'seconds' | 'minutes' | 'hours' | 'days',
  ) => {
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
export type SwingsetTestKit = Awaited<ReturnType<typeof makeSwingsetTestKit>>;
