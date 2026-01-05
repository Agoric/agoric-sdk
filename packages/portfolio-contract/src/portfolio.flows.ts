/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */

import type { GuestInterface } from '@agoric/async-flow';
import { type Amount, type Brand, type NatAmount } from '@agoric/ertp';
import {
  deeplyFulfilledObject,
  fromTypedEntries,
  makeTracer,
  objectMap,
  type TraceLogger,
} from '@agoric/internal';
import type {
  AccountId,
  BaseChainInfo,
  CosmosChainAddress,
  Denom,
  DenomAmount,
  IBCConnectionInfo,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
  TrafficEntry,
  ProgressTracker,
  OrchestrationOptions,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { progressTrackerAsyncFlowUtils } from '@agoric/orchestration/src/utils/progress.js';
import {
  TxType,
  type FlowErrors,
  type FlowStep,
  type FundsFlowPlan,
  type FlowConfig,
  type TrafficReport,
} from '@agoric/portfolio-api';
import {
  AxelarChain,
  SupportedChain,
  type YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail, q } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';
import type { EVow } from '@agoric/vow';
import { VaultType } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/vaults.js';
import type { RegisterAccountMemo } from './noble-fwd-calc.js';
import type { AxelarId, GmpAddresses } from './portfolio.contract.ts';
import type { AccountInfoFor, PortfolioKit } from './portfolio.exo.ts';
import {
  AaveProtocol,
  BeefyProtocol,
  CCTP,
  CCTPfromEVM,
  CompoundProtocol,
  ERC4626Protocol,
  provideEVMAccount,
  type EVMContext,
  type GMPAccountStatus,
} from './pos-gmp.flows.ts';
import {
  agoricToNoble,
  nobleToAgoric,
  protocolUSDN,
} from './pos-usdn.flows.ts';
import type { Position } from './pos.exo.ts';
import type { ResolverKit } from './resolver/resolver.exo.js';
import { runJob, type Job } from './schedule-order.ts';
import {
  getChainNameOfPlaceRef,
  getKeywordOfPlaceRef,
  type AssetPlaceRef,
  type MovementDesc,
  type OfferArgsFor,
} from './type-guards-steps.ts';
import {
  PoolPlaces,
  type EVMContractAddressesMap,
  type FlowDetail,
  type PoolKey,
  type ProposalType,
} from './type-guards.ts';
import type { TxId } from './resolver/types.ts';

const { keys, entries, fromEntries } = Object;
const { reduceProgressReports } = progressTrackerAsyncFlowUtils;

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;

const SETUP_STEP = 0;
type StepPhase = 'makeSrcAccount' | 'makeDestAccount' | 'apply' | 'undo';

export type PortfolioInstanceContext = {
  axelarIds: AxelarId;
  contracts: EVMContractAddressesMap;
  walletBytecode: `0x${string}`;
  gmpAddresses: GmpAddresses;
  usdc: { brand: Brand<'nat'>; denom: Denom };
  gmpFeeInfo: { brand: Brand<'nat'>; denom: Denom };
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
  resolverClient: GuestInterface<ResolverKit['client']>;
  contractAccount: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>;
  transferChannels: {
    noble: IBCConnectionInfo['transferChannel'];
    axelar?: IBCConnectionInfo['transferChannel'];
  };
};

type PortfolioBootstrapContext = PortfolioInstanceContext & {
  makePortfolioKit: () => GuestInterface<PortfolioKit>;
};

type EVMAccounts = Partial<Record<AxelarChain, GMPAccountStatus>>;
type AccountsByChain = {
  agoric: AccountInfoFor['agoric'];
  noble?: AccountInfoFor['noble'];
} & EVMAccounts;

type AssetMovement = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  apply: (
    accounts: AccountsByChain,
    tracer: TraceLogger,
    opts?: OrchestrationOptions,
  ) => Promise<{ srcPos?: Position; destPos?: Position }>;
};

const moveStatus = ({ apply: _a, ...data }: AssetMovement): FlowStep => data;
const errmsg = (err: any) =>
  `${err != null && 'message' in err ? err.message : err}`;

export type TransportDetail<
  How extends string,
  S extends SupportedChain,
  D extends SupportedChain,
  CTX = unknown,
> = {
  how: How;
  connections: { src: S; dest: D }[];
  apply: (
    ctx: CTX,
    amount: NatAmount,
    src: AccountInfoFor[S],
    dest: AccountInfoFor[D],
    opts?: OrchestrationOptions,
  ) => Promise<void>;
};

export type ProtocolDetail<
  P extends YieldProtocol,
  C extends SupportedChain,
  CTX = unknown,
> = {
  protocol: P;
  chains: C[];
  supply: (
    ctx: CTX,
    amount: NatAmount,
    src: AccountInfoFor[C],
    opts?: OrchestrationOptions,
  ) => Promise<void>;
  withdraw: (
    ctx: CTX,
    amount: NatAmount,
    dest: AccountInfoFor[C],
    claim?: boolean,
    opts?: OrchestrationOptions,
  ) => Promise<void>;
};

const { min } = Math;
const range = (n: number) => Array.from(Array(n).keys());
const fullOrder = (length: number): Job['order'] =>
  range(length - 1).map(lo => [lo + 1, [lo]]);

const { toCapData } = makeMarshal(undefined, undefined, {
  serializeBodyFormat: 'smallcaps',
});

/**
 * Deeply compares two serializable (smallcaps) values for equality.
 *
 * @param a - first value
 * @param b - second value
 * @returns true if a and b are deeply equal (naive implementation)
 */
const deepEqual = (a: any, b: any): boolean =>
  toCapData(harden(a)).body === toCapData(harden(b)).body;

type FlowStepPowers = {
  createPendingTx: ResolverKit['client']['createPendingTx'];
  updateTxMeta: ResolverKit['client']['updateTxMeta'];
  updateFirstTx: (txId: TxId) => void;
};

const makeFlowStepPowers = (
  {
    flowId,
    step,
    phase,
    assetMoves,
  }: {
    flowId: number;
    step: number;
    phase: StepPhase;
    assetMoves?: AssetMovement[];
    moveDescs?: MovementDesc[];
  },
  {
    reporter,
    resolverClient,
    phasesForStep,
  }: {
    reporter: GuestInterface<PortfolioKit['reporter']>;
    resolverClient: GuestInterface<ResolverKit['client']>;
    phasesForStep: Map<StepPhase, TxId>[];
  },
): FlowStepPowers => ({
  createPendingTx: (txMeta: PendingTxMeta) =>
    resolverClient.createPendingTx(txMeta),
  updateTxMeta: (txId: TxId, txMeta: PendingTxMeta) =>
    resolverClient.updateTxMeta(txId, txMeta),
  updateFirstTx: (txId: TxId) => {
    phasesForStep[step - 1].set(phase, txId);
    if (!assetMoves) {
      // XXX what can we publish before AssetMovements are initialized?
      return;
    }
    // Publish each move with updated step phase information.
    const movesWithPhases = assetMoves.map((m, i) => ({
      ...moveStatus(m),
      phases: Object.fromEntries(phasesForStep[i].entries()),
    }));
    reporter.publishFlowSteps(flowId, movesWithPhases);
  },
});

// Rename TrafficEntry['dst'] to PendingTxMeta['dest'] for consistency with
// portfolio house rules.
type PendingTxMeta = Omit<TrafficEntry, 'dst'> & {
  type: TxType;
  dest: TrafficEntry['dst'];
  nextTxId?: TxId;
};

type PendingTxsEntry = {
  txId: TxId;
  result: EVow<void>;
  meta: PendingTxMeta;
};

const makeTrafficPublishingReducer = ({
  createPendingTx,
  updateTxMeta,
  updateFirstTx,
}: FlowStepPowers) => {
  return async (thisReport: TrafficReport, priorTxs: PendingTxsEntry[]) => {
    const { traffic: thisTraffic = [] } = thisReport || {};
    if (thisReport == null) {
      // Final report.
      return null;
    }
    const txs = [...priorTxs];
    const firstTxId: TxId | undefined = txs[0]?.txId;
    let nextTxId: TxId | undefined;

    // Iterate backwards through the trafficEntry array, so we can link them via
    // nextTxId.
    await null;
    for (let i = thisTraffic.length - 1; i >= 0; i -= 1) {
      const trafficEntry = thisTraffic[i];

      // Convert the source protocol to a TxType.
      let type: TxType;
      switch (trafficEntry.src?.[0]) {
        case 'ibc': {
          if (i === 0) {
            type = TxType.IBC_FROM_AGORIC;
          } else {
            type = TxType.IBC_FROM_REMOTE;
          }
          break;
        }
        default: {
          // TODO: handle other traffic types.
          type = TxType.UNKNOWN;
          break;
        }
      }

      // Rename the trafficEntry's 'dst' field to 'dest' for consistency with
      // the portfolio house rules.
      const { dst: dest, ...restTrafficEntry } = trafficEntry;
      const newTxMeta: PendingTxMeta = {
        ...restTrafficEntry,
        dest,
        type,
        ...(nextTxId === undefined ? {} : { nextTxId }),
      };
      const txMeta: PendingTxMeta = txs[i]?.meta;
      if (txMeta) {
        if (!deepEqual(newTxMeta, txMeta)) {
          // sync up our pendingTx with the traffic entry.
          const newPendingTxsEntry = { ...txs[i], meta: newTxMeta };
          txs[i] = newPendingTxsEntry;
          updateTxMeta(newPendingTxsEntry.txId, newTxMeta);
          nextTxId = newPendingTxsEntry.txId;
        }
        continue;
      }

      // create new tx entry since it's missing.
      const { txId, result } = await createPendingTx(newTxMeta);
      txs[i] = { txId, result, meta: newTxMeta };
      nextTxId = txId;
    }
    const newFirstTxId = txs[0]?.txId;
    if (newFirstTxId != null && newFirstTxId !== firstTxId) {
      updateFirstTx(newFirstTxId);
    }
    return txs;
  };
};

/**
 * Extract a linked list of FlowErrors from an array of results
 */
export const makeErrorList = (
  results: PromiseSettledResult<void>[],
  moves: Pick<AssetMovement, 'how'>[],
): FlowErrors | undefined =>
  [...results].reverse().reduce((next, r, ix) => {
    if (r.status !== 'rejected') return next;
    const step = moves.length - ix;
    const errs: FlowErrors = {
      step,
      how: moves[step - 1].how,
      error: errmsg(r.reason),
      next,
    };
    return errs;
  }, undefined);

/**
 * **Failure Handling**: Logs failures and publishes status without attempting
 * to unwind already-completed steps. Operators must resolve any partial
 * effects manually.
 */
const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
  flowId: number,
  traceFlow: TraceLogger,
  accounts: AccountsByChain,
  order: Job['order'],
  detail: FlowDetail,
  progressPowers?: {
    resolverClient: GuestInterface<ResolverKit['client']>;
    phasesForStep: Map<StepPhase, TxId>[];
  },
) => {
  const runTask = async (ix: number, running: number[]) => {
    // steps are 1-based. the scheduler is 0-based
    const step = ix + 1;
    const steps = running.map(i => i + 1);
    const move = moves[ix];
    const traceStep = traceFlow.sub(`step${step}`);
    reporter.publishFlowStatus(flowId, {
      state: 'run',
      steps,
      step: min(...steps),
      how: moves[min(...running)].how,
      ...detail,
    });

    // Publish the step's traffic entries as they are produced.
    const progressTracker =
      progressPowers && accounts.agoric.lca.makeProgressTracker();
    const opts = progressTracker && { progressTracker };

    await null;
    try {
      traceStep('starting', moveStatus(move));
      const { amount, how } = move;

      void (
        progressTracker &&
        reduceProgressReports(
          progressTracker,
          makeTrafficPublishingReducer(
            makeFlowStepPowers(
              { flowId, assetMoves: moves, step, phase: 'apply' },
              { reporter, ...progressPowers },
            ),
          ),
          [] as PendingTxsEntry[],
        )
      );

      // Wait for the move to complete.
      const { srcPos, destPos } = await move.apply(accounts, traceStep, opts);

      traceStep('done:', how);

      if (srcPos) {
        srcPos.recordTransferOut(amount);
      }
      if (destPos) {
        destPos.recordTransferIn(amount);
      }

      // TODO(#NNNN): delete the flow storage node
    } catch (err) {
      traceFlow('⚠️ step', step, 'failed', err);
      const failure = moves[step - 1];
      if (failure) {
        traceFlow('failed movement details', moveStatus(failure));
      }
      throw err;
    } finally {
      // Stop reducing progress reports.
      progressTracker?.finish();
    }
  };

  const job: Job = { taskQty: moves.length, order };
  const results = await runJob(job, runTask, traceFlow, (ix, reason) =>
    Error(`predecessor ${ix + 1} failed`, { cause: reason }),
  );
  if (results.some(r => r.status === 'rejected')) {
    const reasons = makeErrorList(results, moves);
    assert(reasons); // guaranteed by results.some(...) above
    reporter.publishFlowStatus(flowId, {
      state: 'fail',
      ...reasons,
      ...detail,
    });
    throw reasons;
  }

  reporter.publishFlowStatus(flowId, { state: 'done', ...detail });
};

export const provideCosmosAccount = async <C extends 'agoric' | 'noble'>(
  orch: Orchestrator,
  chainName: C,
  kit: GuestInterface<PortfolioKit>, // Guest<T>?
  tracePortfolio: TraceLogger,
  opts?: OrchestrationOptions,
): Promise<AccountInfoFor[C]> => {
  await null;
  const traceChain = tracePortfolio.sub(chainName);
  const promiseMaybe = kit.manager.reserveAccount(chainName);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<AccountInfoFor[C]>;
  }

  // We have the map entry reserved - use critical section pattern
  try {
    switch (chainName) {
      case 'noble': {
        const nobleChain = await orch.getChain('noble');
        traceChain('makeAccount()');
        const ica: NobleAccount = await nobleChain.makeAccount(opts);
        traceChain('result:', coerceAccountId(ica.getAddress()));
        const info: AccountInfoFor['noble'] = {
          namespace: 'cosmos',
          chainName: 'noble' as const,
          ica,
        };
        kit.manager.resolveAccount(info);
        return info as AccountInfoFor[C];
      }
      case 'agoric': {
        const agoricChain = await orch.getChain('agoric');
        const lca = await agoricChain.makeAccount(opts);
        const reg = await lca.monitorTransfers(kit.tap);
        traceChain('Monitoring transfers for', lca.getAddress().value);
        const info: AccountInfoFor['agoric'] = {
          namespace: 'cosmos',
          chainName,
          lca,
          reg,
        };
        kit.manager.resolveAccount(info);
        return info as AccountInfoFor[C];
      }
      default:
        throw Error('unreachable');
    }
  } catch (reason) {
    traceChain('failed to make', reason);
    kit.manager.releaseAccount(chainName, reason);
    throw reason;
  }
};

/**
 * Send minimal BLD amount to LCA for registering the forwarding account
 *
 * @param sender - must have at least `amount`
 * @param dest - on Noble chain
 */
const registerNobleForwardingAccount = async (
  sender: LocalAccount,
  dest: CosmosChainAddress,
  forwarding: RegisterAccountMemo['noble']['forwarding'],
  trace: TraceLogger,
  amount: DenomAmount = { denom: 'ubld', value: 1n },
  opts?: OrchestrationOptions,
): Promise<void> => {
  trace('Registering NFA', forwarding, 'from', sender.getAddress().value);

  await sender.transfer(dest, amount, {
    ...opts,
    memo: JSON.stringify({ noble: { forwarding } }),
  });
  trace('NFA registration transfer sent');
};

const getAssetPlaceRefKind = (
  ref: AssetPlaceRef,
): 'pos' | 'accountId' | 'seat' => {
  if (keys(PoolPlaces).includes(ref)) return 'pos';
  if (getKeywordOfPlaceRef(ref)) return 'seat';
  if (getChainNameOfPlaceRef(ref)) return 'accountId';
  throw Fail`bad ref: ${ref}`;
};

type Way =
  | { how: 'localTransfer' }
  | { how: 'withdrawToSeat' }
  | { how: 'IBC'; src: 'agoric'; dest: 'noble' }
  | { how: 'IBC'; src: 'noble'; dest: 'agoric' }
  | { how: 'CCTP'; dest: AxelarChain }
  | { how: 'CCTP'; src: AxelarChain }
  | {
      how: YieldProtocol;
      /** pool we're supplying */
      poolKey: PoolKey;
      /** chain with account where assets will come from */
      src: SupportedChain;
    }
  | {
      how: YieldProtocol;
      /** pool we're withdrawing from */
      poolKey: PoolKey;
      /** chain with account where assets will go */
      dest: SupportedChain;
      claim?: boolean;
    };

// exported only for testing
export const wayFromSrcToDesc = (moveDesc: MovementDesc): Way => {
  const { src } = moveDesc;
  const { dest } = moveDesc;

  const srcKind = getAssetPlaceRefKind(src);
  switch (srcKind) {
    case 'pos': {
      const destName = getChainNameOfPlaceRef(dest);
      if (!destName)
        throw Fail`src pos must have account as dest ${q(moveDesc)}`;
      const poolKey = src as PoolKey;
      const { protocol } = PoolPlaces[poolKey];
      // TODO move this into metadata
      const feeRequired = ['Compound', 'Aave', 'Beefy', 'ERC4626'];
      moveDesc.fee ||
        !feeRequired.includes(protocol) ||
        Fail`missing fee ${q(moveDesc)}`;
      // XXX check that destName is in protocol.chains
      return {
        how: protocol,
        poolKey,
        dest: destName,
        claim: moveDesc.claim,
      };
    }

    case 'seat':
      dest === '@agoric' ||
        Fail`src seat must have agoric account as dest ${q(moveDesc)}`;
      return { how: 'localTransfer' };

    case 'accountId': {
      const srcName = getChainNameOfPlaceRef(src);
      assert(srcName);
      const destKind = getAssetPlaceRefKind(dest);
      switch (destKind) {
        case 'seat':
          return { how: 'withdrawToSeat' }; // XXX check that src is agoric
        case 'accountId': {
          const destName = getChainNameOfPlaceRef(dest);
          assert(destName);
          if (keys(AxelarChain).includes(destName)) {
            srcName === 'noble' || Fail`src for ${q(destName)} must be noble`;
            return { how: 'CCTP', dest: destName as AxelarChain };
          }
          if (keys(AxelarChain).includes(srcName)) {
            destName === 'agoric' ||
              Fail`dest for ${q(srcName)} must be agoric`;
            return { how: 'CCTP', src: srcName as AxelarChain };
          }
          if (srcName === 'agoric' && destName === 'noble') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else if (srcName === 'noble' && destName === 'agoric') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else {
            throw Fail`no route between chains: ${q(moveDesc)}`;
          }
        }
        case 'pos': {
          const poolKey = dest as PoolKey;
          const { protocol } = PoolPlaces[poolKey];
          return { how: protocol, poolKey, src: srcName };
        }
        default:
          throw Fail`unreachable:${destKind} ${dest}`;
      }
    }
    default:
      throw Fail`unreachable: ${srcKind} ${src}`;
  }
};

const stepFlow = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  plan: MovementDesc[] | FundsFlowPlan,
  kit: GuestInterface<PortfolioKit>,
  traceP: TraceLogger,
  flowId: number,
  flowDetail: FlowDetail,
  config?: FlowConfig,
) => {
  const features = config?.features;
  const { flow: moves, order: maybeOrder } = Array.isArray(plan)
    ? { flow: plan }
    : plan;

  const phasesForStep: Map<StepPhase, TxId>[] = moves.map(
    () => new Map<StepPhase, TxId>(),
  );
  const todo: AssetMovement[] = [];

  const publishProvideAccountProgress = (
    progressTracker: ProgressTracker | undefined,
    step: number,
    phase: StepPhase,
  ) =>
    progressTracker &&
    reduceProgressReports(
      progressTracker,
      makeTrafficPublishingReducer(
        makeFlowStepPowers(
          {
            flowId,
            moveDescs: moves,
            step,
            phase,
          },
          {
            reporter,
            resolverClient: ctx.resolverClient,
            phasesForStep,
          },
        ),
      ),
      [] as PendingTxsEntry[],
    );

  const makeEVMCtx = async (
    chain: AxelarChain,
    move: MovementDesc,
    lca: LocalAccount,
    nobleForwardingChannel: `channel-${number}`,
  ) => {
    const [axelar, feeAccount] = await Promise.all([
      orch.getChain('axelar'),
      ctx.contractAccount,
    ]);
    const { denom } = ctx.gmpFeeInfo;
    const fee = { denom, value: move.fee ? move.fee.value : 0n };
    const { axelarIds, gmpAddresses } = ctx;

    const evmCtx: EVMContext = harden({
      addresses: ctx.contracts[chain],
      lca,
      gmpFee: fee,
      gmpChain: axelar,
      axelarIds,
      gmpAddresses,
      resolverClient: ctx.resolverClient,
      feeAccount,
      nobleForwardingChannel,
    });
    return evmCtx;
  };
  const makeEVMPoolCtx = async (
    chain: AxelarChain,
    move: MovementDesc,
    lca: LocalAccount,
    poolKey: PoolKey,
    nobleForwardingChannel: `channel-${number}`,
  ): Promise<EVMContext & { poolKey: PoolKey }> => {
    const evmCtx = await makeEVMCtx(chain, move, lca, nobleForwardingChannel);
    return harden({ ...evmCtx, poolKey });
  };

  const makeEVMProtocolStep = <
    P extends 'Compound' | 'Aave' | 'Beefy' | 'ERC4626',
  >(
    way: Way & { how: P },
    move: MovementDesc,
  ): AssetMovement => {
    // XXX move this check up to wayFromSrcToDesc
    const chainName = 'src' in way ? way.src : way.dest;
    assert(keys(AxelarChain).includes(chainName));
    const evmChain = chainName as AxelarChain;

    const pImpl = {
      Compound: CompoundProtocol,
      Aave: AaveProtocol,
      Beefy: BeefyProtocol,
      ERC4626: ERC4626Protocol,
    }[way.how];

    const { amount } = move;
    const phases =
      features?.useProgressTracker && ({} as Record<StepPhase, TxId>);
    return harden({
      how: way.how,
      amount,
      src: move.src,
      dest: move.dest,
      ...(phases ? { phases } : {}),
      apply: async ({ [evmChain]: gInfo, agoric }, _traceStep, opts) => {
        assert(gInfo, evmChain);
        const accountId: AccountId = `${gInfo.chainId}:${gInfo.remoteAddress}`;
        const { poolKey, how } = way;
        const pos = kit.manager.providePosition(poolKey, how, accountId);
        const { lca } = agoric;
        const evmCtx = await makeEVMPoolCtx(
          evmChain,
          move,
          lca,
          poolKey,
          ctx.transferChannels.noble.counterPartyChannelId,
        );
        traceP('awaiting Wallet contract...', gInfo);
        await gInfo.ready;
        traceP('...Wallet contract ready', gInfo);
        if ('src' in way) {
          await pImpl.supply(evmCtx, amount, gInfo, opts);
          return harden({ destPos: pos });
        } else {
          await pImpl.withdraw(evmCtx, amount, gInfo, way.claim, opts);
          return harden({ srcPos: pos });
        }
      },
    });
  };

  const { reporter } = kit;
  const traceFlow = traceP.sub(`flow${flowId}`);

  const order = maybeOrder || fullOrder(moves.length);

  traceFlow('checking', moves.length, 'moves');
  moves.length > 0 || Fail`moves list must not be empty`;

  for (const [i, move] of entries(moves)) {
    const traceMove = traceFlow.sub(`move${i}`);
    const way = wayFromSrcToDesc(move);
    traceMove('plan', { move, way });
    const { amount } = move;
    switch (way.how) {
      case 'localTransfer': {
        const src = { seat, keyword: 'Deposit' };
        const amounts = harden({ Deposit: amount });
        todo.push({
          how: 'localTransfer',
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ agoric }) => {
            const { lca } = agoric;
            await ctx.zoeTools.localTransfer(src.seat, lca, amounts);
            return {};
          },
        });
        break;
      }

      case 'withdrawToSeat': {
        const amounts = { Cash: amount };
        todo.push({
          how: 'withdrawToSeat',
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ agoric }) => {
            await ctx.zoeTools.withdrawToSeat(agoric.lca, seat, amounts);
            return harden({});
          },
        });
        break;
      }

      case 'IBC': {
        assert(
          (way.src === 'agoric' && way.dest === 'noble') ||
            (way.src === 'noble' && way.dest === 'agoric'),
          `bug in wayFromSrcToDesc`,
        );
        const { how } = way.src === 'agoric' ? agoricToNoble : nobleToAgoric;
        const ctxI = { usdc: ctx.usdc };
        todo.push({
          how,
          amount,
          src: move.src,
          dest: move.dest,
          apply: async ({ agoric, noble }, _tracer, opts) => {
            assert(noble, 'nobleMentioned'); // per nobleMentioned below
            await null;
            if (way.src === 'agoric') {
              await agoricToNoble.apply(ctxI, amount, agoric, noble, opts);
            } else {
              await nobleToAgoric.apply(ctxI, amount, noble, agoric, opts);
            }
            return {};
          },
        });

        break;
      }

      case 'CCTP': {
        const outbound = 'dest' in way;
        const { how } = outbound ? CCTP : CCTPfromEVM;
        const evmChain = outbound ? way.dest : way.src;

        todo.push({
          how,
          amount,
          src: move.src,
          dest: move.dest,
          apply: async (
            { [evmChain]: gInfo, noble, agoric },
            _tracer,
            opts,
          ) => {
            // If an EVM account is in a move, it's available
            // in the accounts arg, along with noble.
            assert(gInfo && noble, evmChain);
            await null;
            if (outbound) {
              await CCTP.apply(ctx, amount, noble, gInfo, opts);
              return {};
            }
            const evmCtx = await makeEVMCtx(
              evmChain,
              move,
              agoric.lca,
              ctx.transferChannels.noble.counterPartyChannelId,
            );
            await CCTPfromEVM.apply(evmCtx, amount, gInfo, agoric, opts);
            return {};
          },
        });

        break;
      }

      case 'USDN': {
        const vault =
          way.poolKey === 'USDNVault' ? VaultType.STAKED : undefined;
        const ctxU = { usdnOut: move?.detail?.usdnOut, vault };

        const isSupply = 'src' in way;

        todo.push({
          how: way.how,
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ noble }, _tracer, opts) => {
            assert(noble); // per nobleMentioned below
            await null;
            const acctId = coerceAccountId(noble.ica.getAddress());
            const pos = kit.manager.providePosition('USDN', 'USDN', acctId);
            if (isSupply) {
              await protocolUSDN.supply(ctxU, amount, noble, opts);
              return harden({ destPos: pos });
            } else {
              await protocolUSDN.withdraw(ctxU, amount, noble, way.claim, opts);
              return harden({ srcPos: pos });
            }
          },
        });

        break;
      }

      case 'Compound':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Compound' }, move));
        break;

      case 'Aave':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Aave' }, move));
        break;

      case 'Beefy':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Beefy' }, move));
        break;

      case 'ERC4626':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'ERC4626' }, move));
        break;

      default:
        throw Fail`unreachable: ${way}`;
    }
  }

  const acctsDone = keys(kit.reader.accountIdByChain());
  const acctsToDo = [
    ...new Set(
      (
        moves
          .map(({ dest }) => getChainNameOfPlaceRef(dest))
          .filter(Boolean) as string[]
      ).filter(ch => !acctsDone.includes(ch)),
    ),
  ];

  traceFlow('provideAccounts', ...acctsToDo);
  reporter.publishFlowStatus(flowId, {
    state: 'run',
    step: 0,
    how: `makeAccounts(${acctsToDo.join(', ')})`,
    ...flowDetail,
  });
  reporter.publishFlowSteps(flowId, todo.map(moveStatus), maybeOrder);

  const agoric = await provideCosmosAccount(
    orch,
    'agoric',
    kit,
    traceFlow,
    // Avoid circular bootstrap dependency: don't use progressTracker here.
  );

  /** run thunk(); on failure, report to vstorage */
  const forChain = async <T>(
    chain: SupportedChain,
    thunk: () => Promise<T>,
  ) => {
    await null;
    try {
      const result = await thunk();
      return result;
    } catch (err) {
      traceFlow('failed to make account for', chain, err);
      reporter.publishFlowStatus(flowId, {
        state: 'fail',
        step: 0,
        how: `makeAccount: ${chain}`,
        error: err && typeof err === 'object' ? err.message : `${err}`,
        ...flowDetail,
      });
      throw err;
    }
  };

  const asEntry = <K, V>(k: K, v: V): [K, V] => [k, v];
  const axelar = await orch.getChain('axelar');
  const infoFor: Record<
    AxelarChain,
    BaseChainInfo<'eip155'>
  > = await deeplyFulfilledObject(
    objectMap(
      fromTypedEntries(
        (keys(AxelarChain) as AxelarChain[]).map(name => [name, name]),
      ),
      async name => {
        const chain = await orch.getChain(name);
        const info = await chain.getChainInfo();
        return harden(info);
      },
    ),
  );

  const evmAcctInfo: Record<string, GMPAccountStatus> = await (async () => {
    const { axelarIds } = ctx;
    const gmpCommon = { chain: axelar, axelarIds };

    const evmChains = keys(AxelarChain) as unknown[];

    const seen = new Set<AxelarChain>();
    const chainToAcctStatusP: [AxelarChain, Promise<GMPAccountStatus>][] =
      moves.flatMap((move, moveIndex) =>
        [move.src, move.dest].flatMap((ref, isDest) => {
          const maybeChain = getChainNameOfPlaceRef(ref);
          if (!evmChains.includes(maybeChain)) return [];
          const chain = maybeChain as AxelarChain;
          if (seen.has(chain)) return [];
          seen.add(chain);

          const gmp = {
            ...gmpCommon,
            fee: move.fee?.value || 0n,
          };

          const progressTracker = features?.useProgressTracker
            ? agoric.lca.makeProgressTracker()
            : undefined;
          const acctP = forChain(chain, async () => {
            await null;
            const opts = progressTracker && { progressTracker };
            void publishProvideAccountProgress(
              progressTracker,
              moveIndex + 1,
              isDest ? 'makeDestAccount' : 'makeSrcAccount',
            );
            const acctInfo = await provideEVMAccount(
              chain,
              infoFor[chain],
              gmp,
              agoric.lca,
              ctx,
              kit,
              opts,
            );

            // Finalize only after the account has settled.
            progressTracker &&
              acctInfo.ready
                .finally(() => progressTracker.finish())
                .catch(() => {});

            return acctInfo;
          });

          return [asEntry(chain, acctP)];
        }),
      );
    const chainToAcctStatus = await Promise.all(
      chainToAcctStatusP.map(async ([chain, acctP]) => {
        const acct = await acctP;
        return [chain, acct] as const;
      }),
    );
    return harden(fromEntries(chainToAcctStatus));
  })();

  traceFlow('EVM accounts pre-computed', keys(evmAcctInfo));
  const nobleMentioned = moves.some(m => [m.src, m.dest].includes('@noble'));
  const nobleInfo = await (nobleMentioned || keys(evmAcctInfo).length > 0
    ? forChain('noble', async () => {
        await null;
        const progressTracker = features?.useProgressTracker
          ? agoric.lca.makeProgressTracker()
          : undefined;
        const opts = progressTracker && { progressTracker };
        try {
          void publishProvideAccountProgress(
            progressTracker,
            SETUP_STEP,
            'makeDestAccount',
          );
          const result = await provideCosmosAccount(
            orch,
            'noble',
            kit,
            traceFlow,
            opts,
          );
          return result;
        } finally {
          progressTracker?.finish();
        }
      })
    : undefined);
  const accounts: AccountsByChain = {
    agoric,
    ...(nobleInfo && { noble: nobleInfo }),
    ...evmAcctInfo,
  };
  traceFlow('accounts for trackFlow', keys(accounts));

  const progressPowers = features?.useProgressTracker
    ? { resolverClient: ctx.resolverClient, phasesForStep }
    : undefined;
  await trackFlow(
    reporter,
    todo,
    flowId,
    traceFlow,
    accounts,
    order,
    flowDetail,
    progressPowers,
  );
  traceFlow('stepFlow done');
};

/**
 * Rebalance portfolio positions between yield protocols.
 * More generally: move assets as instructed by client.
 *
 * **Non-Atomic Operations**: Cross-chain flows are not atomic. If operations
 * fail partway through, assets may be left in intermediate accounts and must
 * be reconciled manually.
 *
 * **Client Recovery**: If rebalancing fails, check flow status in vstorage
 * and call rebalance() again (or another corrective flow) to move assets to
 * desired destinations.
 *
 * **Input Validation**: ASSUME caller validates args
 *
 * @param orch
 * @param ctx
 * @param seat - proposal guarded as per {@link makeProposalShapes}
 * @param offerArgs - guarded as per {@link makeOfferArgsShapes}
 * @param kit
 */
export const rebalance = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
  startedFlow?: ReturnType<
    GuestInterface<PortfolioKit>['manager']['startFlow']
  >,
  config?: FlowConfig,
) => {
  const id = kit.reader.getPortfolioId();
  const traceP = makeTracer('rebalance').sub(`portfolio${id}`);
  const proposal = seat.getProposal() as ProposalType['rebalance'];
  traceP('proposal', proposal.give, proposal.want, offerArgs);
  const { flow, targetAllocation } = offerArgs;

  await null;
  let flowId: number | undefined;
  try {
    if (targetAllocation) {
      kit.manager.setTargetAllocation(targetAllocation);
    }

    if (flow) {
      ({ flowId } =
        startedFlow ?? kit.manager.startFlow({ type: 'rebalance' }, flow));
      await stepFlow(
        orch,
        ctx,
        seat,
        flow,
        kit,
        traceP,
        flowId,
        {
          type: 'rebalance',
        },
        config,
      );
    }

    if (!seat.hasExited()) {
      seat.exit();
    }
  } catch (err) {
    if (!seat.hasExited()) {
      seat.fail(err);
    }
  } finally {
    if (flowId) kit.reporter.finishFlow(flowId);
  }
}) satisfies OrchestrationFlow;

export const parseInboundTransfer = (async (
  _orch: Orchestrator,
  _ctx: PortfolioInstanceContext,
  _packet: VTransferIBCEvent['packet'],
  _kit: PortfolioKit,
): Promise<Awaited<ReturnType<LocalAccount['parseInboundTransfer']>>> => {
  throw Error('obsolete');
}) satisfies OrchestrationFlow;

const eventAbbr = ({ packet }: VTransferIBCEvent) => ({
  destination_channel: packet.destination_channel,
  destination_port: packet.destination_port,
  sequence: packet.sequence,
});

export type OnTransferContext = Pick<
  PortfolioInstanceContext,
  'transferChannels'
> & {
  resolverService: GuestInterface<ResolverKit['service']>;
};

/**
 * Resolve CCTP transfer completion by looking up and settling the transaction.
 *
 * @param parsed - authenticated inbound transfer data (in particular: amount)
 * @param destination - of tx to be resolved
 * @param resolverService
 * @returns Promise<boolean> - true if transaction was found and settled, false otherwise
 */
const resolveCCTPIn = (
  parsed: Awaited<ReturnType<LocalAccount['parseInboundTransfer']>>,
  destination: AccountId,
  resolverService: GuestInterface<ResolverKit['service']>,
  traceUpcall: TraceLogger,
): boolean => {
  traceUpcall('CCTPin', parsed);
  // XXX check parsed.amount is USDC-on-Agoric
  const txId = resolverService.lookupTx({
    type: TxType.CCTP_TO_AGORIC,
    destination,
    amountValue: parsed.amount.value,
  });
  if (!txId) {
    traceUpcall('lookupTx found nothing');
    return false;
  }
  resolverService.settleTransaction({ status: 'success', txId });
  return true;
};

/**
 * Handle notification of transfer in/out of agoric LCA (@agoric)
 *
 * Prompt.
 */
export const onAgoricTransfer = (async (
  orch: Orchestrator,
  ctx: OnTransferContext,
  event: VTransferIBCEvent,
  pKit: PortfolioKit,
): Promise<boolean> => {
  const { reader } = pKit;
  const pId = reader.getPortfolioId();
  const traceUpcall = makeTracer('upcall').sub(`portfolio${pId}`);
  traceUpcall('event', eventAbbr(event));
  if (event.packet.destination_port !== 'transfer') return false;

  const { transferChannels, resolverService } = ctx;
  const { destination_channel: packetDest } = event.packet;
  const lca = reader.getLocalAccount();

  await null;

  switch (packetDest) {
    case transferChannels.noble.channelId: {
      const parsed = await lca.parseInboundTransfer(event.packet);
      return resolveCCTPIn(
        parsed,
        coerceAccountId(lca.getAddress()),
        resolverService,
        traceUpcall,
      );
    }
    default:
      switch (event.packet.source_channel) {
        case transferChannels.axelar?.channelId:
          traceUpcall('ignore packet to axelar');
          break;
        case transferChannels.noble.channelId:
          traceUpcall('ignore packet to noble');
          break;
        default: {
          const parsed = await lca.parseInboundTransfer(event.packet);
          traceUpcall('ignore packet: unknown src/dest', parsed);
        }
      }
      return false;
  }
}) satisfies OrchestrationFlow;

/**
 * Offer handler to make a portfolio and, optionally, open yield positions.
 *
 * **Input Validation**: ASSUME caller validates args
 *
 * @param orch
 * @param ctx
 * @param seat - proposal guarded as per {@link makeProposalShapes}
 * @param offerArgs - guarded as per {@link makeOfferArgsShapes}
 * returns following continuing invitation pattern,
 * with a topic for the portfolio.
 */
export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: PortfolioBootstrapContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'],
  madeKit?: GuestInterface<PortfolioKit>,
  config?: FlowConfig,
) => {
  const features = config?.features;
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  const trace = makeTracer('openPortfolio');
  try {
    const { makePortfolioKit, ...ctxI } = ctx;
    const { inertSubscriber, transferChannels } = ctxI;
    const kit = madeKit ?? makePortfolioKit();
    const id = kit.reader.getPortfolioId();
    const traceP = trace.sub(`portfolio${id}`);
    traceP('portfolio opened');

    // TODO provide a way to recover if any of these provisionings fail
    // SEE https://github.com/Agoric/agoric-private/issues/488
    // Register Noble Forwarding Account (NFA) for CCTP transfers
    {
      const sender = await ctxI.contractAccount;
      const { lca } = await provideCosmosAccount(orch, 'agoric', kit, traceP);
      const opts = features?.useProgressTracker
        ? { progressTracker: lca.makeProgressTracker() }
        : undefined;
      const { ica } = await provideCosmosAccount(
        orch,
        'noble',
        kit,
        traceP,
        opts,
      );
      const forwarding = {
        channel: transferChannels.noble.counterPartyChannelId,
        recipient: lca.getAddress().value,
      };
      const dest = ica.getAddress();
      await registerNobleForwardingAccount(
        sender,
        dest,
        forwarding,
        traceP,
        undefined,
        opts,
      );
    }

    const { give } = seat.getProposal() as ProposalType['openPortfolio'];
    try {
      if (offerArgs.flow) {
        // XXX only for testing recovery?
        await rebalance(orch, ctxI, seat, offerArgs, kit, undefined, config);
      } else if (offerArgs.targetAllocation) {
        kit.manager.setTargetAllocation(offerArgs.targetAllocation);
        if (give.Deposit) {
          await executePlan(
            orch,
            ctxI,
            seat,
            offerArgs,
            kit,
            {
              type: 'deposit',
              amount: give.Deposit,
            },
            undefined,
            config,
          );
        }
      }
    } catch (err) {
      traceP('⚠️ initial flow failed', err);
      if (!seat.hasExited()) seat.fail(err);
    }

    const publicSubscribers: GuestInterface<PublicSubscribers> = {
      portfolio: {
        description: 'Portfolio',
        storagePath: await kit.reader.getStoragePath(),
        subscriber: inertSubscriber as any,
      },
    };
    return harden({
      invitationMakers: kit.invitationMakers,
      publicSubscribers,
    });
    /* c8 ignore start */
  } catch (err) {
    // XXX async flow DX: stack traces don't cross vow boundaries?
    trace('🚨 openPortfolio flow failed', err);
    throw err;
    /* c8 ignore end */
  } finally {
    if (!seat.hasExited()) seat.exit();
  }
}) satisfies OrchestrationFlow;
harden(openPortfolio);

export const makeLCA = (async (orch: Orchestrator): Promise<LocalAccount> => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
}) satisfies OrchestrationFlow;
harden(makeLCA);

/**
 * Offer handler to execute a planned flow of asset movements. It takes
 * responsibility for the `seat` and exits it when done.
 */
export const executePlan = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: { flow?: MovementDesc[] },
  pKit: GuestInterface<PortfolioKit>,
  flowDetail: FlowDetail,
  startedFlow?: ReturnType<
    GuestInterface<PortfolioKit>['manager']['startFlow']
  >,
  config?: FlowConfig,
): Promise<`flow${number}`> => {
  const pId = pKit.reader.getPortfolioId();
  const traceP = makeTracer(flowDetail.type).sub(`portfolio${pId}`);

  // XXX for backwards compatibility, startedFlow may be undefined
  const { stepsP, flowId } =
    startedFlow ?? pKit.manager.startFlow(flowDetail, offerArgs.flow);
  const traceFlow = traceP.sub(`flow${flowId}`);
  if (!offerArgs.flow) traceFlow('waiting for steps from planner');
  await null;
  try {
    // idea: race with seat.getSubscriber()
    const plan = await (stepsP as unknown as Promise<
      MovementDesc[] | FundsFlowPlan
    >); // XXX Guest/Host types UNTIL #9822
    await stepFlow(
      orch,
      ctx,
      seat,
      plan,
      pKit,
      traceP,
      flowId,
      flowDetail,
      config,
    );
    return `flow${flowId}`;
  } catch (err) {
    if (!seat.hasExited()) seat.fail(err);
    pKit.reporter.publishFlowStatus(flowId, {
      state: 'fail',
      step: 0,
      error: errmsg(err),
      how: `await plan`,
      ...flowDetail,
    });
    throw err;
  } finally {
    // The seat must be exited no matter what to avoid leaks
    if (!seat.hasExited()) seat.exit();
    // XXX flow.finish() would eliminate the possibility of sending the wrong one,
    // at the cost of an exo (or Far?)
    pKit.reporter.finishFlow(flowId);
  }
}) satisfies OrchestrationFlow;
harden(executePlan);
