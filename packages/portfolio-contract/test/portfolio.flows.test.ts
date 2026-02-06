/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 *
 * To facilitate review of snapshot diffs, add new tests *at the end*.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { AmountMath, makeIssuerKit, type NatAmount } from '@agoric/ertp';
import { makeTracer, mustMatch, type TraceLogger } from '@agoric/internal';
import { type StorageMessage } from '@agoric/internal/src/lib-chainStorage.js';
import {
  defaultSerializer,
  documentStorageSchema,
  makeAsyncQueue,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  denomHash,
  type AccountId,
  type Bech32Address,
  type TrafficEntry,
  type Orchestrator,
  type CaipChainId,
  type IBCMsgTransferOptions,
  type LegacyExecuteEncodedTxOptions,
} from '@agoric/orchestration';
import { prepareProgressTracker } from '@agoric/orchestration/src/utils/progress.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import {
  parseAccountId,
  chainOfAccount,
} from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { type AxelarChain, type FundsFlowPlan } from '@agoric/portfolio-api';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import {
  DEFAULT_FLOW_CONFIG,
  RebalanceStrategy,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { Address } from 'abitype';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  executePlan as rawExecutePlan,
  makeErrorList,
  onAgoricTransfer,
  openPortfolio as rawOpenPortfolio,
  provideCosmosAccount,
  rebalance as rawRebalance,
  wayFromSrcToDest,
  type OnTransferContext,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import {
  provideEVMAccount,
  provideEVMAccountWithPermit,
} from '../src/pos-gmp.flows.ts';
import {
  makeSwapLockMessages,
  makeUnlockSwapMessages,
} from '../src/pos-usdn.flows.ts';
import { TxStatus } from '../src/resolver/constants.js';
import { prepareResolverKit } from '../src/resolver/resolver.exo.js';
import {
  PENDING_TXS_NODE_KEY,
  type PublishedTx,
  type TxId,
} from '../src/resolver/types.ts';
import {
  makeOfferArgsShapes,
  type MovementDesc,
  type OfferArgsFor,
} from '../src/type-guards-steps.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { makePortfolioSteps } from '../tools/plan-transfers.ts';
import {
  decodeCreateAndDepositPayload,
  decodeFunctionCall,
} from './abi-utils.ts';
import {
  axelarIdsMock,
  contractsMock,
  gmpAddresses,
  planUSDNDeposit,
} from './mocks.ts';
import {
  axelarCCTPConfig,
  makeIncomingVTransferEvent,
  makeStorageTools,
} from './supports.ts';

const executePlan: typeof rawExecutePlan = (
  orch,
  ctx,
  seat,
  offerArgs,
  pKit,
  flowDetail,
  startedFlow,
  config = DEFAULT_FLOW_CONFIG,
  options,
) =>
  rawExecutePlan(
    orch,
    ctx,
    seat,
    offerArgs,
    pKit,
    flowDetail,
    startedFlow,
    config,
    options,
  );

const openPortfolio: typeof rawOpenPortfolio = (
  orch,
  ctx,
  seat,
  offerArgs,
  madeKit,
  config = DEFAULT_FLOW_CONFIG,
  ...args
) => rawOpenPortfolio(orch, ctx, seat, offerArgs, madeKit, config, ...args);

const rebalance: typeof rawRebalance = (
  orch,
  ctx,
  seat,
  offerArgs,
  kit,
  startedFlow,
  config = DEFAULT_FLOW_CONFIG,
) => rawRebalance(orch, ctx, seat, offerArgs, kit, startedFlow, config);

const theExit = harden(() => {}); // for ava comparison
// @ts-expect-error mock
const mockZCF: ZCF = Far('MockZCF', {
  makeEmptySeatKit: () => {
    let exited = false;
    const exit = () => {
      exited = true;
      theExit();
    };
    const fail = () => {
      exited = true;
    };
    return {
      zcfSeat: Far('MockZCFSeat', { exit, fail, hasExited: () => exited }),
    } as unknown as ZCF;
  },
});

const { brand: USDC } = makeIssuerKit('USDC');
const { brand: BLD } = makeIssuerKit('BLD');
const { make } = AmountMath;

// XXX move to mocks.ts?
const makeVowToolsAreJustPromises = () => {
  const vowTools = harden({
    makeVowKit: () => {
      const { resolve, reject, promise } = makePromiseKit();
      const resolver = Far('FakeVowResolver', { resolve, reject });
      return harden({
        resolver,
        vow: promise,
      });
    },
    when: async (specimen, onFulfilled, onRejected) =>
      Promise.resolve(specimen).then(onFulfilled, onRejected),
    watch: (specimen, watcher, ...watcherArgs) => {
      let onFulfilled;
      if (watcher?.onFulfilled) {
        onFulfilled = value => watcher.onFulfilled(value, ...watcherArgs);
      }
      let onRejected;
      if (watcher?.onRejected) {
        onRejected = err => watcher.onRejected(err, ...watcherArgs);
      }
      return vowTools.when(specimen, onFulfilled, onRejected);
    },
    asVow: async thunk => thunk(),
  }) as any; // mock
  return vowTools as VowTools;
};

const makeMockSeat = <M extends keyof ProposalType>(
  give: ProposalType[M]['give'] = {},
  want: ProposalType[M]['want'] = {},
  buf: any[] = [],
) => {
  const proposal = harden({ give, want });
  let hasExited = false;
  return {
    getProposal: () => proposal,
    hasExited: () => hasExited,
    exit(completion) {
      if (hasExited) throw Error('already exited');
      hasExited = true;
      buf.push({ _cap: 'seat', _method: 'exit', completion });
    },
    fail(reason) {
      if (hasExited) throw Error('already exited');
      hasExited = true;
      buf.push({ _cap: 'seat', _method: 'fail', reason });
    },
  } as any as ZCFSeat;
};

interface MockLogEvent {
  _method: string;
  _cap?: string;
  opts?: Record<string, any>;
  [key: string]: unknown;
}

// XXX move to mocks.ts for readability?
const mocks = (
  errs: Record<string, Error | Map<string, Error>> = {},
  give: ProposalType['openPortfolio']['give'] = {},
) => {
  const throwIfErr = (key: string, name: string = '') => {
    let err = errs[key];
    if (err === undefined) {
      return;
    }

    if (err instanceof Map) {
      const suberr = err.get(name);
      if (suberr === undefined) {
        return;
      }
      err.delete(name);
      err = suberr;
    } else {
      delete errs[key];
    }

    if (err instanceof Error) {
      assert.note(
        err,
        assert.details`injected ${assert.quote(key)} error at ${Error('stack trace')}`,
      );
    } else {
      err = assert.error(assert.details`injected ${key} error`, undefined, {
        cause: err,
      });
    }
    throw err;
  };

  const buf = [] as MockLogEvent[];
  const log = (ev: MockLogEvent) => {
    buf.push(ev);
  };
  const kinks: Array<(ev: MockLogEvent) => Promise<void>> = [];
  const record = async (ev: MockLogEvent) => {
    for (const kink of kinks) {
      await kink(ev);
    }
    log(ev);
  };
  let nonce = 0;
  const tapPK = makePromiseKit<TargetApp>();
  const factoryPK = makePromiseKit();

  const cosmosChainIdToName = {
    [fetchedChainInfo.noble.chainId]: 'noble',
    [fetchedChainInfo.axelar.chainId]: 'axelar',
  } as const;

  const agoricConns = fetchedChainInfo.agoric.connections;
  const transferChannels = {
    noble: agoricConns[fetchedChainInfo.noble.chainId].transferChannel,
    axelar: agoricConns[fetchedChainInfo.axelar.chainId].transferChannel,
  } as const;
  const eip155ChainIdToAxelarChain = Object.fromEntries(
    Object.entries(axelarCCTPConfig).map(([name, info]) => [
      `${Number(info.reference)}`,
      name,
    ]),
  ) as Record<`${number}`, AxelarChain>;

  const chains = new Map();
  const orch = harden({
    async getChain(name: string) {
      if (chains.has(name)) return chains.get(name);
      const chainId =
        fetchedChainInfo[name]?.chainId ?? `${name}-${name.length}`;
      const stakingTokens = {
        noble: undefined,
        axelar: [{ denom: 'uaxl' }],
      }[name];
      const it = harden({
        getChainInfo() {
          if (name in axelarCCTPConfig) {
            return axelarCCTPConfig[name];
          }
          return harden({ chainId, stakingTokens });
        },
        async makeAccount() {
          throwIfErr('makeAccount', name);

          const addr = harden({
            chainId,
            value: `${name}1${1000 + 7 * (nonce += 2)}`,
          });
          const account = {
            makeProgressTracker() {
              // XXX this call should be logged
              return makeProgressTracker();
            },
            getAddress() {
              return addr;
            },
            async send(toAccount, amount) {
              const { send: sendErr } = errs;
              if (sendErr && amount?.value === 13n) throw sendErr;
              await record({
                _cap: addr.value,
                _method: 'send',
                toAccount,
                amount,
              });
            },
            async transfer(address, amount, opts?: IBCMsgTransferOptions) {
              if (!('denom' in amount)) throw Error('#10449');
              await record({
                _cap: addr.value,
                _method: 'transfer',
                address,
                amount,
                opts,
              });
              const { transfer: err } = errs;
              if (
                err &&
                !(err instanceof Map) &&
                !err.message.includes(cosmosChainIdToName[address.chainId])
              )
                throwIfErr('transfer');
              const { progressTracker, memo, txOpts, sendOpts } = opts ?? {};
              if (memo && address.value.startsWith('axelar1')) {
                factoryPK.resolve(memo);
              }
              const dstChainId = chainOfAccount(address);

              const traffic = [] as TrafficEntry[];
              let lastResult = Promise.resolve({});
              if (name !== 'agoric') {
                const result = await account.executeEncodedTx(
                  [
                    {
                      typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
                      value: { sequence: 223n },
                    },
                  ],
                  { ...txOpts, progressTracker, sendOpts },
                );
                lastResult = lastResult.then(() => result);
              }

              if (progressTracker) {
                const getTransferChannel = (caipChainId: string) => {
                  const cosmosChainId = caipChainId.replace(/^cosmos:/, '');
                  const channel =
                    transferChannels[cosmosChainIdToName[cosmosChainId]];
                  return channel;
                };

                const srcChainId: CaipChainId = `cosmos:${chainId}`;
                const transferTrafficBase = {
                  op: 'transfer',
                  src: ['ibc', ['chain', srcChainId]],
                  dst: ['ibc', ['chain', dstChainId]],
                  seq: 339n,
                } as const satisfies TrafficEntry;

                const channel = getTransferChannel(dstChainId);
                if (channel) {
                  const transferTraffic: TrafficEntry = {
                    ...transferTrafficBase,
                    src: [
                      ...transferTrafficBase.src,
                      ['port', channel.portId],
                      ['channel', channel.channelId],
                    ],
                    dst: [
                      ...transferTrafficBase.dst,
                      ['port', channel.counterPartyPortId],
                      ['channel', channel.counterPartyChannelId],
                    ],
                  };
                  traffic.push(transferTraffic);
                } else {
                  const revChannel = getTransferChannel(srcChainId);
                  assert(
                    revChannel,
                    `no transfer channel for ${dstChainId} nor ${srcChainId}`,
                  );
                  const transferTraffic: TrafficEntry = {
                    ...transferTrafficBase,
                    src: [
                      ...transferTrafficBase.src,
                      ['port', revChannel.counterPartyPortId],
                      ['channel', revChannel.counterPartyChannelId],
                    ],
                    dst: [
                      ...transferTrafficBase.dst,
                      ['port', revChannel.portId],
                      ['channel', revChannel.channelId],
                    ],
                  };
                  traffic.push(transferTraffic);
                }
                const priorReport = progressTracker.getCurrentProgressReport();
                const newReport = {
                  ...priorReport,
                  traffic: [...(priorReport.traffic ?? []), ...traffic],
                };
                progressTracker.update(harden(newReport));
              }

              return lastResult;
            },
            async executeEncodedTx(msgs, opts?: LegacyExecuteEncodedTxOptions) {
              await record({
                _cap: addr.value,
                _method: 'executeEncodedTx',
                msgs,
              });
              throwIfErr('executeEncodedTx');
              const { progressTracker } = opts ?? {};
              if (progressTracker) {
                const agoricChain = await orch.getChain('agoric');
                const agoricInfo = await agoricChain.getChainInfo();
                const newTraffic = [
                  {
                    op: 'ICA',
                    src: [
                      'ibc',
                      ['chain', `cosmos:${agoricInfo.chainId}`],
                      ['port', 'icacontroller-2'],
                      ['channel', 'channel-7'],
                    ],
                    dst: [
                      'ibc',
                      ['chain', `cosmos:${chainId}`],
                      ['port', 'icahost-9'],
                      ['channel', 'channel-1'],
                    ],
                    // XXX emulate an unknown sequence number, at least until the
                    // Network API connection.sendWithMeta provides it.
                    seq: { status: 'unknown' },
                  },
                ] as TrafficEntry[];
                const priorReport = progressTracker.getCurrentProgressReport();
                const report = {
                  ...priorReport,
                  traffic: [...(priorReport.traffic ?? []), ...newTraffic],
                };
                progressTracker.update(report);
              }

              const result = msgs.map(({ typeUrl, response = {} }) => {
                if (typeUrl.startsWith('/')) {
                  return response;
                }
                return {};
              });
              return result;
            },
          };
          if (name === 'agoric') {
            const { executeEncodedTx: _, ...localAccount } = account;
            return Far('AgoricAccount', {
              ...localAccount,
              monitorTransfers: async tap => {
                log({ _cap: addr.value, _method: 'monitorTransfers', tap });
                tapPK.resolve(tap);
                const reg = harden({});
                return reg;
              },
              parseInboundTransfer: async (
                packet: VTransferIBCEvent['packet'],
              ) => {
                const ftPacketData = JSON.parse(atob(packet.data));
                const {
                  denom: transferDenom,
                  sender,
                  receiver,
                  amount,
                } = ftPacketData as FungibleTokenPacketData;

                let denomOrTrace;

                const prefix = `${packet.source_port}/${packet.source_channel}/`;
                if (transferDenom.startsWith(prefix)) {
                  denomOrTrace = transferDenom.slice(prefix.length);
                } else {
                  denomOrTrace = `${packet.destination_port}/${packet.destination_channel}/${transferDenom}`;
                }

                const localDenom = denomOrTrace.match(/^([^/]+)(\/[^/]+)?$/)
                  ? denomOrTrace
                  : `ibc/${denomHash(denomOrTrace.match(/^(?<path>[^/]+\/[^/]+)\/(?<denom>.*)$/)?.groups)}`;

                return harden({
                  amount: {
                    value: BigInt(amount),
                    denom: localDenom,
                  },
                  extra: {
                    ...ftPacketData,
                  },
                  fromAccount: sender,
                  toAccount: receiver,
                });
              },
            });
          }
          if (name === 'noble') {
            return Far('NobleAccount', {
              ...account,
              depositForBurn: async (destinationAddress, denomAmount) => {
                if (!('denom' in denomAmount)) throw Error('#10449');
                log({
                  _cap: addr.value,
                  _method: 'depositForBurn',
                  destinationAddress,
                  denomAmount,
                });
              },
            });
          }
          return Far('Account', account);
        },
      });
      chains.set(name, it);
      return it;
    },
  }) as unknown as Orchestrator;

  const zone = makeHeapZone();

  const zoeTools = harden({
    async localTransfer(sourceSeat, localAccount, amounts) {
      log({ _method: 'localTransfer', sourceSeat, localAccount, amounts });
      throwIfErr('localTransfer');
    },
    async withdrawToSeat(localAccount, destSeat, amounts) {
      log({ _method: 'withdrawToSeat', localAccount, destSeat, amounts });
    },
  }) as GuestInterface<ZoeTools>;

  const vowTools: VowTools = makeVowToolsAreJustPromises();
  const makeProgressTracker = prepareProgressTracker(zone, { vowTools });

  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();

  const {
    enqueue: eachMessage,
    iterable: storageUpdates,
    cancel: cancelStorageUpdates,
  } = makeAsyncQueue<StorageMessage>();
  const storage = makeFakeStorageKit(
    'published',
    { sequence: true },
    { eachMessage },
  );
  const ymaxNode = storage.rootNode.makeChildNode('ymax0');
  const pendingTxsNode = ymaxNode.makeChildNode(PENDING_TXS_NODE_KEY);
  const portfoliosNode = ymaxNode.makeChildNode('portfolios');

  const denom = `ibc/${denomHash({ channelId: 'channel-123', denom: 'uusdc' })}`;

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];

  const resolverZone = zone.subZone('Resolver');
  const { client: resolverClient, service: resolverService } =
    prepareResolverKit(resolverZone, mockZCF, {
      vowTools,
      pendingTxsNode,
      marshaller,
    })();

  const txfrCtx: OnTransferContext = {
    resolverService,
    transferChannels,
  };

  const onAgoricTransferHost = (event, kit) =>
    onAgoricTransfer(orch, txfrCtx, event, kit);

  const ctx1: PortfolioInstanceContext = {
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    walletBytecode: '0x1234',
    gmpAddresses,
    usdc: { brand: USDC, denom },
    gmpFeeInfo: { brand: BLD, denom: 'uaxl' },
    inertSubscriber,
    zoeTools,
    resolverClient,
    contractAccount: orch.getChain('agoric').then(ch => ch.makeAccount()),
    transferChannels,
    eip155ChainIdToAxelarChain,
  };

  const rebalanceHost = (seat, offerArgs, kit) =>
    rebalance(orch, ctx1, seat, offerArgs, kit);

  const executePlanHost = (
    seat,
    offerArgs,
    kit,
    flowDetail,
    startedFlow,
    config,
    options,
  ) =>
    executePlan(
      orch,
      ctx1,
      seat,
      offerArgs,
      kit,
      flowDetail,
      startedFlow,
      config,
      options,
    );

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: mockZCF,
    axelarIds: axelarIdsMock,
    gmpAddresses,
    vowTools,
    transferChannels,
    rebalance: rebalanceHost as any,
    executePlan: executePlanHost as any,
    onAgoricTransfer: onAgoricTransferHost as any,
    proposalShapes: makeProposalShapes(USDC, BLD),
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode,
    usdcBrand: USDC,
    eip155ChainIdToAxelarChain,
    contracts: contractsMock,
    walletBytecode: ctx1.walletBytecode,
    ...(null as any),
  });
  const makePortfolioKitGuest = (opts?: { sourceAccountId?: AccountId }) =>
    makePortfolioKit({
      portfolioId: 1,
      sourceAccountId: opts?.sourceAccountId,
    }) as unknown as GuestInterface<PortfolioKit>;

  const seat = makeMockSeat(give, undefined, buf);

  /**
   * Read pure data (CapData that has no slots) from the storage path
   */
  const getDeserialized = (path: string): unknown[] => {
    return storage.getValues(path).map(defaultSerializer.parse);
  };

  const txResolver = harden({
    findPending: async () => {
      await eventLoopIteration();
      const paths = [...storage.data.keys()].filter(k =>
        k.includes('.pendingTxs.'),
      );
      const txIds: TxId[] = [];
      const txIdToNext: Map<TxId, TxId | undefined> = new Map();
      const settledTxs: Set<TxId> = new Set();
      for (const p of paths) {
        const info = getDeserialized(p).at(-1) as PublishedTx;
        const txId = p.split('.').at(-1) as TxId;

        if (info.status === 'success' || info.status === 'failed') {
          settledTxs.add(txId);
        }
        if (info.status !== 'pending') continue;

        // IBC_FROM_REMOTE is not yet implemented in resolver.
        if (info.type === 'IBC_FROM_REMOTE') continue;

        if (info.type === 'CCTP_TO_AGORIC') {
          console.debug('CCTP_TO_AGORIC', txId, info);
          const { amount, destinationAddress: cctpDest } = info;
          assert(cctpDest, 'missing destinationAddress in CCTP_TO_AGORIC tx');
          const { accountAddress: target } = parseAccountId(cctpDest);
          const tap = await tapPK.promise;
          const fwdEvent = makeIncomingVTransferEvent({
            sender: 'noble1fwd',
            sourceChannel: 'channel-99999',
            destinationChannel: transferChannels.noble.channelId,
            target,
            receiver: target as Bech32Address,
            amount,
            memo: '{"noteWell":"abc"}',
          });
          await tap.receiveUpcall(fwdEvent);
          continue;
        }

        if (info.type === 'IBC_FROM_AGORIC' && info.nextTxId) {
          // Chain-level support; consider it settled only when its dependents are.
          txIdToNext.set(txId, info.nextTxId);
          continue;
        }
        txIds.push(txId);
      }

      // See which of the dependencies are now eligible for settlement.
      for (const [txId, nextId] of txIdToNext.entries()) {
        // Check if the dependendency is settled.
        if (!nextId || settledTxs.has(nextId)) {
          txIds.push(txId);
        }
      }
      return harden(txIds);
    },
    drainPending: async (status: Exclude<TxStatus, 'pending'> = 'success') => {
      for (;;) {
        const txIds = await txResolver.findPending();
        if (!txIds.length) break;
        for (const txId of txIds) {
          resolverService.settleTransaction({ txId, status });
        }
      }
    },
    settleUntil: async (
      done: Promise<unknown>,
      status: Exclude<TxStatus, 'pending'> = 'success',
      rejectionReason?: string,
    ) => {
      void done.then(() => cancelStorageUpdates());
      for await (const message of storageUpdates) {
        if (!message) continue;
        const { method, args } = message;
        if (method !== 'append') continue;
        const [[key, _val]] = args;
        if (!key.includes('.pendingTxs.')) continue;
        const info = getDeserialized(key).at(-1) as PublishedTx;
        if (info.status !== 'pending') continue;
        const txId = key.split('.').at(-1) as TxId;
        resolverService.settleTransaction({ txId, status, rejectionReason });
      }
    },
  });

  const cosmosId = async (name: string) => {
    const chain = await orch.getChain(name);
    const info = await chain.getChainInfo();
    return info.chainId;
  };

  return {
    orch,
    tapPK,
    ctx: { ...ctx1, makePortfolioKit: makePortfolioKitGuest },
    offer: { log: buf, seat, factoryPK, kinks },
    storage: {
      ...storage,
      getDeserialized,
      updates: storageUpdates,
    },
    vowTools,
    txResolver,
    resolverClient,
    resolverService,
    cosmosId,
  };
};

/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

const docOpts = {
  node: 'ymax0',
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

test('open portfolio with no positions', async t => {
  const { orch, ctx, offer, storage, cosmosId } = mocks();
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, {});
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    {
      _method: 'transfer',
      address: { chainId: await cosmosId('noble') },
    },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// XXX unlock too. use snapshot
test('Noble Dollar Swap, Lock messages', async t => {
  const { cosmosId } = mocks();
  const nobleId = await cosmosId('noble');

  const signer =
    'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd' as const;
  {
    const actual = makeSwapLockMessages(
      { value: signer, chainId: nobleId, encoding: 'bech32' },
      1200000n,
      { usdnOut: 1188000n, vault: 1 },
    );
    t.snapshot(actual, 'swap 1.2USDC for 1.188USDN');
  }

  {
    const actual = makeSwapLockMessages(
      { value: 'noble1test', chainId: nobleId, encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1 },
    );
    t.snapshot(actual, 'swap 5K USDC at parity');
  }

  {
    const actual = makeUnlockSwapMessages(
      { value: 'noble1test', chainId: nobleId, encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1, usdnOut: 4_900n * 1_000_000n },
    );
    t.snapshot(actual, 'un-swap 5K USDN < parity');
  }
});

test('makePortfolioSteps for USDN position', async t => {
  const actual = await makePortfolioSteps({
    USDN: make(USDC, 50n * 1_000_000n),
  });

  const amount = make(USDC, 50n * 1_000_000n);
  const detail = { usdnOut: 49499999n };
  t.deepEqual(actual, {
    give: { Deposit: { brand: USDC, value: 50_000_000n } },
    steps: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
});

test('open portfolio with USDN position', async t => {
  const { give, steps } = await makePortfolioSteps({
    USDN: make(USDC, 50_000_000n),
  });
  const { orch, ctx, offer, storage, cosmosId, txResolver } = mocks({}, give);
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, { flow: steps });
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: await cosmosId('noble') } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: await cosmosId('noble') } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  // Needed due to an incomplete mock of IBC ack processing.
  await txResolver.drainPending();
  await documentStorageSchema(t, storage, docOpts);

  const { getPortfolioStatus } = makeStorageTools(storage);
  const { flowsRunning = {} } = await getPortfolioStatus(1);
  t.deepEqual(flowsRunning, {}, 'all flows are done by now');
});

const openAndTransfer = test.macro(
  async (
    t,
    goal: Partial<Record<YieldProtocol, NatAmount>>,
    makeEvents: () => VTransferIBCEvent[],
  ) => {
    const { give, steps } = await makePortfolioSteps(goal, { feeBrand: BLD });
    const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({}, give);
    const { log, seat } = offer;

    const [actual] = await Promise.all([
      openPortfolio(orch, ctx, seat, { flow: steps }),
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
        async ([tap, _]) => {
          for (const event of makeEvents()) {
            t.log(`tap.receiveUpcall(${event})`);
            await tap.receiveUpcall(event);
          }
          await txResolver.drainPending();
        },
      ),
    ]);
    t.log(log.map(msg => msg._method).join(', '));

    t.snapshot(log, 'call log'); // see snapshot for call log
    t.is(passStyleOf(actual.invitationMakers), 'remotable');
    await documentStorageSchema(t, storage, docOpts);
  },
);

test(
  'open portfolio with Aave and USDN positions then inbound GMP',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [],
);

test('open portfolio with Aave position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      // Complete transactions.
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },

    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 2_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('reject missing fee before committing anything', t => {
  const amount = AmountMath.make(USDC, 300n);
  t.throws(() =>
    wayFromSrcToDest({ src: '@Arbitrum', dest: 'Compound_Arbitrum', amount }),
  );
});

test('open portfolio with Compound position', async t => {
  const { give, steps } = await makePortfolioSteps(
    { Compound: make(USDC, 2_000_000n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    give,
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      flow: steps,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'localTransfer', amounts: { Deposit: { value: 2_000_000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in localTransfer from seat to local account', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { localTransfer: Error('localTransfer from seat failed') },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');

  const nobleId = await cosmosId('noble');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  t.log('we still get the invitationMakers and ICA address');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// IBC failure causes NFA set-up to fail
test.skip('handle failure in IBC transfer', async t => {
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { transfer: Error('IBC is on the fritz!!') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } }, // failed
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in executeEncodedTx', async t => {
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { executeEncodedTx: Error('exec swaplock went kerflewey') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const agoricId = await cosmosId('agoric');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: agoricId } }, // unwind
    { _method: 'executeEncodedTx' }, // unwind
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in recovery from executeEncodedTx', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    {
      executeEncodedTx: Error('cannot swap. your money is no good here'),
      transfer: Error('road from noble washed out'),
    },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const detail = { usdnOut: 100n };
  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const agoricId = await cosmosId('agoric');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: agoricId } }, // fail to recover
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in sendGmp with Aave position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const feeAcct = AmountMath.make(BLD, 300n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, ctx, offer, storage, cosmosId } = mocks(
    { transfer: Error('ag->axelar: SOS!') },
    { Deposit: amount },
  );

  // Start the openPortfolio flow
  const portfolioPromise = openPortfolio(orch, { ...ctx }, offer.seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
    ],
  });

  const actual = await portfolioPromise;
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Account: { value: 300n } } },
    { _method: 'transfer', address: { chainId: axelarId } }, // fails
    { _method: 'withdrawToSeat' }, // sendGmp recovery
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test(
  'open portfolio with Compound and USDN positions then rebalance',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [
    makeIncomingVTransferEvent({
      hookQuery: { rebalance: RebalanceStrategy.Preset },
      amount: 1_000_000_000n,
      denom: `transfer/channel-1/uusdc`,
    }),
  ],
);

test.skip('rebalance handles stepFlow failure correctly', async t => {
  const { orch, ctx, offer } = mocks(
    {
      // Mock a failure in IBC transfer
      transfer: Error('IBC transfer failed'),
    },
    { Deposit: make(USDC, 500n) },
  );

  const { log, seat } = offer;

  const badOfferArgs: OfferArgsFor['rebalance'] = {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount: make(USDC, 500n) },
      { src: '@agoric', dest: '@noble', amount: make(USDC, 500n) },
      // This will trigger the mocked transfer error
      { src: '@noble', dest: 'USDN', amount: make(USDC, 500n) },
    ],
  };

  await t.throwsAsync(() =>
    rebalance(orch, ctx, seat, badOfferArgs, ctx.makePortfolioKit()),
  );

  // Check that seat.fail() was called, not seat.exit()
  const seatCalls = log.filter(entry => entry._cap === 'seat');
  const failCall = seatCalls.find(call => call._method === 'fail');
  const exitCall = seatCalls.find(call => call._method === 'exit');

  t.truthy(failCall, 'seat.fail() should be called on error');
  t.falsy(exitCall, 'seat.exit() should not be called on error');
  t.snapshot(log, 'call log');
});

test('claim rewards on Aave position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const emptyAmount = AmountMath.make(USDC, 0n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();
  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'Aave_Arbitrum',
            amount: emptyAmount,
            fee: feeCall,
            claim: true,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  const axelarId = await cosmosId('axelar');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  const rawMemo = log[4].opts?.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'claimAllRewardsToSelf(address[])',
    'withdraw(address,uint256,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

test('open portfolio with Beefy position', async t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Avalanche', amount, fee: feeAcct },
        {
          src: '@Avalanche',
          dest: 'Beefy_re7_Avalanche',
          amount,
          fee: feeCall,
        },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 2_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[8].opts?.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'deposit(uint256)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');
});

test('wayFromSrcToDest handles +agoric -> @agoric', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({ src: '+agoric', dest: '@agoric', amount });
  t.deepEqual(actual, { how: 'send' });
});

test('Engine can move deposits +agoric -> @agoric', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 2_000_000n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '+agoric', dest: '@agoric', amount }] },
    kit,
  );

  t.log(log.map(msg => msg._method).join(', '));

  const lca = kit.reader.getLocalAccount();
  t.is(lca.getAddress().value, 'agoric11028');
  t.like(log, [
    { _cap: 'agoric11028', _method: 'monitorTransfers' },
    {
      _cap: 'agoric11042',
      _method: 'send',
      toAccount: { value: 'agoric11028' },
    },
    { _method: 'exit' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('client can move to deposit LCA', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 2_000_000n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '<Deposit>', dest: '+agoric', amount }] },
    kit,
  );
  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'localTransfer' }]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in provideCosmosAccount makeAccount', async t => {
  const amount = make(USDC, 100n);
  const chainToErr = new Map([['noble', Error('timeout creating ICA')]]);

  const { give, steps } = await makePortfolioSteps({ USDN: amount });
  const { orch, ctx, offer, storage } = mocks(
    { makeAccount: chainToErr },
    give,
  );
  const { log } = offer;

  // Create portfolio once for both attempts
  const kit = await ctx.makePortfolioKit();

  // First attempt - will fail creating noble account
  const seat1 = makeMockSeat({ Deposit: amount }, undefined, log);

  const attempt1 = rebalance(orch, ctx, seat1, { flow: steps }, kit);

  t.is(await attempt1, undefined);

  // Check failure evidence
  const failCall = log.find(entry => entry._method === 'fail');
  t.truthy(
    failCall,
    'seat.fail() should be called when noble account creation fails',
  );
  t.deepEqual(
    failCall?.reason,
    Error('timeout creating ICA'),
    'rebalance should fail when noble account creation fails',
  );

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Check portfolio status shows limited accounts (only agoric, no noble due to failure)
  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.true('agoric' in byChain, 'agoric account should be present');
    t.false(
      'noble' in byChain,
      'noble account should not be present due to failure',
    );
  }

  // Recovery attempt - clear the error and use same portfolio
  chainToErr.delete('noble');

  const seat2 = makeMockSeat({ Deposit: amount }, undefined, log);

  await rebalance(orch, ctx, seat2, { flow: steps }, kit);

  const exitCall = log.find(entry => entry._method === 'exit');
  t.truthy(exitCall, 'seat.exit() should be called on successful recovery');

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.deepEqual(
      Object.keys(byChain),
      ['agoric', 'noble'],
      'portfolio includes noble account',
    );
  }
});

test('handle failure in provideEVMAccount sendMakeAccountCall', async t => {
  const unlucky = make(BLD, 13n);
  const { give, steps } = await makePortfolioSteps(
    { Compound: make(USDC, 2_000_000n) },
    {
      fees: { Compound: { Account: unlucky, Call: make(BLD, 100n) } },
      evm: 'Arbitrum',
    },
  );
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks(
    { send: Error('Insufficient funds - piggy bank sprang a leak') },
    give,
  );
  const { log } = offer;

  // Create portfolio once for both attempts
  const pKit = await ctx.makePortfolioKit();

  // First attempt - will fail when trying to send 13n BLD (unlucky amount)
  const seat1 = makeMockSeat(give, undefined, log);

  const attempt1P = rebalance(orch, ctx, seat1, { flow: steps }, pKit);
  const testDonePK = makePromiseKit();
  void txResolver.settleUntil(testDonePK.promise);
  t.is(await attempt1P, undefined);

  const seatFails = log.find(e => e._method === 'fail' && e._cap === 'seat');
  t.like(
    seatFails?.reason,
    {
      error: 'Insufficient funds - piggy bank sprang a leak',
      how: 'Compound',
      step: 4,
    },
    'rebalance should fail when EVM account creation fails',
  );

  const { getPortfolioStatus, getFlowStatus } = makeStorageTools(storage);

  {
    const { accountIdByChain: byChain, accountsPending } =
      await getPortfolioStatus(1);
    // addresses of all requested accounts are available
    t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric', 'noble']);
    // attempt to install Arbitrum account is no longer pending
    t.deepEqual(accountsPending, []);

    const fs = await getFlowStatus(1, 1);
    t.log(fs);
    t.deepEqual(
      fs,
      {
        type: 'rebalance',
        state: 'fail',
        step: 4,
        how: 'Compound',
        error: 'Insufficient funds - piggy bank sprang a leak',
        next: undefined,
      },
      '"Insufficient funds" error should be visible in vstorage',
    );
  }

  // Recovery attempt - avoid the unlucky 13n fee using same portfolio
  const { give: giveGood, steps: stepsGood } = await makePortfolioSteps(
    { Compound: make(USDC, 2_000_000n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const seat2 = makeMockSeat(giveGood, undefined, log);
  const attempt2P = rebalance(orch, ctx, seat2, { flow: stepsGood }, pKit);

  await Promise.all([
    attempt2P,
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  t.truthy(log.find(entry => entry._method === 'exit'));

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric', 'noble']);
  }

  testDonePK.resolve(undefined);
});

test.todo('recover from send step');

test('withdraw in coordination with planner', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver, cosmosId } = mocks({});

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  {
    const amount = make(USDC, 50_000_000n);
    const seat = makeMockSeat({ Aave: amount }, {}, offer.log);
    const feeAcct = AmountMath.make(BLD, 50n);
    const feeCall = AmountMath.make(BLD, 100n);
    const depositP = rebalance(
      orch,
      ctx,
      seat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
      kit,
    );
    await Promise.all([
      depositP,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
        await txResolver.drainPending();
      }),
    ]);
  }

  const webUiDone = (async () => {
    const Cash = make(USDC, 2_000_000n);
    const wSeat = makeMockSeat({}, { Cash }, offer.log);
    await executePlan(orch, ctx, wSeat, {}, kit, {
      type: 'withdraw',
      amount: Cash,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'withdraw') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);
    const feeCall = AmountMath.make(BLD, 100n);
    const steps: MovementDesc[] = [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee: feeCall },
      { src: '@Arbitrum', dest: '@agoric', amount },
      { src: '@agoric', dest: '<Cash>', amount },
    ];

    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();
  await Promise.all([webUiDone, plannerP, txResolver.drainPending()]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'send', _cap: 'agoric11014' }, // from fee account
    { _method: 'transfer' }, // makeAccount
    { _method: 'localTransfer', amounts: { Deposit: { value: 50000000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer' }, // supply call
    { _method: 'exit' },

    // withdraw calls
    { _method: 'send' },
    {
      _cap: 'agoric11028',
      _method: 'transfer',
      address: { chainId: axelarId },
      amount: { value: 100n },
    },
    { _method: 'send', _cap: 'agoric11014' },
    { _method: 'transfer' }, // depositForBurn
    { _method: 'withdrawToSeat', amounts: { Cash: { value: 2_000_000n } } },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await documentStorageSchema(t, storage, docOpts);
});

test('deposit in coordination with planner', async t => {
  const { orch, ctx, offer, storage, cosmosId, txResolver } = mocks({});

  const nobleId = await cosmosId('noble');

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  const webUiDone = (async () => {
    const Deposit = make(USDC, 1_000_000n);
    const dSeat = makeMockSeat({ Deposit }, {}, offer.log);
    return executePlan(orch, ctx, dSeat, {}, kit, {
      type: 'deposit',
      amount: Deposit,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'deposit') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);

    const steps = planUSDNDeposit(amount);
    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();

  const [result] = await Promise.all([webUiDone, plannerP]);
  t.log('result', result);
  t.is(result, 'flow1');

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Deposit: { value: 1000000n } } },
    { _method: 'transfer', address: { chainId: nobleId } },
    { msgs: [{ typeUrl: '/noble.swap.v1.MsgSwap' }] },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await txResolver.drainPending();
  await documentStorageSchema(t, storage, docOpts);
});

test('simple rebalance in coordination with planner', async t => {
  const { orch, ctx, offer, storage, txResolver } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Create portfolio with initial allocation
  const initialKit = await ctx.makePortfolioKit();
  const portfolioId = initialKit.reader.getPortfolioId();

  // First deposit funds into USDN position
  {
    const depositAmount = make(USDC, 10_000n);
    const depositSeat = makeMockSeat({ Deposit: depositAmount }, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      depositSeat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount: depositAmount },
          { src: '@agoric', dest: '@noble', amount: depositAmount },
          { src: '@noble', dest: 'USDN', amount: depositAmount },
        ],
      },
      initialKit,
    );
  }

  // Set initial allocation (100% USDN in basis points)
  {
    const initialAllocation = { USDN: 10000n }; // 100% = 10000 basis points
    const seat = makeMockSeat({}, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      seat,
      { targetAllocation: initialAllocation },
      initialKit,
    );
  }

  // Now test simpleRebalance flow with different allocation
  const webUiDone = (async () => {
    const newAllocation = { USDN: 5000n, Aave_Arbitrum: 5000n }; // 50% each = 5000 basis points each
    const srSeat = makeMockSeat({}, {}, offer.log);
    initialKit.manager.setTargetAllocation(newAllocation);
    await executePlan(orch, ctx, srSeat, {}, initialKit, { type: 'rebalance' });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    // Planner provides steps to move from USDN to mixed allocation
    const steps: MovementDesc[] = [
      { src: 'USDN', dest: '@noble', amount: make(USDC, 5_000_000n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: make(USDC, 5_000_000n),
        fee: make(BLD, 100n),
      },
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: make(USDC, 5_000_000n),
        fee: make(BLD, 50n),
      },
    ];

    initialKit.planner.resolveFlowPlan(
      Number(flowId.replace('flow', '')),
      steps,
    );
  })();

  // Simulate external system responses for cross-chain operations
  const simulationP = (async () => {
    await txResolver.drainPending();
  })();

  await Promise.all([webUiDone, plannerP, simulationP]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');

  await documentStorageSchema(t, storage, docOpts);
});

test('parallel execution with scheduler', async t => {
  const { orch, ctx, offer, storage, txResolver, cosmosId } = mocks({});

  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');

  const trace = makeTracer('PExec');
  const kit = await ctx.makePortfolioKit();
  await provideCosmosAccount(orch, 'agoric', kit, trace);
  const portfolioId = kit.reader.getPortfolioId();

  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);

  const webUiDone = (async () => {
    const Deposit = make(USDC, 40_000_000n);
    const dSeat = makeMockSeat({ Deposit }, {}, offer.log);

    return executePlan(orch, ctx, dSeat, {}, kit, {
      type: 'deposit',
      amount: Deposit,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);

    if (detail.type !== 'deposit') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);
    const amt60 = make(USDC, (amount.value * 60n) / 100n);
    const amt40 = make(USDC, (amount.value * 40n) / 100n);
    const feeAcct = AmountMath.make(BLD, 50n);
    const steps: MovementDesc[] = [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDN', amount: amt40 },
      { src: '@noble', dest: '@Arbitrum', amount: amt60, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount: amt60 },
    ];

    const plan: FundsFlowPlan = {
      flow: steps,
      order: [
        [1, [0]],
        [2, [1]],
        [3, [1]],
        [4, [3]],
      ],
    };
    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), plan);
  })();

  const resolverP = txResolver.settleUntil(webUiDone);

  // Simulate external system responses for cross-chain operations
  const simulationP = (async () => {
    await offer.factoryPK.promise;
  })();

  const [result] = await Promise.all([
    webUiDone,
    plannerP,
    resolverP,
    simulationP,
  ]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: axelarId } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 40_000_000n } },
    },
    { _method: 'transfer', address: { chainId: nobleId } },
    {
      _method: 'executeEncodedTx',
      msgs: [{ typeUrl: '/noble.swap.v1.MsgSwap' }],
    }, // USDN swap (parallel)
    { _method: 'depositForBurn', denomAmount: { value: 24_000_000n } },
    { _method: 'send' },
    { _method: 'transfer' }, // Aave supply call
    { _method: 'exit' },
  ]);

  t.log('result', result);
  t.is(result, 'flow1');

  const flowHistory = {
    [`portfolio${portfolioId}.flows.flow1`]: await getFlowHistory(
      portfolioId,
      1,
    ),
  };
  t.log(flowHistory);
  const parallel = Object.values(flowHistory)[0].flatMap(s =>
    s.state === 'run' && (s.steps || []).length > 1 ? [s] : [],
  );
  t.log('parallel', parallel);
  t.true(parallel.length > 0);

  t.snapshot(flowHistory, 'parallel flow history');
});

const silent: TraceLogger = Object.assign(() => {}, {
  sub: () => silent,
});

/** turn boundaries in provideEVMAccount (except awaiting feeAccount and getChainInfo) */
type EStep = 'predict' | 'send' | 'register' | 'txfr' | 'resolve';

type ProvideEVMAccountFn = (
  ...args: Parameters<typeof provideEVMAccount>
) => ReturnType<typeof provideEVMAccount>;

const provideEVMAccountWithPermitStub: ProvideEVMAccountFn = (
  chainName,
  chainInfo,
  gmp,
  lca,
  ctx,
  pk,
  { orchOpts } = {},
) =>
  provideEVMAccountWithPermit(
    chainName,
    chainInfo,
    gmp,
    lca,
    ctx,
    pk,
    {
      permit: {
        permitted: {
          token: '0x0000000000000000000000000000000000000001',
          amount: 1n,
        },
        nonce: 1n,
        deadline: 1n,
      },
      owner: '0x1111111111111111111111111111111111111111',
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234' as `0x${string}`,
    },
    orchOpts,
  );

/**
 * make 2 attempts A, and B, to provideEVMAccount.
 * Give A a headStart and then pause it.
 * Optionally, fail A at some step.
 * If A succeeds, B should re-use its result.
 * Otherwise, B should succeed after recovering.
 */
const makeAccountEVMRace = test.macro({
  title: (
    providedTitle = '',
    _provide: ProvideEVMAccountFn,
    _headStart: EStep,
    _errAt?: EStep,
  ) => `EVM makeAccount race: ${providedTitle}`,
  async exec(t, provide: ProvideEVMAccountFn, headStart: EStep, errAt?: EStep) {
    const { orch, ctx, offer, txResolver } = mocks({});

    const pKit = await ctx.makePortfolioKit();
    await provideCosmosAccount(orch, 'agoric', pKit, silent);
    const lca = pKit.reader.getLocalAccount();

    const chainName = 'Arbitrum';
    const { [chainName]: chainInfo } = axelarCCTPConfig;
    const gmp = { chain: await orch.getChain('axelar'), fee: 123n };

    const attempt = async () => {
      return provide(chainName, chainInfo, gmp, lca, ctx, pKit, undefined);
    };

    const { log, kinks } = offer;
    type Kink = (typeof kinks)[0];
    const A = attempt();
    const Aready = A.then(status => status.ready);
    const Asettled = Aready.catch(_ => {});

    const startSettlingPK = makePromiseKit();
    const [txStatus, txReason] =
      errAt === 'resolve'
        ? (['failed', 'oops!'] as const)
        : (['success', undefined] as const);
    void startSettlingPK.promise.then(() =>
      txResolver.settleUntil(Asettled, txStatus, txReason),
    );

    const resolveAfterBStarts: ((r: unknown) => void)[] = [];
    const removeKink = (kink: Kink) => {
      const ix = kinks.indexOf(kink);
      t.log('remove kink at', ix, kink.name);
      kinks.splice(ix);
    };
    const waitDuring = (method: string) => {
      const sync = makePromiseKit();
      resolveAfterBStarts.push(sync.resolve);
      const waitKink: Kink = async ev => {
        if (ev._method === method) {
          removeKink(waitKink);
          t.log('wait for B before:', method);
          await sync.promise;
        }
      };
      kinks.push(waitKink);
    };
    const failedMethods: string[] = [];
    const failDuring = (method: string, msg = 'no joy') => {
      const failKink: Kink = async ev => {
        if (ev._method === method) {
          t.log('fail in A during:', method);
          failedMethods.push(method);
          removeKink(failKink);
          throw Error(msg);
        }
      };
      kinks.push(failKink);
    };

    switch (headStart) {
      case 'predict': {
        waitDuring('send');
        startSettlingPK.resolve(null);
        break;
      }

      case 'send': {
        waitDuring('transfer');
        if (errAt === 'send') {
          failDuring('send', 'insufficient funds: need moar!');
        }
        startSettlingPK.resolve(null);
        break;
      }

      case 'register': {
        waitDuring('transfer');
        startSettlingPK.resolve(null);
        break;
      }

      case 'txfr':
        if (errAt === 'txfr') {
          failDuring('transfer', 'timeout: coach is not happy');
        } else {
          kinks.push(async ev => {
            if (ev._method === 'transfer') startSettlingPK.resolve(null);
          });
        }
        break;

      case 'resolve': {
        startSettlingPK.resolve(null);
        break;
      }
      default:
        throw Error('unreachable');
    }

    const { remoteAddress } = await A;
    t.log('promptly available address', remoteAddress);

    await eventLoopIteration(); // A runs until paused
    const getMethods = () => log.map(msg => msg._method);
    const methodsBeforeB = getMethods();
    t.log('calls before B:', methodsBeforeB.join(', '));

    const B = attempt();
    for (const resolve of resolveAfterBStarts) {
      resolve(null);
    }

    const statusB = await B;
    t.is(statusB.remoteAddress, remoteAddress, 'same address for both racers');

    await (errAt ? t.throwsAsync(Aready) : t.notThrowsAsync(Aready));
    t.snapshot(
      { methodsBeforeB, failedMethods },
      JSON.stringify({ headStart, errAt }),
    );

    t.log('calls after A:', getMethods().join(', '));
    await t.notThrowsAsync(B.then(status => status.ready));

    t.log('calls after A,B:', getMethods().join(', '));
    t.snapshot(getMethods(), 'total sequence of completed methods');
  },
});

test(
  'A and B arrive together; A wins the race',
  makeAccountEVMRace,
  provideEVMAccount,
  'predict',
);
test('A pays fee; B arrives', makeAccountEVMRace, provideEVMAccount, 'send');
test(
  'A fails to pay fee; B arrives',
  makeAccountEVMRace,
  provideEVMAccount,
  'send',
  'send',
);
test(
  'A registers txN; B arrives',
  makeAccountEVMRace,
  provideEVMAccount,
  'register',
);
test(
  'A transfers to axelar; B arrives',
  makeAccountEVMRace,
  provideEVMAccount,
  'txfr',
);
test(
  'A times out on axelar; B arrives',
  makeAccountEVMRace,
  provideEVMAccount,
  'txfr',
  'txfr',
);
test(
  'A gets rejected txN; B arrives',
  makeAccountEVMRace,
  provideEVMAccount,
  'txfr',
  'resolve',
);
test(
  'A finishes before attempt B starts',
  makeAccountEVMRace,
  provideEVMAccount,
  'resolve',
);

test(
  'withPermit: A and B arrive together; A wins the race',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'predict',
);
test(
  'withPermit: A pays fee; B arrives',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'send',
);
test(
  'withPermit: A registers txN; B arrives',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'register',
);
test(
  'withPermit: A transfers to axelar; B arrives',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'txfr',
);
test(
  'withPermit: A times out on axelar; B arrives',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'txfr',
  'txfr',
);
test(
  'withPermit: A gets rejected txN; B arrives',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'txfr',
  'resolve',
);
test(
  'withPermit: A finishes before attempt B starts',
  makeAccountEVMRace,
  provideEVMAccountWithPermitStub,
  'resolve',
);

test('planner rejects plan and flow fails gracefully', async t => {
  const { orch, ctx, offer, storage } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  // Set up portfolio with initial allocation
  kit.manager.setTargetAllocation({ USDN: 10000n }); // 100% USDN

  const webUiDone = (async () => {
    const Cash = make(USDC, 1_000_000n);
    const dSeat = makeMockSeat({}, { Cash }, offer.log);

    // This should fail when planner rejects the plan
    await t.throwsAsync(
      () =>
        executePlan(orch, ctx, dSeat, {}, kit, {
          type: 'withdraw',
          amount: Cash,
        }),
      { message: 'insufficient funds for this operation' },
    );
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found running flow', { portfolioId, flowId, detail });

    if (detail.type !== 'withdraw')
      throw t.fail(`Expected withdraw, got ${detail.type}`);

    // Planner rejects the plan due to insufficient funds
    const flowIdNum = Number(flowId.replace('flow', ''));

    kit.planner.rejectFlowPlan(
      flowIdNum,
      'insufficient funds for this operation',
    );
  })();

  await Promise.all([webUiDone, plannerP]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));

  // Verify the seat failed rather than exited successfully
  const seatCalls = log.filter(entry => entry._cap === 'seat');
  const failCall = seatCalls.find(call => call._method === 'fail');
  const exitCall = seatCalls.find(call => call._method === 'exit');

  t.truthy(failCall, 'seat.fail() should be called when plan is rejected');
  t.falsy(exitCall, 'seat.exit() should not be called when plan is rejected');
  t.deepEqual(
    `${failCall?.reason}`,
    'Error: insufficient funds for this operation',
    'failure reason should match rejection message',
  );

  // Verify flow is cleaned up from running flows
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after rejection');

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('failed transaction publishes rejectionReason to vstorage', async t => {
  const { storage, resolverClient, resolverService, vowTools } = mocks({});

  const { result, txId } = resolverClient.registerTransaction(
    'GMP',
    'eip155:137:0x9e1028F5F1D5eDE59748FFceC5532509976840E0',
  );
  await eventLoopIteration();

  const rejectionReason = 'remote account does not have enough USDC';

  // Settle the transaction as failed with a rejection reason
  resolverService.settleTransaction({
    txId,
    status: 'failed',
    rejectionReason,
  });
  await eventLoopIteration();

  // Verify the vow is rejected with the correct reason
  await t.throwsAsync(() => vowTools.when(result), {
    message: rejectionReason,
  });
  await documentStorageSchema(t, storage, docOpts);
});

test('asking to relay less than 1 USDC over CCTP is refused by contract', async t => {
  const amount = make(USDC, 250_000n);
  const { orch, tapPK, ctx, offer, storage, txResolver, cosmosId } = mocks(
    {},
    { Deposit: amount },
  );

  const feeAcct = AmountMath.make(BLD, 150n);
  const feeCall = AmountMath.make(BLD, 100n);
  const steps: MovementDesc[] = [
    { src: '<Deposit>', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
    { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
  ];

  const nobleId = await cosmosId('noble');

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, { flow: steps }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer' },
    { _method: 'send' },
    { _method: 'transfer' },
    { _method: 'localTransfer' },
    { _method: 'transfer', address: { chainId: nobleId } },
    { _method: 'fail' },
  ]);

  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('makeErrorList collects any number of errors', t => {
  {
    const fromNoRejections = makeErrorList(
      [{ status: 'fulfilled', value: undefined }],
      [],
    );
    t.deepEqual(fromNoRejections, undefined, 'no errors');
  }

  {
    const fromOneRejection = makeErrorList(
      [
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('insufficient funds') },
      ],
      [{ how: 'IBC' }, { how: 'Aave' }],
    );
    t.log('single error', fromOneRejection);
    t.deepEqual(
      fromOneRejection,
      {
        error: 'insufficient funds',
        how: 'Aave',
        next: undefined,
        step: 2,
      },
      'single error',
    );
  }

  {
    const fromSeveralRejections = makeErrorList(
      [
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('insufficient funds') },
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('no route') },
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: Error('prereq 4 failed') },
      ],
      [
        { how: 'IBC' },
        { how: 'Aave' },
        { how: 'send' },
        { how: 'pidgeon' },
        { how: 'IBC' },
        { how: 'Compound' },
      ],
    );
    t.log('several errors', fromSeveralRejections);
    t.deepEqual(
      fromSeveralRejections,
      {
        error: 'insufficient funds',
        how: 'Aave',
        next: {
          error: 'no route',
          how: 'pidgeon',
          next: {
            error: 'prereq 4 failed',
            how: 'Compound',
            next: undefined,
            step: 6,
          },
          step: 4,
        },
        step: 2,
      },
      'several errors',
    );
  }
});

test('open portfolio with ERC4626 position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
        {
          src: '@Arbitrum',
          dest: 'ERC4626_vaultU2_Ethereum',
          amount,
          fee: feeCall,
        },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 1_000_000n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-1' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[8].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'deposit(uint256,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');
});

test('withdraw from ERC4626 position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();
  const emptyAmount = AmountMath.make(USDC, 0n);

  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'ERC4626_vaultU2_Ethereum',
            amount: emptyAmount,
            fee: feeCall,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log');

  const rawMemo = log[4].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'withdraw(uint256,address,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

test('withdraw from Beefy position', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const kit = await ctx.makePortfolioKit();

  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'Beefy_re7_Avalanche',
            amount,
            fee: feeCall,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
      await txResolver.drainPending();
    }),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-dojo-1' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log');

  const rawMemo = log[4].opts!.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'beefyWithdrawUSDC(address,uint256)',
    'approve(address,uint256)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

type Permit2PermitOverrides = Partial<
  Omit<PermitDetails['permit2Payload'], 'permit'>
> & {
  permit?: Partial<PermitDetails['permit2Payload']['permit']> & {
    permitted?: Partial<PermitDetails['permit2Payload']['permit']['permitted']>;
  };
};

type Permit2Overrides = Partial<
  Omit<PermitDetails, 'permit2Payload'> & {
    permit2Payload: Permit2PermitOverrides;
  } & {
    chain: AxelarChain;
  }
>;

const makePermitDetails = (overrides: Permit2Overrides = {}): PermitDetails => {
  const chain = overrides.chain ?? 'Arbitrum';
  const amount = overrides.amount ?? 1_000_000_000n;
  const token = overrides.token ?? contractsMock[chain].usdc;
  const spender = overrides.spender ?? contractsMock[chain].depositFactory;
  const chainId =
    overrides.chainId ?? Number(axelarCCTPConfig[chain].reference);

  const basePayload: PermitDetails['permit2Payload'] = {
    permit: {
      permitted: {
        token,
        amount,
      },
      nonce: 7115368379195441n,
      deadline: 1357923600n,
    },
    owner: '0x1111111111111111111111111111111111111111',
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'OpenPortfolioWitness',
    signature: '0x1234' as `0x${string}`,
  };

  const permit2Payload = {
    ...basePayload,
    ...overrides.permit2Payload,
    permit: {
      ...basePayload.permit,
      ...overrides.permit2Payload?.permit,
      permitted: {
        ...basePayload.permit.permitted,
        ...overrides.permit2Payload?.permit?.permitted,
      },
    },
  };

  return {
    chainId,
    token,
    amount,
    spender,
    permit2Payload,
  };
};

// EVM wallet integration flow
test('openPortfolio from EVM with Permit2 completes a deposit flow', async t => {
  // Use a mixed-case spender to ensure case-insensitive address checks.
  const mixedCaseSpender =
    contractsMock.Arbitrum.depositFactory.toUpperCase() as Address;
  const permitDetails: PermitDetails = {
    chainId: Number(axelarCCTPConfig.Arbitrum.reference),
    token: contractsMock.Arbitrum.usdc,
    amount: 1_000_000_000n,
    spender: mixedCaseSpender,
    permit2Payload: {
      permit: {
        deadline: 1357923600n,
        nonce: 7115368379195441n,
        permitted: {
          amount: 1_000_000_000n,
          token: contractsMock.Arbitrum.usdc,
        },
      },
      owner: '0x1111111111111111111111111111111111111111',
      witness:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      witnessTypeString: 'OpenPortfolioWitness',
      signature: '0x1234' as `0x${string}`,
    },
  };
  const amount = make(USDC, permitDetails.amount);
  const targetAllocation = {
    Aave_Arbitrum: 6000n, // 60% in basis points
    Compound_Arbitrum: 4000n, // 40% in basis points
  };

  const { orch, ctx, offer, cosmosId, storage, txResolver } = mocks();
  const { log, seat } = offer;
  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  const webUiDone = openPortfolio(
    orch,
    ctx,
    seat,
    { targetAllocation },
    kit,
    {
      features: {
        useProgressTracker: true,
      },
    },
    { fromChain: 'Arbitrum', permitDetails, amount },
  );

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'deposit') throw t.fail(detail.type);
    flowNum = Number(flowId.replace('flow', ''));
    const fee = make(BLD, 100n);
    const fromChain = detail.fromChain as AxelarChain;
    const steps: MovementDesc[] = [
      { src: `+${fromChain}`, dest: `@${fromChain}`, amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);

    // Complete GMP transaction
    await txResolver.drainPending();
  })();

  await Promise.all([webUiDone, plannerP, offer.factoryPK.promise]);

  await eventLoopIteration();
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) {
    throw new Error('flow number not captured');
  }
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');

  t.log(log.map(msg => msg._method).join(', '));
  const nobleId = await cosmosId('noble');
  const axelarId = await cosmosId('axelar');
  const setupCalls = [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: nobleId } },
  ];
  const gmpCalls = [{ _method: 'transfer', address: { chainId: axelarId } }];
  t.like(log, [...setupCalls, ...gmpCalls, { _method: 'exit', _cap: 'seat' }]);
  t.snapshot(log, 'call log');

  const axelarTransfer = log.find(
    (e: any) => e._method === 'transfer' && e.address?.chainId === axelarId,
  );
  const rawMemo = axelarTransfer?.opts?.memo;
  t.truthy(rawMemo);
  const decodedPayload = decodeCreateAndDepositPayload(rawMemo as string);
  const lca = kit.reader.getLocalAccount();
  t.is(decodedPayload.lcaOwner, lca.getAddress().value);
  t.is(
    decodedPayload.tokenOwner.toLowerCase(),
    permitDetails.permit2Payload.owner.toLowerCase(),
  );
  t.is(
    decodedPayload.permit.permitted.token,
    permitDetails.permit2Payload.permit.permitted.token,
  );
  t.is(
    decodedPayload.permit.permitted.amount,
    permitDetails.permit2Payload.permit.permitted.amount,
  );
  t.is(decodedPayload.permit.nonce, permitDetails.permit2Payload.permit.nonce);
  t.is(
    decodedPayload.permit.deadline,
    permitDetails.permit2Payload.permit.deadline,
  );
  t.is(decodedPayload.signature, permitDetails.permit2Payload.signature);

  t.snapshot(decodedPayload, 'decoded payload');
});

test.todo(
  'openPortfolio from EVM with Permit2 retries when sendCreateAndDepositCall/Factory.execute fails',
);

test.todo(
  'openPortfolio from EVM with Permit2 handles subsequent deposits without skipping +Base -> @Base',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects permit with unexpected token for fromChain',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects deposit for unsupported chain',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects deposit with wrong spender',
);

test.todo(
  'openPortfolio from EVM with Permit2 rejects permit with zero amount',
);

// #region wayFromSrcToDest withdraw tests

test('wayFromSrcToDest handles @Arbitrum -> -Arbitrum (same-chain withdraw)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({
    src: '@Arbitrum',
    dest: '-Arbitrum',
    amount,
  });
  t.deepEqual(actual, { how: 'withdrawToEVM', dest: 'Arbitrum' });
});

test('wayFromSrcToDest handles @noble -> -Arbitrum (CCTP to user)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  const actual = wayFromSrcToDest({ src: '@noble', dest: '-Arbitrum', amount });
  t.deepEqual(actual, { how: 'CCTPtoUser', dest: 'Arbitrum' });
});

test('wayFromSrcToDest rejects @agoric -> -Arbitrum (invalid src for withdraw)', t => {
  const amount = AmountMath.make(USDC, 2_000_000n);
  t.throws(
    () => wayFromSrcToDest({ src: '@agoric', dest: '-Arbitrum', amount }),
    { message: /src for withdraw to "Arbitrum" must be same chain or noble/ },
  );
});

// #endregion

// #region evmHandler.rebalance tests

// XXX: These tests should exercise the flows directly without evmHandler
//      `portfolio.exos.test.ts` should test that executePlan gets called

test('evmHandler.rebalance completes a rebalance flow', async t => {
  const amount = AmountMath.make(USDC, 1_000_000n);
  const fee = AmountMath.make(BLD, 100n);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  // Invoke rebalance via evmHandler with target allocation
  const allocations = [
    { instrument: 'Aave_Arbitrum', portion: 60n },
    { instrument: 'Compound_Arbitrum', portion: 40n },
  ];
  const flowKey = kit.evmHandler.rebalance(allocations);
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a rebalance plan
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'rebalance')
      throw t.fail(`expected rebalance, got ${detail.type}`);
    flowNum = Number(flowId.replace('flow', ''));

    // Simple rebalance: move from one position to another
    const steps: MovementDesc[] = [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee },
      { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Verify the flow completed and was cleaned up
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) throw new Error('flow number not captured');
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');
});

test('evmHandler.rebalance rejects when sourceAccountId is not set', async t => {
  const { ctx } = mocks({}, {});

  // Create kit WITHOUT sourceAccountId
  const kit = await ctx.makePortfolioKit();

  t.throws(
    () =>
      kit.evmHandler.rebalance([
        { instrument: 'Aave_Arbitrum', portion: 100n },
      ]),
    { message: /rebalance requires sourceAccountId to be set/ },
  );
});

// #endregion evmHandler.rebalance tests

// #region evmHandler.withdraw step execution tests

// XXX: These tests should exercise the flows directly without evmHandler
//      portfolio.exos.test.ts should test that executePlan gets called

test('evmHandler.withdraw via CCTPtoUser sends depositForBurn to user address', async t => {
  const withdrawAmount = 2_000_000n;
  const amount = AmountMath.make(USDC, withdrawAmount);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus } = makeStorageTools(storage);

  // Invoke withdraw via evmHandler
  const flowKey = kit.evmHandler.withdraw({
    withdrawDetails: {
      amount: withdrawAmount,
      token: contractsMock.Arbitrum.usdc,
    },
    domain: { chainId: 42161n },
  });
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a CCTPtoUser step (funds routed through Noble)
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId]] = Object.entries(flowsRunning);
    const flowNum = Number(flowId.replace('flow', ''));

    const steps: MovementDesc[] = [
      { src: '@noble', dest: '-Arbitrum', amount },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Verify depositForBurn was called with user's address
  const depositForBurnCall = log.find(
    (entry: any) => entry._method === 'depositForBurn',
  );
  t.truthy(depositForBurnCall, 'depositForBurn should be called');
  t.is(
    depositForBurnCall?.destinationAddress,
    sourceAccountId,
    'destination should be user address from sourceAccountId',
  );

  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'depositForBurn' }]);

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.withdraw via GMP sends ERC20 transfer to user address', async t => {
  const withdrawAmount = 2_000_000n;
  const amount = AmountMath.make(USDC, withdrawAmount);
  const fee = AmountMath.make(BLD, 100n);

  // Valid checksummed Ethereum address (42161 is Arbitrum chain ID)
  const sourceAccountId =
    'eip155:42161:0x1234567890AbcdEF1234567890aBcdef12345678';

  const { ctx, offer, storage, txResolver, cosmosId } = mocks({}, {});
  const { log } = offer;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowHistory } = makeStorageTools(storage);
  let flowNum: number | undefined;

  // Invoke withdraw via evmHandler
  const flowKey = kit.evmHandler.withdraw({
    withdrawDetails: {
      amount: withdrawAmount,
      token: contractsMock.Arbitrum.usdc,
    },
    domain: { chainId: 42161n },
  });
  t.regex(flowKey, /^flow\d+$/);

  // Planner provides a GMP withdrawToEVM step (same-chain withdraw)
  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    if (detail.type !== 'withdraw')
      throw t.fail(`expected withdraw, got ${detail.type}`);
    flowNum = Number(flowId.replace('flow', ''));
    t.is(detail.toChain, 'Arbitrum', 'toChain should be Arbitrum');
    t.deepEqual(detail.amount, amount, 'amount should match');

    const steps: MovementDesc[] = [
      { src: '@Arbitrum', dest: '-Arbitrum', amount, fee },
    ];
    kit.planner.resolveFlowPlan(flowNum, steps);
    await txResolver.drainPending();
  })();

  await plannerP;
  await eventLoopIteration();

  t.log(log.map(msg => msg._method).join(', '));

  // Should have GMP transfers for the ERC20 transfer call
  const axelarId = await cosmosId('axelar');
  const gmpTransfers = log.filter(
    (entry: any) =>
      entry._method === 'transfer' && entry.address?.chainId === axelarId,
  );
  t.true(
    gmpTransfers.length > 0,
    'GMP transfer should be made for withdrawToEVM',
  );

  // Verify the flow completes successfully (no fail call)
  const failCall = log.find((entry: any) => entry._method === 'fail');
  t.falsy(failCall, 'seat should not fail');

  // Verify the flow completed and was cleaned up
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  t.deepEqual(flowsRunning, {}, 'flow should be cleaned up after completion');
  if (flowNum === undefined) throw new Error('flow number not captured');
  const flowHistory = await getFlowHistory(portfolioId, flowNum);
  t.is(flowHistory.at(-1)?.state, 'done');

  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});

test('evmHandler.withdraw rejects when sourceAccountId is not set', async t => {
  const { ctx } = mocks({}, {});

  // Create kit WITHOUT sourceAccountId
  const kit = await ctx.makePortfolioKit();

  t.throws(
    () =>
      kit.evmHandler.withdraw({
        withdrawDetails: {
          amount: 2_000_000n,
          token: contractsMock.Arbitrum.usdc,
        },
        domain: { chainId: 42161n },
      }),
    { message: /withdraw requires sourceAccountId to be set/ },
  );
});

// #endregion evmHandler.withdraw tests

// #region evmHandler.deposit tests

test('evmHandler.deposit via Permit2 with unknown spender is rejected', async t => {
  const permitDetails = makePermitDetails({
    spender: '0x0000000000000000000000000000000000009999' as Address,
  });
  const { orch, ctx } = mocks({}, {});
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);

  t.throws(() => kit.evmHandler.deposit(permitDetails), {
    message: /permit spender .* does not match expected account/,
  });
});

/**
 * This test uses the factory contract as the spender address.
 */
test('evmHandler.deposit via Permit2 with factoryContract as spender succeeds', async t => {
  const permitDetails = makePermitDetails({
    spender: contractsMock.Arbitrum.depositFactory as Address,
  });
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);

  const flowKey = kit.evmHandler.deposit(permitDetails);
  t.regex(flowKey, /^flow\d+$/);
  const flowNum = Number(flowKey.replace('flow', ''));
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowStatus } = makeStorageTools(storage);
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  const detail = flowsRunning[flowKey];
  if (!detail || detail.type !== 'deposit') {
    throw t.fail('missing deposit flow detail');
  }
  const fromChain = detail.fromChain as AxelarChain;
  const fee = make(BLD, 100n);
  const steps: MovementDesc[] = [
    { src: `+${fromChain}`, dest: `@${fromChain}`, amount: detail.amount, fee },
  ];
  kit.planner.resolveFlowPlan(flowNum, steps);
  await txResolver.drainPending();
  await eventLoopIteration();

  const flowStatus = await getFlowStatus(portfolioId, flowNum);
  t.is(flowStatus?.state, 'done');
});

test('evmHandler.deposit via Permit2 with existing wallet as spender succeeds', async t => {
  const existingWallet =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
  const permitDetails = makePermitDetails({ spender: existingWallet });
  const { orch, ctx, storage, txResolver } = mocks({}, {});
  const sourceAccountId =
    `eip155:${permitDetails.chainId}:${permitDetails.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  await provideCosmosAccount(orch, 'agoric', kit, silent);
  kit.manager.resolveAccount({
    namespace: 'eip155',
    chainName: 'Arbitrum',
    chainId: 'eip155:42161',
    remoteAddress: existingWallet,
  });

  const flowKey = kit.evmHandler.deposit(permitDetails);
  t.regex(flowKey, /^flow\d+$/);
  const flowNum = Number(flowKey.replace('flow', ''));
  const portfolioId = kit.reader.getPortfolioId();
  const { getPortfolioStatus, getFlowStatus } = makeStorageTools(storage);
  const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
  const detail = flowsRunning[flowKey];
  if (!detail || detail.type !== 'deposit') {
    throw t.fail('missing deposit flow detail');
  }
  const fee = make(BLD, 100n);
  const fromChain = detail.fromChain as AxelarChain;
  const steps: MovementDesc[] = [
    { src: `+${fromChain}`, dest: `@${fromChain}`, amount: detail.amount, fee },
  ];
  kit.planner.resolveFlowPlan(flowNum, steps);
  await txResolver.drainPending();
  await eventLoopIteration();

  const flowStatus = await getFlowStatus(portfolioId, flowNum);
  t.is(flowStatus?.state, 'done');
});

// #endregion evmHandler.deposit tests

test('move Aave position Base -> Optimism via CCTPv2', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({});
  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  // Seed a Base Aave position.
  {
    const amount = make(USDC, 50_000_000n);
    const seat = makeMockSeat({ Aave: amount }, {}, offer.log);
    const feeAcct = AmountMath.make(BLD, 50n);
    const feeCall = AmountMath.make(BLD, 100n);
    const depositP = rebalance(
      orch,
      ctx,
      seat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Base', amount, fee: feeAcct },
          { src: '@Base', dest: 'Aave_Base', amount, fee: feeCall },
        ],
      },
      kit,
    );
    await Promise.all([
      depositP,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(async () => {
        await txResolver.drainPending();
      }),
    ]);
  }

  const webUiDone = (async () => {
    const seat = makeMockSeat({}, {}, offer.log);
    await executePlan(orch, ctx, seat, {}, kit, { type: 'rebalance' });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    const amount = make(USDC, 20_000_000n);
    const feeCall = AmountMath.make(BLD, 100n);
    const feeGmp = AmountMath.make(BLD, 50n);
    const steps: MovementDesc[] = [
      { src: 'Aave_Base', dest: '@Base', amount, fee: feeCall },
      {
        src: '@Base',
        dest: '@Optimism',
        amount,
        fee: feeGmp,
        detail: { cctpVersion: 2n, maxFee: 3n, minFinalityThreshold: 1000n },
      },
      { src: '@Optimism', dest: 'Aave_Optimism', amount, fee: feeCall },
    ];

    t.deepEqual(wayFromSrcToDest(steps[1]), {
      how: 'CCTPv2',
      src: 'Base',
      dest: 'Optimism',
    });

    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();

  await Promise.all([webUiDone, plannerP, txResolver.drainPending()]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');
  await documentStorageSchema(t, storage, docOpts);
});
