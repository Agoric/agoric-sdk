/* eslint-disable jsdoc/require-param, @jessie.js/safe-await-separator */
/* global process */

import childProcessAmbient from 'child_process';
import { promises as fsAmbientPromises } from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { basename, join } from 'path';
import { inspect } from 'util';

import { Fail } from '@endo/errors';
import { buildSwingset } from '@agoric/cosmic-swingset/src/launch-chain.js';
import {
  BridgeId,
  NonNullish,
  VBankAccount,
  makeTracer,
} from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { krefOf } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import { makeSlogSender } from '@agoric/telemetry';
import { TimeMath, Timestamp } from '@agoric/time';

import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';

import type { ExecutionContext as AvaT } from 'ava';

import type { CoreEvalSDKType } from '@agoric/cosmic-proto/swingset/swingset.js';
import type { BridgeHandler, IBCMethod } from '@agoric/vats';
import { icaMocks, protoMsgMocks } from './ibc/mocks.js';

const trace = makeTracer('BSTSupport', false);

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
  t: AvaT,
  a: PropertyKey[],
  b: PropertyKey[],
  message?: string,
) => {
  const aobj = keysToObject(a, () => 1);
  const bobj = keysToObject(b, () => 1);
  return t.deepEqual(aobj, bobj, message);
};

export const getNodeTestVaultsConfig = async (
  bundleDir = 'bundles',
  specifier = '@agoric/vm-config/decentral-itest-vaults-config.json',
  defaultManagerType = 'local' as ManagerType,
) => {
  const fullPath = await importMetaResolve(specifier, import.meta.url).then(
    u => new URL(u).pathname,
  );
  const config: SwingSetConfig & { coreProposals?: any[] } = NonNullish(
    await loadSwingsetConfigFile(fullPath),
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
    new URL(`../../${pkg}/${fileName}`, import.meta.url).pathname;

  const importSpec = spec =>
    importMetaResolve(spec, import.meta.url).then(u => new URL(u).pathname);

  const runPackageScript = (
    outputDir: string,
    scriptPath: string,
    env: NodeJS.ProcessEnv,
  ) => {
    console.info('running package script:', scriptPath);
    const out = childProcess.execFileSync('yarn', ['bin', 'agoric'], {
      cwd: outputDir,
      env,
    });
    return childProcess.execFileSync(
      out.toString().trim(),
      ['run', scriptPath],
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

  const buildAndExtract = async (builderPath: string) => {
    const tmpDir = await fsAmbientPromises.mkdtemp(
      join(getPkgPath('builders'), 'proposal-'),
    );

    const built = parseProposalParts(
      runPackageScript(
        tmpDir,
        await importSpec(builderPath),
        process.env,
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

export const matchRef = (
  t: AvaT,
  ref1: unknown,
  ref2: unknown,
  message?: string,
) => t.is(krefOf(ref1), krefOf(ref2), message);

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

export const matchValue = (t: AvaT, value, ref) => {
  matchRef(t, value.brand, ref.brand);
  t.is(value.denom, ref.denom);
  matchRef(t, value.issuer, ref.issuer);
  t.is(value.issuerName, ref.issuerName);
  t.is(value.proposedName, ref.proposedName);
};

export const matchIter = (t: AvaT, iter, valueRef) => {
  t.is(iter.done, false);
  matchValue(t, iter.value, valueRef);
};

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
 * @param [options.storage]
 * @param [options.verbose]
 * @param [options.slogFile]
 * @param [options.profileVats]
 * @param [options.debugVats]
 * @param [options.defaultManagerType]
 */
export const makeSwingsetTestKit = async (
  log: (..._: any[]) => void,
  bundleDir = 'bundles',
  {
    configSpecifier = undefined as string | undefined,
    storage = makeFakeStorageKit('bootstrapTests'),
    verbose = false,
    slogFile = undefined as string | undefined,
    profileVats = [] as string[],
    debugVats = [] as string[],
    defaultManagerType = 'local' as ManagerType,
  } = {},
) => {
  console.time('makeBaseSwingsetTestKit');
  const configPath = await getNodeTestVaultsConfig(
    bundleDir,
    configSpecifier,
    defaultManagerType,
  );
  const swingStore = initSwingStore();
  const { kernelStorage, hostStorage } = swingStore;
  const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

  const readLatest = (path: string): any => {
    const data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    trace('readLatest', path, 'returning', inspect(data, false, 20, true));
    return data;
  };

  let lastNonce = 0n;

  const outboundMessages = new Map();

  let inbound;
  let ibcSequenceNonce = 0;

  const makeAckEvent = (obj: IBCMethod<'sendPacket'>, ack: string) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacket(obj, ibcSequenceNonce, ack);
    inbound(BridgeId.DIBC, msg);
    return msg.packet;
  };
  /**
   * Mock the bridge outbound handler. The real one is implemented in Golang so
   * changes there will sometimes require changes here.
   */
  const bridgeOutbound = (bridgeId: string, obj: any) => {
    // store all messages for querying by tests
    if (!outboundMessages.has(bridgeId)) {
      outboundMessages.set(bridgeId, []);
    }
    outboundMessages.get(bridgeId).push(obj);

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
        switch (obj.type) {
          case 'IBC_METHOD':
            switch (obj.method) {
              case 'startChannelOpenInit':
                inbound(BridgeId.DIBC, icaMocks.channelOpenAck(obj));
                return undefined;
              case 'sendPacket':
                switch (obj.packet.data) {
                  case protoMsgMocks.delegate.msg: {
                    return makeAckEvent(obj, protoMsgMocks.delegate.ack);
                  }
                  case protoMsgMocks.delegateWithOpts.msg: {
                    return makeAckEvent(
                      obj,
                      protoMsgMocks.delegateWithOpts.ack,
                    );
                  }
                  case protoMsgMocks.queryBalance.msg: {
                    return makeAckEvent(obj, protoMsgMocks.queryBalance.ack);
                  }
                  case protoMsgMocks.queryUnknownPath.msg: {
                    return makeAckEvent(
                      obj,
                      protoMsgMocks.queryUnknownPath.ack,
                    );
                  }
                  case protoMsgMocks.queryBalanceMulti.msg: {
                    return makeAckEvent(
                      obj,
                      protoMsgMocks.queryBalanceMulti.ack,
                    );
                  }
                  case protoMsgMocks.queryBalanceUnknownDenom.msg: {
                    return makeAckEvent(
                      obj,
                      protoMsgMocks.queryBalanceUnknownDenom.ack,
                    );
                  }
                  default: {
                    return makeAckEvent(obj, protoMsgMocks.error.ack);
                  }
                }
              default:
                return undefined;
            }
          default:
            return undefined;
        }
      case BridgeId.PROVISION:
      case BridgeId.PROVISION_SMART_WALLET:
      case BridgeId.VTRANSFER:
      case BridgeId.WALLET:
        console.warn('Bridge returning undefined for', bridgeId, ':', obj);
        return undefined;
      case BridgeId.STORAGE:
        return storage.toStorage(obj);
      case BridgeId.VLOCALCHAIN:
        switch (obj.type) {
          case 'VLOCALCHAIN_ALLOCATE_ADDRESS':
            return 'agoric1mockVlocalchainAddress';
          case 'VLOCALCHAIN_EXECUTE_TX': {
            return obj.messages.map(message => {
              switch (message['@type']) {
                case '/cosmos.staking.v1beta1.MsgDelegate': {
                  if (message.amount.amount === '504') {
                    // FIXME - how can we propagate the error?
                    // this results in `syscall.callNow failed: device.invoke failed, see logs for details`
                    throw Error('simulated packet timeout');
                  }
                  return /** @type {JsonSafe<MsgDelegateResponse>} */ {};
                }
                // returns one empty object per message unless specified
                default:
                  return {};
              }
            });
          }
          default:
            throw Error(`VLOCALCHAIN message of unknown type ${obj.type}`);
        }
      default:
        throw Error(`unknown bridgeId ${bridgeId}`);
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
  const { controller, timer, bridgeInbound } = await buildSwingset(
    new Map(),
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
  inbound = bridgeInbound;

  console.timeLog('makeBaseSwingsetTestKit', 'buildSwingset');

  const runUtils = makeRunUtils(controller);

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

  const getOutboundMessages = (bridgeId: string) =>
    harden([...outboundMessages.get(bridgeId)]);

  return {
    advanceTimeBy,
    advanceTimeTo,
    buildProposal,
    bridgeInbound,
    controller,
    evalProposal,
    getCrankNumber,
    getOutboundMessages,
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
