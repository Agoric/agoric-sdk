/**
 * NOTE: This is host side code; can't use await.
 */
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import { makeTracer, mustMatch, type ERemote } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import {
  type AccountId,
  type CaipChainId,
  type ChainHub,
} from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { MapStore } from '@agoric/store';
import type { IBCChannelID, VTransferIBCEvent } from '@agoric/vats';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { decodeBase64 } from '@endo/base64';
import { Fail, X } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import type { AxelarId, GmpAddresses } from './portfolio.contract.js';
import { type LocalAccount, type NobleAccount } from './portfolio.flows.js';
import { preparePosition, type Position } from './pos.exo.js';
import type { makeOfferArgsShapes, MovementDesc } from './type-guards-steps.js';
import {
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

const trace = makeTracer('PortExo');

export const DECODE_CONTRACT_CALL_RESULT_ABI = [
  {
    type: 'tuple',
    components: [
      { name: 'isContractCallResult', type: 'bool' },
      {
        name: 'data',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'result', type: 'bytes' },
        ],
      },
    ],
  },
] as const;
harden(DECODE_CONTRACT_CALL_RESULT_ABI);

export type AccountInfo = GMPAccountInfo | AgoricAccountInfo | NobleAccountInfo;
export type GMPAccountInfo = {
  namespace: 'eip155';
  chainName: AxelarChain;
  chainId: CaipChainId;
  remoteAddress: `0x${string}`;
};
type AgoricAccountInfo = {
  namespace: 'cosmos';
  chainName: 'agoric';
  lca: LocalAccount;
  lcaIn: LocalAccount;
  reg: TargetRegistration;
};
type NobleAccountInfo = {
  namespace: 'cosmos';
  chainName: 'noble';
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
  flowsRunning: MapStore<number, { sync: VowKit<MovementDesc[]> } & FlowDetail>;
  nextFlowId: number;
  targetAllocation?: TargetAllocation;
  policyVersion: number;
  rebalanceCount: number;
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

const eventAbbr = (e: VTransferIBCEvent) => {
  const { destination_channel: dest, sequence } = e.packet;
  return { destination_channel: dest, sequence };
};

/** avoid circular reference */
type PortfolioKitCycleBreaker = unknown;

export const preparePortfolioKit = (
  zone: Zone,
  {
    axelarIds,
    gmpAddresses,
    rebalance,
    executePlan,
    parseInboundTransfer,
    chainHubTools,
    transferChannels,
    proposalShapes,
    offerArgsShapes,
    vowTools,
    zcf,
    portfoliosNode,
    marshaller,
    usdcBrand,
  }: {
    axelarIds: AxelarId;
    gmpAddresses: GmpAddresses;
    rebalance: (
      seat: ZCFSeat,
      offerArgs: unknown,
      kit: PortfolioKitCycleBreaker,
    ) => Vow<unknown>;
    executePlan: (
      seat: ZCFSeat,
      offerArgs: unknown,
      kit: PortfolioKitCycleBreaker,
      flowDetail: FlowDetail,
    ) => Vow<unknown>;
    parseInboundTransfer: (
      packet: VTransferIBCEvent['packet'],
      kit: PortfolioKitCycleBreaker,
    ) => Vow<Awaited<ReturnType<LocalAccount['parseInboundTransfer']>>>;
    chainHubTools: Pick<ChainHub, 'getChainInfo'>;
    transferChannels: {
      noble: IBCChannelID;
      axelar?: IBCChannelID;
    };
    proposalShapes: ReturnType<typeof makeProposalShapes>;
    offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>;
    vowTools: VowTools;
    zcf: ZCF;
    portfoliosNode: ERemote<StorageNode>;
    marshaller: ERemote<Marshaller>;
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
    ({ portfolioId }: { portfolioId: number }): PortfolioKitState => {
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
        etc: undefined,
      };
    },
    {
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          const traceUpcall = trace
            .sub(`portfolio${this.state.portfolioId}`)
            .sub('upcall');
          traceUpcall('event', eventAbbr(event));
          const { destination_channel: packetDest } = event.packet;

          // Validate that this is really from Axelar to Agoric.
          if (packetDest !== transferChannels.axelar) {
            traceUpcall(
              `GMP early exit: ${packetDest} != ${transferChannels.axelar}: not from axelar`,
            );
            return false;
          }

          return vowTools.watch(
            parseInboundTransfer(event.packet, this.facets),
            this.facets.parseInboundTransferWatcher,
          );
        },
      },
      parseInboundTransferWatcher: {
        onRejected(reason) {
          const traceP = trace.sub(`portfolio${this.state.portfolioId}`);
          traceP('⚠️ parseInboundTransfer failure', reason);
          throw reason;
        },
        async onFulfilled(parsed) {
          const traceUpcall = trace
            .sub(`portfolio${this.state.portfolioId}`)
            .sub('upcall');
          if (!parsed) {
            traceUpcall('GMP early exit: no parsed inbound transfer');
            return false;
          }

          const { extra } = parsed;
          if (!extra.memo) return;
          if (extra.sender !== gmpAddresses.AXELAR_GMP) {
            traceUpcall(
              `GMP early exit; AXELAR_GMP sender expected ${gmpAddresses.AXELAR_GMP}, got ${extra.sender}`,
            );
            return false;
          }
          const memo: AxelarGmpIncomingMemo = JSON.parse(extra.memo); // XXX unsound! use typed pattern

          const result = (
            Object.entries(axelarIds) as [AxelarChain, string][]
          ).find(([_, chainId]) => chainId === memo.source_chain);

          if (!result) {
            traceUpcall('unknown source_chain', memo);
            return false;
          }

          const [chainName, _] = result;

          const payloadBytes = decodeBase64(memo.payload);
          const [{ isContractCallResult, data }] = decodeAbiParameters(
            DECODE_CONTRACT_CALL_RESULT_ABI,
            payloadBytes,
          ) as [AgoricResponse];

          traceUpcall(
            'Decoded:',
            JSON.stringify({ isContractCallResult, data }),
          );

          if (isContractCallResult) {
            traceUpcall('TODO: Handle the result of the contract call', data);
            return false;
          }

          const [message] = data;
          const { success, result: result2 } = message;
          if (!success) return;

          const [address] = decodeAbiParameters([{ type: 'address' }], result2);

          // chainInfo is safe to await: registerChain(...) ensure it's already resolved,
          // so vowTools.when won't cause async delays or cross-vat calls.
          const chainInfo = await vowTools.when(
            chainHubTools.getChainInfo(chainName),
          );
          const caipId: CaipChainId = `${chainInfo.namespace}:${chainInfo.reference}`;

          traceUpcall(chainName, 'remoteAddress', address);
          this.facets.manager.resolveAccount({
            namespace: 'eip155',
            chainName,
            chainId: caipId,
            remoteAddress: address,
          });

          traceUpcall('completed');
          return true;
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
        getGMPInfo(chainName: AxelarChain): Vow<GMPAccountInfo> {
          const { accounts, accountsPending } = this.state;
          if (accounts.has(chainName)) {
            return vowTools.asVow(
              () => accounts.get(chainName) as GMPAccountInfo,
            );
          }
          const { vow } = accountsPending.get(chainName);
          return vow as Vow<GMPAccountInfo>;
        },
        getTargetAllocation() {
          return this.state.targetAllocation;
        },
        accountIdByChain() {
          const { accounts } = this.state;
          return accountIdByChain(accounts);
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
          } = this.state;

          const depositAddr = () => {
            const { lcaIn } = accounts.get('agoric') as AgoricAccountInfo;
            return { depositAddress: lcaIn.getAddress().value };
          };

          publishStatus(makePortfolioPath(portfolioId), {
            positionKeys: [...positions.keys()],
            flowCount: nextFlowId - 1,
            flowsRunning: makeFlowsRunningRecord(flowsRunning),
            accountIdByChain: accountIdByChain(accounts),
            ...(accounts.has('agoric') ? depositAddr() : {}),
            ...(targetAllocation && { targetAllocation }),
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
        publishFlowSteps(id: number, steps: StatusFor['flowSteps']) {
          const { portfolioId } = this.state;
          publishStatus(makeFlowStepsPath(portfolioId, id), steps);
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
        resolveFlowPlan(flowId: number, steps: MovementDesc[]) {
          const { flowsRunning } = this.state;
          const detail = flowsRunning.get(flowId);
          detail.sync.resolver.resolve(steps);
        },
      },
      manager: {
        reserveAccount<C extends SupportedChain>(
          chainName: C,
        ): undefined | Vow<AccountInfoFor[C]> {
          const traceChain = trace
            .sub(`portfolio${this.state.portfolioId}`)
            .sub(chainName);
          traceChain('reserveAccount');
          const { accounts, accountsPending } = this.state;
          if (accounts.has(chainName)) {
            traceChain('accounts.has');
            return vowTools.asVow(async () => {
              const infoAny = accounts.get(chainName);
              assert.equal(infoAny.chainName, chainName);
              const info = infoAny as AccountInfoFor[C];
              return info;
            });
          }
          if (accountsPending.has(chainName)) {
            traceChain('accountsPending.has');
            return accountsPending.get(chainName).vow as Vow<AccountInfoFor[C]>;
          }
          const pending: VowKit<AccountInfoFor[C]> = vowTools.makeVowKit();
          vowTools.watch(pending.vow, this.facets.accountWatcher, chainName);
          traceChain('accountsPending.init');
          accountsPending.init(chainName, pending);
          this.facets.reporter.publishStatus();
          return undefined;
        },
        resolveAccount(info: AccountInfo) {
          const { accounts, accountsPending, portfolioId } = this.state;
          const traceChain = trace
            .sub(`portfolio${portfolioId}`)
            .sub(info.chainName);

          if (accountsPending.has(info.chainName)) {
            const vow = accountsPending.get(info.chainName);
            // NEEDSTEST - why did all tests pass without .resolve()?
            traceChain('accountsPending.resolve');
            vow.resolver.resolve(info);
            accountsPending.delete(info.chainName);
          }
          traceChain('accounts.init');
          accounts.init(info.chainName, info);
          this.facets.reporter.publishStatus();
        },
        releaseAccount(chainName: SupportedChain, reason: unknown) {
          trace('releaseAccount', chainName, reason);
          const { accountsPending } = this.state;
          if (accountsPending.has(chainName)) {
            const vow = accountsPending.get(chainName);
            vow.resolver.reject(reason);
            accountsPending.delete(chainName);
            this.facets.reporter.publishStatus();
          }
        },
        startFlow(detail: FlowDetail) {
          const { nextFlowId, flowsRunning } = this.state;
          this.state.nextFlowId = nextFlowId + 1;
          const sync: VowKit<MovementDesc[]> = vowTools.makeVowKit();
          flowsRunning.init(nextFlowId, harden({ sync, ...detail }));
          this.facets.reporter.publishStatus();
          return { stepsP: sync.vow, flowId: nextFlowId };
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
        onRejected(reason, chainName) {
          const traceChain = trace
            .sub(`portfolio${this.state.portfolioId}`)
            .sub(chainName);
          traceChain('rejected', reason);
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, offerArgsShapes.rebalance);
          return rebalance(seat, offerArgs, this.facets);
        },
      },
      depositHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, harden({}));
          const proposal =
            seat.getProposal() as unknown as ProposalType['deposit'];
          return executePlan(seat, offerArgs, this.facets, {
            type: 'deposit',
            amount: proposal.give.Deposit,
          });
        },
      },
      simpleRebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          // XXX offerArgs.flow shouldn't be allowed
          mustMatch(offerArgs, offerArgsShapes.rebalance);
          if (offerArgs.targetAllocation) {
            const { manager } = this.facets;
            manager.setTargetAllocation(offerArgs.targetAllocation);
          }
          return executePlan(seat, offerArgs, this.facets, {
            type: 'rebalance',
          });
        },
      },
      withdrawHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, harden({}));
          const proposal =
            seat.getProposal() as unknown as ProposalType['withdraw'];
          return executePlan(seat, offerArgs, this.facets, {
            type: 'withdraw',
            amount: proposal.want.Cash,
          });
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
      },
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
