/* eslint-disable jsdoc/require-param, @jessie.js/safe-await-separator */
/* eslint-env node */

import childProcessAmbient from 'child_process';
import { promises as fsAmbientPromises } from 'fs';
import { createRequire } from 'node:module';
import { basename, join } from 'path';
import { inspect } from 'util';

import type { TypedPublished } from '@agoric/client-utils';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import {
  BridgeId,
  makeTracer,
  NonNullish,
  VBankAccount,
  type Remote,
} from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { krefOf } from '@agoric/kmarshal';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { initSwingStore } from '@agoric/swing-store';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { makeSlogSender } from '@agoric/telemetry';
import { TimeMath, type Timestamp } from '@agoric/time';
import { fakeLocalChainBridgeTxMsgHandler } from '@agoric/vats/tools/fake-bridge.js';
import { Fail } from '@endo/errors';

import {
  makeRunUtils,
  type RunHarness,
  type RunUtils,
} from '@agoric/swingset-vat/tools/run-utils.js';
import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';

import type { ExecutionContext as AvaT } from 'ava';

import type { CoreEvalSDKType } from '@agoric/cosmic-proto/swingset/swingset.js';
import { computronCounter } from '@agoric/cosmic-swingset/src/computron-counter.js';
import {
  defaultBeansPerVatCreation,
  defaultBeansPerXsnapComputron,
} from '@agoric/cosmic-swingset/src/sim-params.js';
import type { FastUSDCCorePowers } from '@agoric/fast-usdc/src/start-fast-usdc.core.js';
import type { EconomyBootstrapPowers } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import type { BridgeHandler, IBCDowncallMethod, IBCMethod } from '@agoric/vats';
import type { BootstrapRootObject } from '@agoric/vats/src/core/lib-boot.js';
import type { EProxy } from '@endo/eventual-send';
import { tmpdir } from 'node:os';
import { FileSystemCache, NodeFetchCache } from 'node-fetch-cache';
import { icaMocks, protoMsgMockMap, protoMsgMocks } from './ibc/mocks.js';

const trace = makeTracer('BSTSupport', false);

// Releases are immutable, so we can cache them.
// Doesn't help in CI but speeds up local development.
// CI is on Github Actions, so fetching is reliable.
// Files appear in a .cache directory.
export const fetchCached = NodeFetchCache.create({
  cache: new FileSystemCache(),
}) as unknown as typeof globalThis.fetch;

type ConsumeBootrapItem = <N extends string>(
  name: N,
) => N extends keyof FastUSDCCorePowers['consume']
  ? FastUSDCCorePowers['consume'][N]
  : N extends keyof EconomyBootstrapPowers['consume']
    ? EconomyBootstrapPowers['consume'][N]
    : unknown;

// XXX should satisfy EVProxy from run-utils.js but that's failing to import
/**
 * Elaboration of EVProxy with knowledge of bootstrap space in these tests.
 */
type BootstrapEV = EProxy & {
  sendOnly: (presence: unknown) => Record<string, (...args: any) => void>;
  vat: <N extends string>(
    name: N,
  ) => N extends 'bootstrap'
    ? Omit<BootstrapRootObject, 'consumeItem'> & {
        // XXX not really local
        consumeItem: ConsumeBootrapItem;
      } & Remote<{ consumeItem: ConsumeBootrapItem }>
    : Record<string, (...args: any) => Promise<any>>;
};

const makeBootstrapRunUtils = makeRunUtils as (
  controller: SwingsetController,
  harness?: RunHarness,
) => Omit<RunUtils, 'EV'> & { EV: BootstrapEV };

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
/**
 * Compare two arrays of property keys for equality in a way that's more readable
 * in AVA test output than the default t.deepEqual().
 *
 * @param t - AVA test context
 * @param a - First array of property keys to compare
 * @param b - Second array of property keys to compare
 * @param message - Optional message to display on failure
 * @returns The result of t.deepEqual() on objects created from the arrays
 */
export const keyArrayEqual = (
  t: AvaT,
  a: PropertyKey[],
  b: PropertyKey[],
  message?: string,
) => {
  const aobj = keysToObject(a, () => 1);
  const bobj = keysToObject(b, () => 1);
  return t.deepEqual(aobj, bobj, message);
};

/**
 * Prepares a SwingSet configuration for testing vaults.
 *
 * @param options - Configuration options
 * @param options.bundleDir - Directory to store bundle cache files
 * @param options.configPath - Path to the base config file
 * @param options.defaultManagerType - SwingSet manager type to use
 * @param options.discriminator - Optional string to include in the config filename
 * @returns Path to the generated config file
 */
export const getNodeTestVaultsConfig = async ({
  bundleDir,
  configPath,
  defaultManagerType = 'local' as ManagerType,
  discriminator = '',
}) => {
  const config: SwingSetConfig & { coreProposals?: any[] } = NonNullish(
    await loadSwingsetConfigFile(configPath),
  );

  // Manager types:
  //   'local':
  //     - much faster (~3x speedup)
  //     - much easier to use debugger
  //     - exhibits inconsistent GC behavior from run to run
  //   'xs-worker'
  //     - timing results more accurately reflect production
  config.defaultManagerType = defaultManagerType;
  // speed up build (60s down to 10s in testing)
  config.bundleCachePath = bundleDir;
  await fsAmbientPromises.mkdir(bundleDir, { recursive: true });

  if (config.coreProposals) {
    // remove Pegasus because it relies on IBC to Golang that isn't running
    config.coreProposals = config.coreProposals.filter(
      v => v !== '@agoric/pegasus/scripts/init-core.js',
    );
  }

  // make an almost-certainly-unique file name with a fixed-length prefix
  const configFilenameParts = [
    'config',
    discriminator,
    new Date().toISOString().replaceAll(/[^0-9TZ]/g, ''),
    `${Math.random()}`.replace(/.*[.]/, '').padEnd(8, '0').slice(0, 8),
    basename(configPath),
  ].filter(s => !!s);
  const testConfigPath = `${bundleDir}/${configFilenameParts.join('.')}`;
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

/**
 * Creates a function that can build and extract proposal data from package scripts.
 *
 * @param powers - Object containing required capabilities
 * @param powers.childProcess - Node child_process module for executing commands
 * @param powers.fs - Node fs/promises module for file operations
 * @returns A function that builds and extracts proposal data
 */
export const makeProposalExtractor = (
  { childProcess, fs }: Powers,
  resolveBase = import.meta.url,
) => {
  const importSpec = createRequire(resolveBase).resolve;
  const runPackageScript = (
    outputDir: string,
    scriptPath: string,
    env: NodeJS.ProcessEnv,
    cliArgs: string[] = [],
  ) => {
    console.info('running package script:', scriptPath);
    return childProcess.execFileSync(
      importSpec('agoric/src/entrypoint.js'),
      ['run', scriptPath, ...cliArgs],
      {
        cwd: outputDir,
        env,
      },
    );
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

  const buildAndExtract = async (builderPath: string, args: string[] = []) => {
    // XXX rebuilds every time
    const tmpDir = await fsAmbientPromises.mkdtemp(
      join(tmpdir(), 'agoric-proposal-'),
    );

    const built = parseProposalParts(
      runPackageScript(
        tmpDir,
        importSpec(builderPath),
        process.env,
        args,
      ).toString(),
    );

    const loadPkgFile = fileName => fs.readFile(join(tmpDir, fileName), 'utf8');

    const evalsP = Promise.all(
      built.evals.map(async ({ permit, script }) => {
        const [permits, code] = await Promise.all([
          loadPkgFile(permit),
          loadPkgFile(script),
        ]);
        // Fire and forget. There's a chance the Node process could terminate
        // before the deletion completes. This is a minor inconvenience to clean
        // up manually and not worth slowing down the test execution to prevent.
        void fsAmbientPromises.rm(tmpDir, { recursive: true, force: true });
        return { json_permits: permits, js_code: code } as CoreEvalSDKType;
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
 * Compares two references for equality using krefOf.
 *
 * @param t - AVA test context
 * @param ref1 - First reference to compare
 * @param ref2 - Second reference to compare
 * @param message - Optional message to display on failure
 * @returns The result of t.is() on the kref values
 */
export const matchRef = (
  t: AvaT,
  ref1: unknown,
  ref2: unknown,
  message?: string,
) => t.is(krefOf(ref1), krefOf(ref2), message);

/**
 * Compares an amount object with expected brand and value.
 *
 * @param t - AVA test context
 * @param amount - Amount object to test
 * @param refBrand - Expected brand reference
 * @param refValue - Expected value
 * @param message - Optional message to display on failure
 */
export const matchAmount = (
  t: AvaT,
  amount: Amount,
  refBrand: Brand,
  refValue,
  message?: string,
) => {
  matchRef(t, amount.brand, refBrand);
  t.is(amount.value, refValue, message);
};

/**
 * Compares a value object with a reference value object.
 * Checks brand, denom, issuer, issuerName, and proposedName.
 *
 * @param t - AVA test context
 * @param value - Value object to test
 * @param ref - Reference value object to compare against
 */
export const matchValue = (t: AvaT, value, ref) => {
  matchRef(t, value.brand, ref.brand);
  t.is(value.denom, ref.denom);
  matchRef(t, value.issuer, ref.issuer);
  t.is(value.issuerName, ref.issuerName);
  t.is(value.proposedName, ref.proposedName);
};

/**
 * Checks that an iterator is not done and its current value matches the reference.
 *
 * @param t - AVA test context
 * @param iter - Iterator to test
 * @param valueRef - Reference value to compare against the iterator's current value
 */
export const matchIter = (t: AvaT, iter, valueRef) => {
  t.is(iter.done, false);
  matchValue(t, iter.value, valueRef);
};

/**
 * Enumeration of acknowledgment behaviors for IBC bridge messages.
 */
export const AckBehavior = {
  /** inbound responses are queued. use `flushInboundQueue()` to simulate the remote response */
  Queued: 'QUEUED',
  /** inbound messages are delivered immediately */
  Immediate: 'IMMEDIATE',
  /** inbound responses never arrive (to simulate mis-configured connections etc.) */
  Never: 'NEVER',
} as const;
type AckBehaviorType = (typeof AckBehavior)[keyof typeof AckBehavior];

/**
 * Start a SwingSet kernel to be used by tests and benchmarks.
 *
 * In the case of Ava tests, this kernel is expected to be shared across all
 * tests in a given test module. By default Ava tests run in parallel, so be
 * careful to avoid ordering dependencies between them.  For example, test
 * accounts balances using separate wallets or test vault factory metrics using
 * separate collateral managers. (Or use test.serial)
 *
 * The shutdown() function _must_ be called after the test or benchmarks are
 * complete, else V8 will see the xsnap workers still running, and will never
 * exit (leading to a timeout error). Ava tests should use
 * t.after.always(shutdown), because the normal t.after() hooks are not run if a
 * test fails.
 *
 * @param log
 * @param bundleDir directory to write bundles and config to
 * @param [options]
 * @param [options.configSpecifier] bootstrap config specifier
 * @param [options.label] bootstrap config specifier
 * @param [options.storage]
 * @param [options.verbose]
 * @param [options.slogFile]
 * @param [options.profileVats]
 * @param [options.debugVats]
 * @param [options.defaultManagerType]
 * @param [options.harness]
 */
/**
 * Creates a SwingSet test environment with various utilities for testing.
 *
 * This function sets up a complete SwingSet kernel with mocked bridges and
 * utilities for time manipulation, proposal evaluation, and more.
 *
 * @param log - Logging function
 * @param bundleDir - Directory to store bundle cache files
 * @param options - Configuration options
 * @param options.configSpecifier - Path to the base config file
 * @param options.label - Optional label for the test environment
 * @param options.storage - Storage kit to use (defaults to fake storage)
 * @param options.verbose - Whether to enable verbose logging
 * @param options.slogFile - Path to write slog output
 * @param options.profileVats - Array of vat names to profile
 * @param options.debugVats - Array of vat names to debug
 * @param options.defaultManagerType - SwingSet manager type to use
 * @param options.harness - Optional run harness
 * @param options.resolveBase - Base URL or path for resolving module paths
 * @returns A test kit with various utilities for interacting with the SwingSet
 */
export const makeSwingsetTestKit = async (
  log: (..._: any[]) => void,
  bundleDir = 'bundles',
  {
    configSpecifier = '@agoric/vm-config/decentral-itest-vaults-config.json',
    label = undefined as string | undefined,
    storage = makeFakeStorageKit('bootstrapTests'),
    verbose = false,
    slogFile = undefined as string | undefined,
    profileVats = [] as string[],
    debugVats = [] as string[],
    defaultManagerType = 'local' as ManagerType,
    harness = undefined as RunHarness | undefined,
    resolveBase = import.meta.url,
  } = {},
) => {
  const importSpec = createRequire(resolveBase).resolve;
  console.time('makeBaseSwingsetTestKit');
  const configPath = await getNodeTestVaultsConfig({
    bundleDir,
    configPath: importSpec(configSpecifier),
    discriminator: label,
    defaultManagerType,
  });
  const swingStore = initSwingStore();
  const { kernelStorage, hostStorage } = swingStore;
  const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

  const readLatest = (path: string): any => {
    const data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    trace('readLatest', path, 'returning', inspect(data, false, 20, true));
    return data;
  };

  const readPublished = <T extends string>(subpath: T) =>
    readLatest(`published.${subpath}`) as TypedPublished<T>;

  let lastBankNonce = 0n;
  let ibcSequenceNonce = 0;
  let lcaSequenceNonce = 0;
  let lcaAccountsCreated = 0;

  const outboundMessages = new Map();

  const inbound: Awaited<ReturnType<typeof buildSwingset>>['bridgeInbound'] = (
    ...args
  ) => {
    console.log('inbound', ...args);
    bridgeInbound!(...args);
  };
  /**
   * Config DIBC bridge behavior.
   * Defaults to `Queued` unless specified.
   * Current only configured for `channelOpenInit` but can be
   * extended to support `sendPacket`.
   */
  const ackBehaviors: Partial<
    Record<BridgeId, Partial<Record<IBCDowncallMethod, AckBehaviorType>>>
  > = {
    [BridgeId.DIBC]: {
      startChannelOpenInit: AckBehavior.Queued,
    },
  };

  const shouldAckImmediately = (
    bridgeId: BridgeId,
    method: IBCDowncallMethod,
  ) => ackBehaviors?.[bridgeId]?.[method] === AckBehavior.Immediate;

  /**
   * configurable `bech32Prefix` for DIBC bridge
   * messages that involve creating an ICA.
   */
  let bech32Prefix = 'cosmos';
  /**
   * Adds the sequence so the bridge knows what response to connect it to.
   * Then queue it send it over the bridge over this returns.
   * Finally return the packet that will be sent.
   */
  const ackImmediately = (obj: IBCMethod<'sendPacket'>, ack: string) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(obj, ibcSequenceNonce, ack);
    setTimeout(() => {
      /**
       * Mock when Agoric receives the ack from another chain over DIBC. Always
       * happens after the packet is returned.
       */
      inbound(BridgeId.DIBC, msg);
    });
    return msg.packet;
  };

  const inboundQueue: [bridgeId: BridgeId, arg1: unknown][] = [];
  /** Add a message that will be sent to the bridge by flushInboundQueue. */
  const pushInbound = (bridgeId: BridgeId, arg1: unknown) => {
    inboundQueue.push([bridgeId, arg1]);
  };
  /**
   * Like ackImmediately but defers in the inbound receiverAck
   * until `bridgeQueue()` is awaited.
   */
  const ackLater = (obj: IBCMethod<'sendPacket'>, ack: string) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(obj, ibcSequenceNonce, ack);
    pushInbound(BridgeId.DIBC, msg);
    return msg.packet;
  };

  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   */
  const bridgeOutbound = (bridgeId: BridgeId, obj: any) => {
    // store all messages for querying by tests
    if (!outboundMessages.has(bridgeId)) {
      outboundMessages.set(bridgeId, []);
    }
    outboundMessages.get(bridgeId).push(obj);

    switch (bridgeId) {
      case BridgeId.BANK: {
        trace(
          'bridgeOutbound bank',
          obj.type,
          obj.recipient,
          obj.amount,
          obj.denom,
        );
        break;
      }
      case BridgeId.STORAGE:
        return storage.toStorage(obj);
      case BridgeId.PROVISION:
      case BridgeId.PROVISION_SMART_WALLET:
      case BridgeId.WALLET:
        console.warn('Bridge returning undefined for', bridgeId, ':', obj);
        return undefined;
      default:
        break;
    }

    const bridgeTargetRegistered = new Set();
    const bridgeType = `${bridgeId}:${obj.type}`;
    switch (bridgeType) {
      case `${BridgeId.BANK}:VBANK_GET_MODULE_ACCOUNT_ADDRESS`: {
        // bridgeOutbound bank : {
        //   moduleName: 'vbank/reserve',
        //   type: 'VBANK_GET_MODULE_ACCOUNT_ADDRESS'
        // }
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
      case `${BridgeId.BANK}:VBANK_GET_BALANCE`: {
        // TODO consider letting config specify vbank assets
        // empty balances for test.
        return '0';
      }

      case `${BridgeId.BANK}:VBANK_GRAB`:
      case `${BridgeId.BANK}:VBANK_GIVE`: {
        lastBankNonce += 1n;
        // Also empty balances.
        return harden({
          type: 'VBANK_BALANCE_UPDATE',
          nonce: `${lastBankNonce}`,
          updated: [],
        });
      }

      case `${BridgeId.CORE}:IBC_METHOD`:
      case `${BridgeId.DIBC}:IBC_METHOD`:
      case `${BridgeId.VTRANSFER}:IBC_METHOD`: {
        switch (obj.method) {
          case 'startChannelOpenInit': {
            const message = icaMocks.channelOpenAck(obj, bech32Prefix);
            if (
              ackBehaviors?.[bridgeId]?.startChannelOpenInit ===
              AckBehavior.Never
            ) {
              return undefined;
            }
            const handle = shouldAckImmediately(
              bridgeId,
              'startChannelOpenInit',
            )
              ? inbound
              : pushInbound;
            handle(BridgeId.DIBC, message);
            return undefined;
          }
          case 'sendPacket': {
            if (protoMsgMockMap[obj.packet.data]) {
              return ackLater(obj, protoMsgMockMap[obj.packet.data]);
            }
            // An error that would be triggered before reception on another chain
            return ackImmediately(obj, protoMsgMocks.error.ack);
          }
          default:
            return undefined;
        }
      }
      case `${BridgeId.VTRANSFER}:BRIDGE_TARGET_REGISTER`: {
        bridgeTargetRegistered.add(obj.target);
        return undefined;
      }
      case `${BridgeId.VTRANSFER}:BRIDGE_TARGET_UNREGISTER`: {
        bridgeTargetRegistered.delete(obj.target);
        return undefined;
      }
      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_ALLOCATE_ADDRESS`: {
        const address = makeTestAddress(lcaAccountsCreated);
        lcaAccountsCreated += 1;
        return address;
      }
      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_EXECUTE_TX`: {
        lcaSequenceNonce += 1;
        return obj.messages.map(message =>
          fakeLocalChainBridgeTxMsgHandler(message, lcaSequenceNonce),
        );
      }
      default: {
        throw Error(`FIXME missing support for ${bridgeId}: ${obj.type}`);
      }
    }
  };

  let slogSender;
  if (slogFile) {
    slogSender = await makeSlogSender({
      stateDir: '.',
      env: {
        ...process.env,
        SLOGFILE: slogFile,
        SLOGSENDER: '',
      },
    });
  }
  const mailboxStorage = new Map();
  const { controller, timer, bridgeInbound } = await buildSwingset(
    // @ts-expect-error missing method 'getNextKey'
    mailboxStorage,
    bridgeOutbound,
    kernelStorage,
    configPath,
    [],
    {},
    {
      callerWillEvaluateCoreProposals: false,
      debugName: 'TESTBOOT',
      verbose,
      slogSender,
      profileVats,
      debugVats,
    },
  );

  console.timeLog('makeBaseSwingsetTestKit', 'buildSwingset');

  // XXX This initial run() might not be necessary. Tests pass without it as of
  // 2025-02, but we suspect that `makeSwingsetTestKit` just isn't being
  // exercised in the right way.
  await controller.run();
  const runUtils = makeBootstrapRunUtils(controller, harness);

  const buildProposal = makeProposalExtractor({
    childProcess: childProcessAmbient,
    fs: fsAmbientPromises,
  });

  const evalProposal = async (
    proposalP: ERef<Awaited<ReturnType<typeof buildProposal>>>,
  ) => {
    const { EV } = runUtils;

    const proposal = harden(await proposalP);

    for await (const bundle of proposal.bundles) {
      await controller.validateAndInstallBundle(bundle);
    }
    log('installed', proposal.bundles.length, 'bundles');

    log('executing proposal');
    const bridgeMessage = {
      type: 'CORE_EVAL',
      evals: proposal.evals,
    };
    log({ bridgeMessage });
    const coreEvalBridgeHandler: BridgeHandler = await EV.vat(
      'bootstrap',
    ).consumeItem('coreEvalBridgeHandler');
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
    log(`proposal executed`);
  };

  console.timeEnd('makeBaseSwingsetTestKit');

  let currentTime = 0n;
  const updateTimer = async time => {
    await timer.poll(time);
  };
  const jumpTimeTo = (targetTime: Timestamp) => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    currentTime = targetTime;
    trace('jumpTimeTo', currentTime);
    return runUtils.queueAndRun(() => updateTimer(currentTime), true);
  };
  const advanceTimeTo = async (targetTime: Timestamp) => {
    targetTime = TimeMath.absValue(targetTime);
    targetTime >= currentTime ||
      Fail`cannot reverse time :-(  (${targetTime} < ${currentTime})`;
    while (currentTime < targetTime) {
      trace('stepping time from', currentTime, 'towards', targetTime);
      currentTime += 1n;
      await runUtils.queueAndRun(() => updateTimer(currentTime), true);
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

  const getCrankNumber = () => Number(kernelStorage.kvStore.get('crankNumber'));

  const bridgeUtils = {
    /** Immediately handle the inbound message */
    inbound: bridgeInbound,
    getOutboundMessages: (bridgeId: string) =>
      harden([...outboundMessages.get(bridgeId)]),
    getInboundQueueLength: () => inboundQueue.length,
    setAckBehavior(
      bridgeId: BridgeId,
      method: IBCDowncallMethod,
      behavior: AckBehaviorType,
    ): void {
      if (!ackBehaviors?.[bridgeId]?.[method])
        throw Fail`ack behavior not yet configurable for ${bridgeId} ${method}`;
      console.log('setting', bridgeId, method, 'ack behavior to', behavior);
      ackBehaviors[bridgeId][method] = behavior;
    },
    lookupAckBehavior(
      bridgeId: BridgeId,
      method: IBCDowncallMethod,
    ): AckBehaviorType {
      if (!ackBehaviors?.[bridgeId]?.[method])
        throw Fail`ack behavior not yet configurable for ${bridgeId} ${method}`;
      return ackBehaviors[bridgeId][method];
    },
    setBech32Prefix(prefix: string): void {
      bech32Prefix = prefix;
    },
    /**
     * @param {number} max the max number of messages to flush
     * @returns {Promise<number>} the number of messages flushed
     */
    async flushInboundQueue(max: number = Number.POSITIVE_INFINITY) {
      console.log('🚽');
      let i = 0;
      for (i = 0; i < max; i += 1) {
        const args = inboundQueue.shift();
        if (!args) break;

        await runUtils.queueAndRun(() => inbound(...args), true);
      }
      console.log('🧻');
      return i;
    },
    async runInbound(bridgeId: BridgeId, msg: unknown) {
      await runUtils.queueAndRun(() => inbound(bridgeId, msg), true);
    },
  };

  return {
    advanceTimeBy,
    advanceTimeTo,
    bridgeUtils,
    buildProposal,
    controller,
    evalProposal,
    getCrankNumber,
    jumpTimeTo,
    readLatest,
    readPublished,
    runUtils,
    shutdown,
    storage,
    swingStore,
    timer,
  };
};
export type SwingsetTestKit = Awaited<ReturnType<typeof makeSwingsetTestKit>>;

/**
 * Return a harness that can be dynamically configured to provide a computron-
 * counting run policy (and queried for the count of computrons recorded since
 * the last reset).
 */
/**
 * Creates a harness for measuring computron usage in SwingSet tests.
 *
 * The harness can be dynamically configured to provide a computron-counting
 * run policy and queried for the count of computrons recorded since the last reset.
 *
 * @returns A harness object with methods to control and query computron counting
 */
export const makeSwingsetHarness = () => {
  const c2b = defaultBeansPerXsnapComputron;
  const beansPerUnit = {
    // see https://cosgov.org/agoric?msgType=parameterChangeProposal&network=main
    blockComputeLimit: 65_000_000n * c2b,
    vatCreation: defaultBeansPerVatCreation,
    xsnapComputron: c2b,
  };

  /** @type {ReturnType<typeof computronCounter> | undefined} */
  let policy;
  let policyEnabled = false;

  const meter = harden({
    provideRunPolicy: () => {
      if (policyEnabled && !policy) {
        policy = computronCounter({ beansPerUnit });
      }
      return policy;
    },
    /** @param {boolean} forceEnabled */
    useRunPolicy: forceEnabled => {
      policyEnabled = forceEnabled;
      if (!policyEnabled) {
        policy = undefined;
      }
    },
    totalComputronCount: () => (policy?.totalBeans() || 0n) / c2b,
    resetRunPolicy: () => (policy = undefined),
  });
  return meter;
};

/**
 *
 * @param {string} mt
 * @returns {asserts mt is ManagerType}
 */
/**
 * Validates that a string is a valid SwingSet manager type.
 *
 * @param mt - The manager type string to validate
 * @throws If the string is not a valid manager type
 */
export function insistManagerType(mt) {
  assert(['local', 'node-subprocess', 'xsnap', 'xs-worker'].includes(mt));
}

// TODO explore doing this as part of a post-install script
// and having the test import it statically instead of fetching lazily
/**
 * Fetch a core-eval from a Github Release.
 *
 * NB: has ambient authority to fetch and cache to disk. Allowable as a testing utility.
 */
export const fetchCoreEvalRelease = async (
  config: { repo: string; release: string; name: string },
  artifacts = `https://github.com/${config.repo}/releases/download/${config.release}`,
  planUrl = `${artifacts}/${config.name}-plan.json`,
) => {
  const fetch = fetchCached;
  const plan = (await fetch(planUrl).then(r => r.json())) as {
    name: string;
    permit: string;
    script: string;
    bundles: Array<{
      bundleID: string;
      entrypoint: string;
      fileName: string;
    }>;
  };
  assert.equal(plan.name, config.name);
  const script = await fetch(`${artifacts}/${plan.script}`).then(r => r.text());
  const permit = await fetch(`${artifacts}/${plan.permit}`).then(r => r.text());
  const bundles: EndoZipBase64Bundle[] = await Promise.all(
    plan.bundles.map(b =>
      fetch(`${artifacts}/${b.bundleID}.json`).then(r => r.json()),
    ),
  );
  return { bundles, evals: [{ js_code: script, json_permits: permit }] };
};
