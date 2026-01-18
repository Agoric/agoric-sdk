/**
 * NOTE: This is host side code; can't use await.
 */
import { AmountMath, type Brand, type NatAmount } from '@agoric/ertp';
import {
  makeTracer,
  mustMatch,
  NonNullish,
  type ERemote,
} from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { EMarshaller } from '@agoric/internal/src/marshal/wrap-marshaller.js';
import {
  type AccountId,
  type CaipChainId,
  type IBCConnectionInfo,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type {
  FundsFlowPlan,
  PortfolioContinuingInvitationMaker,
} from '@agoric/portfolio-api';
import {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import type { MapStore } from '@agoric/store';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, X } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { hexToBytes } from '@noble/hashes/utils';
import { generateNobleForwardingAddress } from './noble-fwd-calc.js';
import { predictWalletAddress } from './utils/evm-orch-factory.js';
import { type LocalAccount, type NobleAccount } from './portfolio.flows.js';
import { preparePosition, type Position } from './pos.exo.js';
import type { makeOfferArgsShapes, MovementDesc } from './type-guards-steps.js';
import {
  makeFlowPath,
  makeFlowStepsPath,
  makePortfolioPath,
  PoolKeyShapeExt,
  type EVMContractAddressesMap,
  type FlowDetail,
  type makeProposalShapes,
  type PoolKey,
  type ProposalType,
  type StatusFor,
  type TargetAllocation,
} from './type-guards.js';

const trace = makeTracer('PortExo');

export type AccountInfo = GMPAccountInfo | AgoricAccountInfo | NobleAccountInfo;
export type GMPAccountInfo = {
  namespace: 'eip155';
  chainName: AxelarChain;
  err?: string;
  chainId: CaipChainId;
  remoteAddress: `0x${string}`;
};
type AgoricAccountInfo = {
  namespace: 'cosmos';
  chainName: 'agoric';
  err?: string;
  /** aka `@agoric` */
  lca: LocalAccount;
  /** aka `+agoric` */
  lcaIn: LocalAccount;
  reg: TargetRegistration;
};
type NobleAccountInfo = {
  namespace: 'cosmos';
  chainName: 'noble';
  err?: string;
  ica: NobleAccount;
};

export type AccountInfoFor = Record<AxelarChain, GMPAccountInfo> & {
  agoric: AgoricAccountInfo;
  noble: NobleAccountInfo;
};

type PortfolioKitState = {
  portfolioId: number;
  accountsPending: MapStore<SupportedChain, VowKit<AccountInfo>>;
  accounts: MapStore<SupportedChain, AccountInfo>;
  positions: MapStore<PoolKey, Position>;
  flowsRunning: MapStore<
    number,
    { sync: VowKit<MovementDesc[] | FundsFlowPlan> } & FlowDetail
  >;
  nextFlowId: number;
  targetAllocation?: TargetAllocation;
  policyVersion: number;
  rebalanceCount: number;
  /** CAIP-10 account ID of the authenticated EVM account that opened this portfolio */
  sourceAccountId?: AccountId;
  /** reserved for future use */
  etc: unknown;
};

// a bit more lax than the type to facilitate evolution; hence not a TypedPattern
export const PortfolioStateShape = {
  portfolioId: M.number(),
  accountsPending: M.remotable('accountsPending'),
  accounts: M.remotable('accounts'),
  positions: M.remotable('positions'),
  flowsRunning: M.remotable('flowsRunning'),
  nextFlowId: M.number(),
  targetAllocation: M.opt(M.record()),
  policyVersion: M.number(),
  rebalanceCount: M.number(),
  sourceAccountId: M.opt(M.string()),
  etc: M.any(),
};
harden(PortfolioStateShape);

/**
 * For publishing, represent accounts collection using accountId values
 */
const accountIdByChain = (
  accounts: PortfolioKitState['accounts'],
): Partial<Record<SupportedChain, AccountId>> => {
  const byChain = {};
  for (const [n, info] of accounts.entries()) {
    switch (info.namespace) {
      case 'cosmos':
        switch (info.chainName) {
          case 'agoric':
            byChain[n] = coerceAccountId(info.lca.getAddress());
            break;
          case 'noble':
            byChain[n] = coerceAccountId(info.ica.getAddress());
            break;
          default:
            trace('skipping: unexpected chainName', info);
        }
        break;
      case 'eip155':
        byChain[n] = `${info.chainId}:${info.remoteAddress}`;
        break;
      default:
        assert.fail(X`no such type: ${info}`);
    }
  }
  return harden(byChain);
};

const { fromEntries } = Object;

/** publish everyting about flowsRunning but the sync VowKit */
const makeFlowsRunningRecord = (
  flowsRunning: PortfolioKitState['flowsRunning'],
): StatusFor['portfolio']['flowsRunning'] =>
  harden(
    fromEntries(
      [...flowsRunning.entries()].map(([num, { sync: _s, ...data }]) => [
        `flow${num}`,
        data,
      ]),
    ),
  );

export type PublishStatusFn = <K extends keyof StatusFor>(
  path: string[],
  status: StatusFor[K],
) => void;

/** avoid circular reference */
type PortfolioKitCycleBreaker = unknown;

export const preparePortfolioKit = (
  zone: Zone,
  {
    rebalance,
    executePlan,
    onAgoricTransfer,
    transferChannels,
    eip155ChainIdToAxelarChain,
    contracts,
    walletBytecode,
    proposalShapes,
    offerArgsShapes,
    vowTools,
    zcf,
    portfoliosNode,
    marshaller,
    usdcBrand,
  }: {
    rebalance: (
      seat: ZCFSeat,
      offerArgs: unknown,
      kit: PortfolioKitCycleBreaker,
      startedFlow?: { stepsP: Vow<MovementDesc[]>; flowId: number },
    ) => Vow<unknown>;
    executePlan: (
      seat: ZCFSeat,
      offerArgs: unknown,
      kit: PortfolioKitCycleBreaker,
      flowDetail: FlowDetail,
      startedFlow?: { stepsP: Vow<MovementDesc[]>; flowId: number },
      config?: unknown,
      options?: unknown,
    ) => Vow<unknown>;
    onAgoricTransfer: (
      event: VTransferIBCEvent,
      kit: PortfolioKitCycleBreaker,
    ) => Vow<boolean>;
    transferChannels: {
      noble: IBCConnectionInfo['transferChannel'];
      axelar?: IBCConnectionInfo['transferChannel'];
    };
    eip155ChainIdToAxelarChain: Record<`${number}`, AxelarChain>;
    contracts: EVMContractAddressesMap;
    walletBytecode: `0x${string}`;
    proposalShapes: ReturnType<typeof makeProposalShapes>;
    offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>;
    vowTools: VowTools;
    zcf: ZCF;
    portfoliosNode: ERemote<StorageNode>;
    marshaller: ERemote<EMarshaller>;
    usdcBrand: Brand<'nat'>;
  },
) => {
  // Ephemeral node cache
  // XXX collecting flow nodes is TBD
  const nodes = new Map<string, ERemote<StorageNode>>();
  const providePathNode = (segments: string[]): ERemote<StorageNode> => {
    if (segments.length === 0) return portfoliosNode;
    const path = segments.join('.');
    if (nodes.has(path)) return nodes.get(path)!;
    const parent = providePathNode(segments.slice(0, -1));
    const node = E(parent).makeChildNode(segments.at(-1)!);
    nodes.set(path, node);
    return node;
  };

  // TODO: cache slotIds from the board #11688
  const publishStatus: PublishStatusFn = (path, status): void => {
    const node = providePathNode(path);
    // Don't await, just writing to vstorage.
    void E.when(E(marshaller).toCapData(status), capData =>
      E(node).setValue(JSON.stringify(capData)),
    );
  };

  const usdcEmpty = AmountMath.makeEmpty(usdcBrand);
  const emptyTransferState = harden({
    totalIn: usdcEmpty,
    totalOut: usdcEmpty,
    netTransfers: usdcEmpty,
  });

  const makePosition = preparePosition(zone, emptyTransferState, publishStatus);

  return zone.exoClassKit(
    'Portfolio',
    undefined /* TODO {
      tap: M.interface('tap', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      reader: ReaderI,
      manager: ManagerI,
      rebalanceHandler: OfferHandlerI,
      invitationMakers: M.interface('invitationMakers', {
        Rebalance: M.callWhen().returns(InvitationShape),
      })}*/,
    ({
      portfolioId,
      sourceAccountId,
    }: {
      portfolioId: number;
      sourceAccountId?: AccountId;
    }): PortfolioKitState => {
      return {
        portfolioId,
        nextFlowId: 1,
        flowsRunning: zone.detached().mapStore('flowsRunning', {
          keyShape: M.number(),
          valueShape: M.record(),
        }),
        accounts: zone.detached().mapStore('accounts', {
          keyShape: M.string(),
          valueShape: M.or(
            M.remotable('Account'),
            // XXX for EVM/GMP account info
            M.record(),
          ),
        }),
        accountsPending: zone.detached().mapStore('accountsPending'),
        // NEEDSTEST: for forgetting to use detached()
        positions: zone.detached().mapStore('positions', {
          keyShape: PoolKeyShapeExt,
          valueShape: M.remotable('Position'),
        }),
        targetAllocation: undefined,
        policyVersion: 0,
        rebalanceCount: 0,
        sourceAccountId,
        etc: undefined,
      };
    },
    {
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          // onAgoricTransfer is prompt
          return vowTools.when(onAgoricTransfer(event, this.facets));
        },
      },
      parseInboundTransferWatcher: {
        onRejected(_reason) {
          Fail`vestigial`;
        },
        async onFulfilled(_parsed) {
          Fail`vestigial`;
        },
      },
      reader: {
        /**
         * Get the LocalAccount for the current chain.
         *
         * We rely on the portfolio creator internally adding the Agoric
         * account before making the PortfolioKit available to any clients.
         */
        getLocalAccount(): LocalAccount {
          const { accounts } = this.state;
          const info = accounts.get('agoric');
          assert.equal(info?.chainName, 'agoric');
          return info.lca;
        },
        getStoragePath() {
          const { portfolioId } = this.state;
          const node = providePathNode(makePortfolioPath(portfolioId));
          return vowTools.asVow(() => E(node).getPath());
        },
        getPortfolioId() {
          return this.state.portfolioId;
        },
        getGMPInfo(chainName: AxelarChain) {
          const { accounts } = this.state;
          return accounts.get(chainName) as GMPAccountInfo;
        },
        getTargetAllocation() {
          return this.state.targetAllocation;
        },
        accountIdByChain() {
          const { accounts } = this.state;
          return accountIdByChain(accounts);
        },
        /**
         * Returns the CAIP-10 account ID of the authenticated EVM account
         * that opened this portfolio, or undefined if not set.
         */
        getSourceAccountId(): AccountId | undefined {
          return this.state.sourceAccountId;
        },
      },
      reporter: {
        publishStatus() {
          const {
            portfolioId,
            positions,
            accounts,
            nextFlowId,
            flowsRunning,
            targetAllocation,
            accountsPending,
            policyVersion,
            rebalanceCount,
            sourceAccountId,
          } = this.state;

          const agoricAux = (): Pick<
            StatusFor['portfolio'],
            'depositAddress' | 'nobleForwardingAddress'
          > => {
            const { lca, lcaIn } = accounts.get('agoric') as AgoricAccountInfo;
            const { value: recipient } = lca.getAddress();
            const { value: depositAddress } = lcaIn.getAddress();
            const nobleForwardingAddress = generateNobleForwardingAddress(
              transferChannels.noble.counterPartyChannelId,
              recipient,
            );
            return { depositAddress, nobleForwardingAddress };
          };

          publishStatus(makePortfolioPath(portfolioId), {
            positionKeys: [...positions.keys()],
            flowCount: nextFlowId - 1,
            flowsRunning: makeFlowsRunningRecord(flowsRunning),
            accountIdByChain: accountIdByChain(accounts),
            ...(accounts.has('agoric') ? agoricAux() : {}),
            ...(targetAllocation && { targetAllocation }),
            ...(sourceAccountId && { sourceAccountId }),
            accountsPending: [...accountsPending.keys()],
            policyVersion,
            rebalanceCount,
          });
        },
        finishFlow(flowId) {
          const { flowsRunning } = this.state;
          flowsRunning.delete(flowId);
          this.facets.reporter.publishStatus();
        },
        // XXX collecting flow nodes is TBD
        publishFlowSteps(
          id: number,
          steps: StatusFor['flowSteps'],
          order?: FundsFlowPlan['order'],
        ) {
          const { portfolioId } = this.state;
          publishStatus(makeFlowStepsPath(portfolioId, id, 'steps'), steps);
          if (order) {
            publishStatus(makeFlowStepsPath(portfolioId, id, 'order'), order);
          }
        },
        publishFlowStatus(id: number, status: StatusFor['flow']) {
          const { portfolioId } = this.state;
          publishStatus(makeFlowPath(portfolioId, id), status);
        },
      },
      planner: {
        submitVersion(versionPre: number, countPre: number) {
          const { policyVersion, rebalanceCount } = this.state;
          policyVersion === versionPre ||
            Fail`expected policyVersion ${policyVersion}; got ${versionPre}`;
          rebalanceCount === countPre ||
            Fail`expected rebalanceCount ${rebalanceCount}; got ${countPre}`;
          this.state.rebalanceCount += 1;
          this.facets.reporter.publishStatus();
        },
        resolveFlowPlan(flowId: number, steps: MovementDesc[] | FundsFlowPlan) {
          const { flowsRunning } = this.state;
          const detail = flowsRunning.get(flowId);
          detail.sync.resolver.resolve(steps);
        },
        rejectFlowPlan(flowId: number, reason: string) {
          const { flowsRunning } = this.state;
          if (!flowsRunning.has(flowId)) {
            const traceFlow = trace
              .sub(`portfolio${this.state.portfolioId}`)
              .sub(`flow${flowId}`);
            traceFlow('flowsRunning has nothing to reject');
            return;
          }
          const detail = flowsRunning.get(flowId);
          detail.sync.resolver.reject(new Error(reason));
        },
      },
      /**
       * Manages a cooperative reservation protocol for per-chain accounts.
       *
       * For each chain, callers coordinate through four states:
       *   'new' | 'failed' — caller holds the reservation
       *   'pending'        — another caller is initializing
       *   'ok'             — initialization finished
       *
       * When holding the reservation ('new' or 'failed'), the caller must run a
       * try/catch critical section and finish with exactly one of:
       *   resolveAccount(info)  // success
       *   releaseAccount(chain, reason)  // failure
       *
       * initAccountInfo(info) is optional before the terminal call.
       */
      manager: {
        /**
         * Legacy wrapper for {@link reserveAccountState}.
         * @see reserveAccountState
         */
        reserveAccount<C extends SupportedChain>(
          chainName: C,
        ): undefined | Vow<AccountInfoFor[C]> {
          const { ready, state } =
            this.facets.manager.reserveAccountState(chainName);
          return state === 'new' ? undefined : ready;
        },
        /**
         * Returns the current reservation state for the given chain,
         * along with a vow that resolves when initialization completes.
         *
         * @see manager — for the full reservation protocol and caller obligations.
         */
        reserveAccountState<C extends SupportedChain>(
          chainName: C,
        ): {
          state: 'new' | 'pending' | 'ok' | 'failed';
          ready: Vow<AccountInfoFor[C]>;
        } {
          const traceChain = trace
            .sub(`portfolio${this.state.portfolioId}`)
            .sub(chainName);
          traceChain('reserveAccount');
          const { accounts, accountsPending } = this.state;
          if (accountsPending.has(chainName)) {
            const state = 'pending';
            traceChain('state', state);
            const val = accountsPending.get(chainName);
            return { ready: val.vow as Vow<AccountInfoFor[C]>, state };
          }
          if (accounts.has(chainName)) {
            const infoAny = accounts.get(chainName);
            assert.equal(infoAny.chainName, chainName);
            const info = infoAny as AccountInfoFor[C];
            const state = info.err ? 'failed' : 'ok';
            traceChain('state', state);
            const ready = vowTools.asVow(async () => info);
            return { ready, state };
          }
          const state = 'new';
          traceChain('state', state);
          const pending: VowKit<AccountInfoFor[C]> = vowTools.makeVowKit();
          vowTools.watch(pending.vow, this.facets.accountWatcher, chainName);
          accountsPending.init(chainName, pending);
          this.facets.reporter.publishStatus();
          return { ready: pending.vow as Vow<AccountInfoFor[C]>, state };
        },
        /**
         * Optionally record preliminary account info (e.g., predicted addresses).
         * Valid only when the caller holds the reservation (`'new'` or `'failed'`).
         */
        initAccountInfo(info: AccountInfo) {
          const { accounts, portfolioId } = this.state;
          const traceChain = trace
            .sub(`portfolio${portfolioId}`)
            .sub(info.chainName);
          traceChain('accounts.init', info);
          accounts.init(info.chainName, info);
          this.facets.reporter.publishStatus();
        },
        /**
         * Terminal success action for the reservation protocol.
         * Resolves any pending vow and commits stable account info.
         * Valid only when the caller holds the reservation.
         */
        resolveAccount(info: AccountInfo) {
          const { accounts, accountsPending, portfolioId } = this.state;
          const traceChain = trace
            .sub(`portfolio${portfolioId}`)
            .sub(info.chainName);

          if (accountsPending.has(info.chainName)) {
            const pending = accountsPending.get(info.chainName);
            traceChain('accountsPending.resolve');
            pending.resolver.resolve(info);
          }
          if (accounts.has(info.chainName)) {
            const { err: _, ...noErr } = accounts.get(info.chainName);
            traceChain('accounts.set');
            accounts.set(info.chainName, noErr);
          } else {
            traceChain('accounts.init');
            accounts.init(info.chainName, info);
          }
          this.facets.reporter.publishStatus();
        },
        /**
         * Terminal failure action for the reservation protocol.
         * Rejects any pending vow and marks the account as failed.
         * Valid only when the caller holds the reservation.
         */
        releaseAccount(chainName: SupportedChain, reason: unknown) {
          trace('releaseAccount', chainName, reason);
          const { accounts, accountsPending } = this.state;
          if (accounts.has(chainName)) {
            const info = accounts.get(chainName);
            accounts.set(chainName, { ...info, err: `${reason}` });
          }
          if (accountsPending.has(chainName)) {
            const vow = accountsPending.get(chainName);
            vow.resolver.reject(reason);
            accountsPending.delete(chainName);
            this.facets.reporter.publishStatus();
          }
        },
        /**
         * Start a flow of asset movements. Reserves a flowId and records updates vstorage.
         *
         * NB: `flowId` is a counter, not the key in vstorage.
         */
        startFlow(detail: FlowDetail, steps?: MovementDesc[]) {
          const { nextFlowId: flowId, flowsRunning } = this.state;
          this.state.nextFlowId = flowId + 1;
          const sync: VowKit<MovementDesc[]> = vowTools.makeVowKit();
          if (steps) sync.resolver.resolve(steps);
          flowsRunning.init(flowId, harden({ sync, ...detail }));
          this.facets.reporter.publishStatus();
          return { stepsP: sync.vow, flowId };
        },
        providePosition(
          poolKey: PoolKey,
          protocol: YieldProtocol,
          accountId: AccountId,
        ): Position {
          const { positions } = this.state;
          if (positions.has(poolKey)) {
            return positions.get(poolKey);
          }
          const { portfolioId } = this.state;
          const position = makePosition(
            portfolioId,
            poolKey,
            protocol,
            accountId,
          );
          positions.init(poolKey, position);
          position.publishStatus();
          this.facets.reporter.publishStatus();
          return position;
        },
        setTargetAllocation(allocation: TargetAllocation) {
          this.state.targetAllocation = allocation;
          this.facets.manager.incrPolicyVersion();
        },
        incrPolicyVersion() {
          this.state.policyVersion += 1;
          this.state.rebalanceCount = 0;
          this.facets.reporter.publishStatus();
        },
      },
      accountWatcher: {
        onFulfilled(info: AccountInfo, chainName: AxelarChain) {
          const { accountsPending } = this.state;
          if (accountsPending.has(chainName)) {
            accountsPending.delete(chainName);
          }
          this.facets.reporter.publishStatus();
          return info;
        },
        onRejected(reason, chainName) {
          const { accountsPending, portfolioId } = this.state;
          const traceChain = trace
            .sub(`portfolio${portfolioId}`)
            .sub(chainName);
          traceChain('rejected', reason);
          if (accountsPending.has(chainName)) {
            accountsPending.delete(chainName);
          }
          this.facets.reporter.publishStatus();
        },
      },
      evmHandler: {
        getReaderFacet() {
          return this.facets.reader;
        },
        /**
         * Initiate a deposit from an EVM account using Permit2.
         *
         * Requires that `sourceAccountId` was set when the portfolio was opened
         * (i.e., the portfolio was opened from EVM via `openPortfolioFromEVM`).
         *
         * The permit's owner must match the address portion of `sourceAccountId`,
         * though the chain can be different (enabling deposits from multiple chains).
         *
         * @param depositDetails - The permit2 deposit details including chainId, token, amount, spender, and permit2Payload
         */
        deposit(depositDetails: PermitDetails) {
          const { sourceAccountId: maybeSourceAccountId, accounts } =
            this.state;
          maybeSourceAccountId ||
            Fail`deposit requires sourceAccountId to be set (portfolio must be opened from EVM)`;
          const sourceAccountId = NonNullish(maybeSourceAccountId);

          // Extract owner address from sourceAccountId (CAIP-10 format: eip155:{chainId}:{address})
          const sourceParts = sourceAccountId.split(':');
          const sourceAddress = sourceParts[2];
          sourceAddress ||
            Fail`invalid sourceAccountId format: ${sourceAccountId}`;

          const permitOwner = depositDetails.permit2Payload.owner.toLowerCase();
          permitOwner === sourceAddress.toLowerCase() ||
            Fail`permit owner ${permitOwner} does not match portfolio source address ${sourceAddress}`;

          const fromChain =
            eip155ChainIdToAxelarChain[`${Number(depositDetails.chainId)}`];
          fromChain ||
            Fail`no Axelar chain for EIP-155 chainId ${depositDetails.chainId}`;

          // For deposits, spender must be the portfolio's smart wallet address.
          // If the account already exists, use the stored address.
          // If not, predict the address using `factory` (which will be used to create it).
          let expectedSpender: string;
          if (accounts.has(fromChain)) {
            const gmpInfo = accounts.get(fromChain) as GMPAccountInfo;
            expectedSpender = gmpInfo.remoteAddress.toLowerCase();
          } else {
            // Account doesn't exist yet - predict address using factory
            // (provideEVMAccount uses 'makeAccount' mode which uses factory)
            const agoricInfo = accounts.get('agoric') as AgoricAccountInfo;
            const lcaAddress = agoricInfo.lca.getAddress().value;
            const chainContracts = contracts[fromChain];
            expectedSpender = predictWalletAddress({
              owner: lcaAddress,
              factoryAddress: chainContracts.factory,
              gatewayAddress: chainContracts.gateway,
              gasServiceAddress: chainContracts.gasService,
              walletBytecode: hexToBytes(walletBytecode.replace(/^0x/, '')),
            }).toLowerCase();
          }

          const actualSpender = depositDetails.spender.toLowerCase();
          actualSpender === expectedSpender ||
            Fail`permit spender ${actualSpender} does not match portfolio account ${expectedSpender}`;

          // Create an empty seat for the deposit flow
          const { zcfSeat: seat } = zcf.makeEmptySeatKit();

          // Build the flow detail
          const amount = AmountMath.make(usdcBrand, depositDetails.amount);
          const flowDetail: FlowDetail = { type: 'deposit', amount, fromChain };
          const startedFlow = this.facets.manager.startFlow(flowDetail);

          // Execute the plan with evmDepositDetail
          void executePlan(
            seat,
            {},
            this.facets,
            flowDetail,
            startedFlow,
            undefined, // config - use default
            { evmDepositDetail: { ...depositDetails, fromChain } },
          );

          return `flow${startedFlow.flowId}`;
        },
        /**
         * Initiate a rebalance with a new target allocation.
         *
         * Sets the target allocation and starts a rebalance flow.
         *
         * @param allocation - Target allocation mapping from InstrumentId to portion
         */
        simpleRebalance(allocation: TargetAllocation) {
          const { manager } = this.facets;
          manager.setTargetAllocation(allocation);
          const flowDetail: FlowDetail = { type: 'rebalance' };
          const startedFlow = manager.startFlow(flowDetail);
          return `flow${startedFlow.flowId}`;
        },
        /**
         * Initiate a rebalance using the existing target allocation.
         *
         * The target allocation must have been previously set via
         * `SimpleRebalance()` or when opening the portfolio.
         */
        rebalance() {
          const { targetAllocation } = this.state;
          targetAllocation ||
            Fail`rebalance requires targetAllocation to be set (use SimpleRebalance instead)`;
          const flowDetail: FlowDetail = { type: 'rebalance' };
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          return `flow${startedFlow.flowId}`;
        },
        /**
         * Initiate a withdrawal to the source EVM account.
         *
         * Requires that `sourceAccountId` was set when the portfolio was opened
         * (i.e., the portfolio was opened from EVM via `openPortfolioFromEVM`).
         *
         * @param amount - The amount to withdraw
         * @param opts - Optional parameters
         * @param opts.toChain - Override destination chain (defaults to chain from sourceAccountId)
         */
        withdraw(amount: NatAmount, opts?: { toChain?: SupportedChain }) {
          const { sourceAccountId } = this.state;
          sourceAccountId ||
            Fail`withdraw requires sourceAccountId to be set (portfolio must be opened from EVM)`;

          // Parse the CAIP-10 ID to extract the destination chain
          // Format: eip155:{chainId}:{address}
          // The planner will use this to route the withdrawal
          const toChain = opts?.toChain;

          const flowDetail: FlowDetail = {
            type: 'withdraw',
            amount,
            ...(toChain && { toChain }),
          };
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          return `flow${startedFlow.flowId}`;
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, offerArgsShapes.rebalance);
          const startedFlow = this.facets.manager.startFlow(
            { type: 'rebalance' },
            offerArgs.flow,
          );

          // This flow does its own error handling and always exits the seat
          void rebalance(seat, offerArgs, this.facets, startedFlow);
          return `flow${startedFlow.flowId}`;
        },
      },
      depositHandler: {
        handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, offerArgsShapes.deposit);
          const proposal =
            seat.getProposal() as unknown as ProposalType['deposit'];
          const flowDetail = {
            type: 'deposit',
            amount: proposal.give.Deposit,
          } as FlowDetail;
          const startedFlow = this.facets.manager.startFlow(
            flowDetail,
            offerArgs.flow,
          );
          // This flow does its own error handling and always exits the seat
          void executePlan(
            seat,
            offerArgs,
            this.facets,
            flowDetail,
            startedFlow,
          );
          return `flow${startedFlow.flowId}`;
        },
      },
      simpleRebalanceHandler: {
        handle(seat: ZCFSeat, offerArgs: unknown) {
          // XXX offerArgs.flow shouldn't be allowed
          mustMatch(offerArgs, offerArgsShapes.rebalance);
          if (offerArgs.targetAllocation) {
            const { manager } = this.facets;
            manager.setTargetAllocation(offerArgs.targetAllocation);
          }
          const flowDetail = {
            type: 'rebalance',
          } as FlowDetail;
          const startedFlow = this.facets.manager.startFlow(
            flowDetail,
            offerArgs.flow,
          );
          // This flow does its own error handling and always exits the seat
          void executePlan(
            seat,
            offerArgs,
            this.facets,
            flowDetail,
            startedFlow,
          );
          return `flow${startedFlow.flowId}`;
        },
      },
      withdrawHandler: {
        handle(seat: ZCFSeat) {
          const proposal =
            seat.getProposal() as unknown as ProposalType['withdraw'];
          const flowDetail = {
            type: 'withdraw',
            amount: proposal.want.Cash,
          } as FlowDetail;
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          // This flow does its own error handling and always exits the seat
          void executePlan(seat, {}, this.facets, flowDetail, startedFlow);
          return `flow${startedFlow.flowId}`;
        },
      },

      invitationMakers: {
        Rebalance() {
          const { rebalanceHandler } = this.facets;
          return zcf.makeInvitation(
            rebalanceHandler,
            'rebalance',
            undefined,
            proposalShapes.rebalance,
          );
        },
        Withdraw() {
          const { withdrawHandler } = this.facets;
          return zcf.makeInvitation(
            withdrawHandler,
            'withdraw',
            undefined,
            proposalShapes.withdraw,
          );
        },
        Deposit() {
          const { depositHandler } = this.facets;
          return zcf.makeInvitation(
            depositHandler,
            'deposit',
            undefined,
            proposalShapes.deposit,
          );
        },
        SimpleRebalance() {
          const { simpleRebalanceHandler } = this.facets;
          return zcf.makeInvitation(
            simpleRebalanceHandler,
            'simpleRebalance',
            undefined,
            proposalShapes.rebalance,
          );
        },
      } satisfies Record<PortfolioContinuingInvitationMaker, any> &
        ThisType<any>,
    },
    {
      stateShape: PortfolioStateShape,
      finish({ facets, state }) {
        facets.reporter.publishStatus();
        const { portfolioId } = state;
        const [addPortfolio] = makePortfolioPath(portfolioId);
        publishStatus([], { addPortfolio });
      },
    },
  );
};
harden(preparePortfolioKit);

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
