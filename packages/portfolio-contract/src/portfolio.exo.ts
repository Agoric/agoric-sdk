/**
 * NOTE: This is host side code; can't use await.
 */
import { AmountMath, type Brand } from '@agoric/ertp';
import { makeTracer, mustMatch, type ERemote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { EMarshaller } from '@agoric/internal/src/marshal/wrap-marshaller.js';
import { hexToBytes } from '@noble/hashes/utils';
import {
  type AccountId,
  type Caip10Record,
  type CaipChainId,
  type IBCConnectionInfo,
} from '@agoric/orchestration';
import {
  coerceAccountId,
  parseAccountId,
  parseAccountIdArg,
  sameEvmAddress,
} from '@agoric/orchestration/src/utils/address.js';
import type {
  FundsFlowPlan,
  FlowConfig,
  PortfolioContinuingInvitationMaker,
  PortfolioRemoteAccountState,
} from '@agoric/portfolio-api';
import {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type {
  YmaxFullDomain,
  TargetAllocation as EIP712Allocation,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { PermitDetails } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import type { MapStore } from '@agoric/store';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { Fail, X, bare } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import type { Address as EVMAddress } from 'abitype';
import { generateNobleForwardingAddress } from './noble-fwd-calc.js';
import { type LocalAccount, type NobleAccount } from './portfolio.flows.js';
import { preparePosition, type Position } from './pos.exo.js';
import type { makeOfferArgsShapes, MovementDesc } from './type-guards-steps.js';
import {
  type EVMContractAddressesMap,
  makeFlowPath,
  makeFlowStepsPath,
  makePortfolioPath,
  PoolKeyShapeExt,
  type FlowDetail,
  type makeProposalShapes,
  type PoolKey,
  type ProposalType,
  type StatusFor,
  type TargetAllocation,
} from './type-guards.js';
import { predictWalletAddress } from './utils/evm-orch-factory.js';
import { predictRemoteAccountAddress } from './utils/evm-orch-router.ts';
import type { EVMContractAddresses } from './portfolio.contract.ts';

const trace = makeTracer('PortExo');

const DEFAULT_TO_ROUTER = false;

const useRouter = (addresses: EVMContractAddresses) => {
  if (
    !addresses.remoteAccountRouter ||
    !(addresses.remoteAccountRouter.length > 2)
  ) {
    return false;
  }
  if (!addresses.depositFactory || !(addresses.depositFactory.length > 2)) {
    return true;
  }

  return DEFAULT_TO_ROUTER;
};

export type AccountInfo = GMPAccountInfo | AgoricAccountInfo | NobleAccountInfo;
export type GMPAccountInfo = {
  namespace: 'eip155';
  chainName: AxelarChain;
  err?: string;
  chainId: CaipChainId;
  remoteAddress: EVMAddress;
  // routerAddress only present if useRouter set on portfolio
  routerAddress?: EVMAddress;
  // transferringFromRouter only present while router ownership transfer in progress
  transferringFromRouter?: EVMAddress;
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

export const makeValidateOpenMessageRepresentativeInfo =
  (
    eip155ChainIdToAxelarChain: {
      [chainId in `${number | bigint}`]?: AxelarChain;
    },
    contracts: EVMContractAddressesMap,
  ) =>
  (chainId: number | bigint, representativeContract: EVMAddress) => {
    const fromChain = eip155ChainIdToAxelarChain[`${chainId}`];
    if (!fromChain) {
      throw Fail`no Axelar chain for EIP-155 chainId ${chainId}`;
    }
    const addresses = contracts[fromChain];

    (addresses.remoteAccountRouter &&
      addresses.remoteAccountRouter.length > 2 &&
      sameEvmAddress(representativeContract, addresses.remoteAccountRouter)) ||
      (addresses.depositFactory &&
        addresses.depositFactory.length > 2 &&
        sameEvmAddress(representativeContract, addresses.depositFactory)) ||
      Fail`${representativeContract} does not match any supported representative address ${[addresses.remoteAccountRouter, addresses.depositFactory].filter(address => address && address.length > 2)} for chain ${fromChain}`;
  };

/**
 * For publishing, represent accounts collection using accountId values
 */
const accountIdByChain = (
  accounts: PortfolioKitState['accounts'],
): StatusFor['portfolio']['accountIdByChain'] => {
  const byChain: Partial<Record<SupportedChain, AccountId>> = {};
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

/**
 * For publishing, represent accounts collection using accountId values
 */
const accountStateByChain = (
  accounts: PortfolioKitState['accounts'],
  pending: PortfolioKitState['accountsPending'],
) => {
  const byChain: Partial<Record<SupportedChain, PortfolioRemoteAccountState>> =
    {};
  for (const [n, info] of accounts.entries()) {
    let accountDetails:
      | { chainId: CaipChainId; address: string; router?: EVMAddress }
      | undefined;

    switch (info.namespace) {
      case 'cosmos': {
        let cosmosAccountDetails: Caip10Record | undefined;
        switch (info.chainName) {
          case 'agoric':
            cosmosAccountDetails = parseAccountIdArg(info.lca.getAddress());
            break;
          case 'noble':
            cosmosAccountDetails = parseAccountIdArg(info.ica.getAddress());
            break;
          default:
            trace('skipping: unexpected chainName', info);
        }
        if (cosmosAccountDetails) {
          accountDetails = {
            chainId: `${cosmosAccountDetails.namespace}:${cosmosAccountDetails.reference}`,
            address: cosmosAccountDetails.accountAddress,
          };
        }
        break;
      }
      case 'eip155': {
        const { chainId, remoteAddress, routerAddress } = info;
        accountDetails = {
          chainId,
          address: remoteAddress,
          ...(routerAddress ? { router: routerAddress } : {}),
        };
        break;
      }
      default:
        assert.fail(X`no such type: ${info}`);
    }

    const isPending = pending.has(n);
    const hasError = !!info.err;

    if (accountDetails) {
      // XXX: handle transferring state when we implement support for it
      byChain[n] = {
        state: hasError ? 'failed' : isPending ? 'provisioning' : 'active',
        ...(accountDetails || {}),
      };
    } else {
      byChain[n] = { state: 'unknown' };
    }
  }
  for (const chain of pending.keys()) {
    if (accounts.has(chain)) continue;
    byChain[chain] = { state: 'provisioning' };
  }
  return harden(byChain) as StatusFor['portfolio']['accountStateByChain'];
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
    walletBytecode,
    proposalShapes,
    offerArgsShapes,
    vowTools,
    zcf,
    portfoliosNode,
    marshaller,
    usdcBrand,
    eip155ChainIdToAxelarChain,
    contracts,
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
      config?: FlowConfig,
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
    walletBytecode: `0x${string}`;
    proposalShapes: ReturnType<typeof makeProposalShapes>;
    offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>;
    vowTools: VowTools;
    zcf: ZCF;
    portfoliosNode: ERemote<StorageNode>;
    marshaller: ERemote<EMarshaller>;
    usdcBrand: Brand<'nat'>;
    eip155ChainIdToAxelarChain: {
      [chainId in `${number | bigint}`]?: AxelarChain;
    };
    contracts: EVMContractAddressesMap;
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
        useRouterForChain(chainName: AxelarChain) {
          const { accounts } = this.state;
          if (accounts.has(chainName)) {
            // There is already a remote account, must keep the same interaction kind
            const info = accounts.get(chainName) as GMPAccountInfo;
            return !!info.routerAddress;
          }

          const addresses = contracts[chainName];

          // Consider the presence of a router based remote account as opt-in
          // if the chain supports router based accounts.
          const chainSupportsRouter =
            addresses.remoteAccountRouter &&
            addresses.remoteAccountRouter.length > 2;
          const hasRoutedAccount = [...accounts.entries()].some(
            ([chain, info]) =>
              chain in AxelarChain && (info as GMPAccountInfo).routerAddress,
          );
          if (chainSupportsRouter && hasRoutedAccount) {
            return true;
          }

          return useRouter(addresses);
        },
        getTargetAllocation() {
          return this.state.targetAllocation;
        },
        accountIdByChain() {
          const { accounts } = this.state;
          return accountIdByChain(accounts);
        },
        accountStateByChain() {
          const { accounts, accountsPending } = this.state;
          return accountStateByChain(accounts, accountsPending);
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
            accountStateByChain: accountStateByChain(accounts, accountsPending),
            ...(accounts.has('agoric') ? agoricAux() : {}),
            ...(targetAllocation && { targetAllocation }),
            ...(sourceAccountId && { sourceAccountId }),
            accountsPending: [...accountsPending.keys()],
            policyVersion,
            rebalanceCount,
          } satisfies StatusFor['portfolio']);
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
          let state: 'new' | 'failed' | 'ok';
          if (accounts.has(chainName)) {
            const infoAny = accounts.get(chainName);
            assert.equal(infoAny.chainName, chainName);
            const info = infoAny as AccountInfoFor[C];
            if (!info.err) {
              state = 'ok';
              traceChain('state', state);
              const ready = vowTools.asVow(async () => info);
              return { ready, state };
            }
            state = 'failed';
          } else {
            state = 'new';
          }
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
          const {
            nextFlowId: flowId,
            flowsRunning,
            accountsPending,
          } = this.state;
          this.state.nextFlowId = flowId + 1;
          const sync: VowKit<MovementDesc[]> = vowTools.makeVowKit();
          if (steps) sync.resolver.resolve(steps);
          flowsRunning.init(flowId, harden({ sync, ...detail }));
          this.facets.reporter.publishStatus();
          if (accountsPending.getSize() > 0) {
            const traceFlow = trace
              .sub(`portfolio${this.state.portfolioId}`)
              .sub(`flow${flowId}`);
            const evmPendingAccounts = [...accountsPending.keys()].filter(
              chain => chain in AxelarChain,
            );
            traceFlow(`releasing pending evm accounts`, evmPendingAccounts);
            const reason = Error('starting new flow');
            for (const chainName of evmPendingAccounts) {
              this.facets.manager.releaseAccount(chainName, reason);
            }
          }
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
        /**
         * Note: evmHandler is only valid for portfolios opened from EVM.
         * Callers must ensure `sourceAccountId` is set before using this facet.
         */
        getReaderFacet() {
          return this.facets.reader;
        },
        /**
         * Validate that the representative EVM contract information corresponds
         * to this portfolio. For deposits, performs stricter checks to ensure
         * the deposit's permit is redeemable.
         *
         * @param chainId the EVM chainId of the representative contract
         * @param representativeContract the domain verifying contract or deposit permit spender address
         * @param strictForDeposit validate that any existing remote account matches the factory-predicted address
         */
        validateRepresentativeInfo(
          chainId: bigint | number,
          representativeContract: EVMAddress,
          strictForDeposit: boolean = false,
        ) {
          const { accounts } = this.state;

          const fromChain = eip155ChainIdToAxelarChain[`${chainId}`];
          if (!fromChain) {
            throw Fail`no Axelar chain for EIP-155 chainId ${chainId}`;
          }

          const addresses = contracts[fromChain];

          // The representative contract of the portfolio manager on the EVM
          // chain should be the current remote account router or the deposit
          // factory, if configured. It can also be the remote account itself.
          // For deposits, the representative contract will also be the permit's
          // redeemer. If a remote account already exists, its address must
          // match the address that the representative's factory would create.
          // That implies that if the representative is not the remote account,
          // the deposit factory can only be a valid representative if the
          // remote account is not router based, and vice-versa.
          // A non current router can never be used as representative, even if
          // the remote account hasn't been transferred to the new router yet.
          // Allowing the remote account itself as representative supports
          // legacy remote accounts being used for deposits, and in the future
          // lets us remove the deposit factory as a supported representative.
          // We also support remote accounts as representative when the remote
          // account does not yet exist and will be created, either by the
          // remote account factory through the router, or by the deposit factory.
          type RepresentativeConfig = {
            name: string;
            address: EVMAddress;
            predictAddress: () => EVMAddress;
          };

          const hasRouterConfig =
            !!addresses.remoteAccountRouter &&
            addresses.remoteAccountRouter.length > 2 &&
            !!addresses.remoteAccountFactory &&
            addresses.remoteAccountFactory.length > 2 &&
            !!addresses.remoteAccountImplementation &&
            addresses.remoteAccountImplementation.length > 2;

          const routerConfig: RepresentativeConfig | undefined = hasRouterConfig
            ? {
                name: 'router',
                address: addresses.remoteAccountRouter!,
                predictAddress: () =>
                  predictRemoteAccountAddress({
                    owner: this.facets.reader.getLocalAccount().getAddress()
                      .value,
                    factoryAddress: addresses.remoteAccountFactory!,
                    implementationAddress:
                      addresses.remoteAccountImplementation!,
                  }),
              }
            : undefined;

          const depositFactoryConfig: RepresentativeConfig | undefined =
            addresses.depositFactory && addresses.depositFactory.length > 2
              ? {
                  name: 'deposit factory',
                  address: addresses.depositFactory,
                  predictAddress: () =>
                    predictWalletAddress({
                      owner: this.facets.reader.getLocalAccount().getAddress()
                        .value,
                      factoryAddress: addresses.factory,
                      gasServiceAddress: addresses.gasService,
                      gatewayAddress: addresses.gateway,
                      walletBytecode: hexToBytes(
                        walletBytecode.replace(/^0x/, ''),
                      ),
                    }),
                }
              : undefined;

          let remoteAccountAddress: EVMAddress;
          let representativeConfig: RepresentativeConfig | undefined;
          if (accounts.has(fromChain)) {
            const gmpInfo = accounts.get(fromChain) as GMPAccountInfo;
            remoteAccountAddress = gmpInfo.remoteAddress;

            // If the account exists, we must use its matching representative
            representativeConfig = gmpInfo.routerAddress
              ? routerConfig
              : depositFactoryConfig;

            // If the deposit into the existing remote account is through the representative,
            // the remote account address must match what the representative's factory would create.
            // If the remote account is legacy, its address won't match.
            // If the remote account is router-based, the router is always involved and the address must match.
            if (
              strictForDeposit &&
              representativeConfig &&
              (representativeConfig === routerConfig ||
                sameEvmAddress(
                  representativeContract,
                  representativeConfig.address,
                ))
            ) {
              const expectedAddress = representativeConfig.predictAddress();
              sameEvmAddress(gmpInfo.remoteAddress, expectedAddress) ||
                Fail`account address ${gmpInfo.remoteAddress} does not match ${representativeConfig.name} generated address ${expectedAddress} for chain ${fromChain}`;
            }
          } else {
            // This is only used to provide a diagnostic for the expected remote account address
            // if the spender doesn't match either representative.
            const defaultRepresentativeConfig =
              this.facets.reader.useRouterForChain(fromChain)
                ? routerConfig
                : depositFactoryConfig;

            representativeConfig =
              [routerConfig, depositFactoryConfig].find(
                c => c && sameEvmAddress(representativeContract, c.address),
              ) ?? defaultRepresentativeConfig;

            if (!representativeConfig) {
              throw Fail`no representative available for chain ${fromChain}`;
            }

            remoteAccountAddress = representativeConfig.predictAddress();
          }

          sameEvmAddress(
            representativeContract,
            representativeConfig?.address,
          ) ||
            sameEvmAddress(representativeContract, remoteAccountAddress) ||
            Fail`${bare(strictForDeposit ? 'permit spender' : 'verifying contract')} ${representativeContract} does not match remote account ${remoteAccountAddress} or ${bare(representativeConfig?.name ?? 'missing representative')} ${representativeConfig?.address ?? '0x'} for chain ${fromChain}`;
        },
        /**
         * Initiate a deposit from an EVM account using Permit2.
         *
         * The permit's owner must match the address portion of `sourceAccountId`,
         * though the chain can be different (enabling deposits from multiple chains).
         *
         * @param depositDetails - The permit2 deposit details including chainId, token, amount, spender, and permit2Payload
         */
        deposit(depositDetails: PermitDetails) {
          const { sourceAccountId } = this.state;
          if (!sourceAccountId) {
            throw Fail`deposit requires sourceAccountId to be set (portfolio must be opened from EVM)`;
          }
          const { accountAddress } = parseAccountId(sourceAccountId);

          const owner = depositDetails.permit2Payload.owner;
          sameEvmAddress(owner, accountAddress as EVMAddress) ||
            Fail`permit owner ${owner} does not match portfolio source address ${accountAddress}`;

          this.facets.evmHandler.validateRepresentativeInfo(
            depositDetails.chainId,
            depositDetails.spender,
            true,
          );

          const fromChain =
            eip155ChainIdToAxelarChain[`${depositDetails.chainId}`];
          if (!fromChain) {
            throw Fail`no Axelar chain for EIP-155 chainId ${depositDetails.chainId}`;
          }

          sameEvmAddress(depositDetails.token, contracts[fromChain].usdc) ||
            Fail`permit token address ${depositDetails.token} does not match usdc contract address ${contracts[fromChain].usdc} for chain ${fromChain}`;

          const amount = AmountMath.make(usdcBrand, depositDetails.amount);
          const flowDetail: FlowDetail = { type: 'deposit', amount, fromChain };
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          const seat = zcf.makeEmptySeatKit().zcfSeat;

          void executePlan(
            seat,
            {},
            this.facets,
            flowDetail,
            startedFlow,
            undefined,
            { evmDepositDetail: { ...depositDetails, fromChain } },
          );
          return `flow${startedFlow.flowId}`;
        },
        /**
         * Initiate a rebalance with an optional target allocation.
         * If a new allocation is not provided, uses the previously set target allocation.
         */
        rebalance(
          allocations?: readonly EIP712Allocation[] | undefined,
          depositDetails?: PermitDetails,
        ) {
          const { sourceAccountId } = this.state;
          if (!sourceAccountId) {
            throw Fail`rebalance requires sourceAccountId to be set (portfolio must be opened from EVM)`;
          }

          !depositDetails || Fail`rebalance does not yet support deposit`;

          if (allocations) {
            allocations.length > 0 ||
              Fail`rebalance with allocations requires non-empty allocations`;

            // XXX: validate instruments
            const targetAllocation: TargetAllocation = Object.fromEntries(
              allocations.map(({ instrument, portion }) => [
                instrument,
                portion,
              ]),
            );

            this.facets.manager.setTargetAllocation(targetAllocation);
          } else {
            const { targetAllocation } = this.state;
            (targetAllocation && Object.keys(targetAllocation).length > 0) ||
              Fail`rebalance requires targetAllocation to be set`;
          }
          const flowDetail: FlowDetail = { type: 'rebalance' };
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          const seat = zcf.makeEmptySeatKit().zcfSeat;

          void executePlan(seat, {}, this.facets, flowDetail, startedFlow);
          return `flow${startedFlow.flowId}`;
        },
        /**
         * Initiate a withdrawal to the source EVM account.
         *
         * Requires that `sourceAccountId` was set when the portfolio was opened
         * (i.e., the portfolio was opened from EVM via `openPortfolioFromEVM`).
         */
        withdraw({
          withdrawDetails,
          domain,
          address,
        }: {
          withdrawDetails: { amount: bigint; token: EVMAddress };
          domain?: Partial<YmaxFullDomain>;
          address?: EVMAddress;
        }) {
          const { sourceAccountId } = this.state;
          if (!sourceAccountId) {
            throw Fail`withdraw requires sourceAccountId to be set (portfolio must be opened from EVM)`;
          }

          const { namespace, reference, accountAddress } =
            parseAccountId(sourceAccountId);

          namespace === 'eip155' ||
            Fail`withdraw sourceAccountId must be in eip155 namespace: ${sourceAccountId}`;
          const evmAddress = accountAddress as EVMAddress;

          const chainIdStr = String(
            domain?.chainId ?? reference,
          ) as `${number | bigint}`;

          const toChain = eip155ChainIdToAxelarChain[chainIdStr];

          if (!toChain) {
            throw Fail`destination chainId ${chainIdStr} is not supported for withdraw`;
          }

          !address ||
            sameEvmAddress(evmAddress, address) ||
            Fail`withdraw address ${address} does not match source account address ${evmAddress}`;

          sameEvmAddress(withdrawDetails.token, contracts[toChain].usdc) ||
            Fail`withdraw token address ${withdrawDetails.token} does not match usdc contract address ${contracts[toChain].usdc} for chain ${toChain}`;
          const amount = AmountMath.make(usdcBrand, withdrawDetails.amount);

          const flowDetail = {
            type: 'withdraw',
            amount,
            toChain,
          } satisfies FlowDetail;
          const startedFlow = this.facets.manager.startFlow(flowDetail);
          const seat = zcf.makeEmptySeatKit().zcfSeat;

          void executePlan(seat, {}, this.facets, flowDetail, startedFlow);
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
