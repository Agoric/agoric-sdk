/**
 * @file Shared harness for portfolio flow tests.
 */
import type { GuestInterface } from '@agoric/async-flow';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeIssuerKit } from '@agoric/ertp';
import { type TraceLogger } from '@agoric/internal';
import { type StorageMessage } from '@agoric/internal/src/lib-chainStorage.js';
import {
  defaultSerializer,
  makeAsyncQueue,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  denomHash,
  type AccountId,
  type Bech32Address,
  type CaipChainId,
  type IBCMsgTransferOptions,
  type LegacyExecuteEncodedTxOptions,
  type Orchestrator,
  type TrafficEntry,
} from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import {
  chainOfAccount,
  parseAccountId,
} from '@agoric/orchestration/src/utils/address.js';
import { prepareProgressTracker } from '@agoric/orchestration/src/utils/progress.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { AxelarChain } from '@agoric/portfolio-api';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { DEFAULT_FLOW_CONFIG } from '@agoric/portfolio-api/src/constants.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeHeapZone } from '@agoric/zone';
import { Far } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  onAgoricTransfer,
  executePlan as rawExecutePlan,
  rebalance as rawRebalance,
  type OnTransferContext,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import { TxStatus } from '../src/resolver/constants.js';
import { prepareResolverKit } from '../src/resolver/resolver.exo.js';
import {
  PENDING_TXS_NODE_KEY,
  type PublishedTx,
  type TxId,
} from '../src/resolver/types.ts';
import { makeOfferArgsShapes } from '../src/type-guards-steps.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { axelarIdsMock, contractsMock, gmpAddresses } from './mocks.ts';
import { axelarCCTPConfig, makeIncomingVTransferEvent } from './supports.ts';

const theExit = harden(() => {});
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

export const { brand: USDC } = makeIssuerKit('USDC');
export const { brand: BLD } = makeIssuerKit('BLD');

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
  }) as any;
  return vowTools as VowTools;
};

export const makeMockSeat = <M extends keyof ProposalType>(
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

export interface MockLogEvent {
  _method: string;
  _cap?: string;
  opts?: Record<string, any>;
  [key: string]: unknown;
}

/**
 * Mocks for testing orchestration API usage of a portfolio flow,
 * including fake storage.
 */
export const mocks = (
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
  const kinks: Set<(ev: MockLogEvent) => Promise<void>> = new Set();
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
    rawRebalance(
      orch,
      ctx1,
      seat,
      offerArgs,
      kit,
      undefined,
      DEFAULT_FLOW_CONFIG,
    );

  const executePlanHost = (
    seat,
    offerArgs,
    kit,
    flowDetail,
    startedFlow,
    config,
    options,
  ) =>
    rawExecutePlan(
      orch,
      ctx1,
      seat,
      offerArgs,
      kit,
      flowDetail,
      startedFlow,
      config ?? DEFAULT_FLOW_CONFIG,
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

  const getDeserialized = (path: string): unknown[] => {
    return storage.getValues(path).map(defaultSerializer.parse);
  };

  const txResolver = harden({
    getPublished: (txId: TxId) =>
      getDeserialized(`published.ymax0.pendingTxs.${txId}`).at(-1) as
        | PublishedTx
        | undefined,
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
    makeProgressTracker,
    resolverClient,
    resolverService,
    cosmosId,
  };
};

export type Mocks = Awaited<ReturnType<typeof mocks>>;

export const docOpts = {
  node: 'ymax0',
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

export const silent: TraceLogger = Object.assign(() => {}, {
  sub: () => silent,
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

export const makePermitDetails = (
  overrides: Permit2Overrides = {},
): PermitDetails => {
  const chain = overrides.chain ?? 'Arbitrum';
  const amount = overrides.amount ?? 1_000_000_000n;
  const token = overrides.token ?? contractsMock[chain].usdc;
  const spender = overrides.spender ?? contractsMock[chain].depositFactory;
  const chainId =
    overrides.chainId ?? BigInt(axelarCCTPConfig[chain].reference);

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
