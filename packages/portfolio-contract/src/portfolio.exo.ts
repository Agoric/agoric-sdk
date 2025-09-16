/**
 * NOTE: This is host side code; can't use await.
 */
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import { makeTracer, mustMatch, type Remote } from '@agoric/internal';
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
import type { MapStore } from '@agoric/store';
import type { TimerService } from '@agoric/time';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { decodeBase64 } from '@endo/base64';
import { X } from '@endo/errors';
import type { ERef } from '@endo/far';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { AxelarId, GmpAddresses } from './portfolio.contract.js';
import type { LocalAccount, NobleAccount } from './portfolio.flows.js';
import { preparePosition, type Position } from './pos.exo.js';
import type { makeOfferArgsShapes } from './type-guards-steps.js';
import {
  makeFlowPath,
  makePortfolioPath,
  PoolKeyShapeExt,
  type makeProposalShapes,
  type OfferArgsFor,
  type PoolKey,
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
  nextFlowId: number;
  targetAllocation?: TargetAllocation;
};

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

export type PublishStatusFn = <K extends keyof StatusFor>(
  path: string[],
  status: StatusFor[K],
) => void;

export const preparePortfolioKit = (
  zone: Zone,
  {
    axelarIds,
    gmpAddresses,
    rebalance,
    parseInboundTransfer,
    timer,
    chainHubTools,
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
      offerArgs: OfferArgsFor['rebalance'],
      kit: unknown, // XXX avoid circular reference
    ) => Vow<any>; // XXX HostForGuest???
    parseInboundTransfer: (
      packet: VTransferIBCEvent['packet'],
      kit: unknown, // XXX avoid circular reference to this.facets
    ) => Vow<Awaited<ReturnType<LocalAccount['parseInboundTransfer']>>>;
    timer: Remote<TimerService>;
    chainHubTools: Pick<ChainHub, 'getChainInfo' | 'getChainsAndConnection'>;
    proposalShapes: ReturnType<typeof makeProposalShapes>;
    offerArgsShapes: ReturnType<typeof makeOfferArgsShapes>;
    vowTools: VowTools;
    zcf: ZCF;
    portfoliosNode: ERef<StorageNode>;
    marshaller: Marshaller;
    usdcBrand: Brand<'nat'>;
  },
) => {
  // Ephemeral node cache
  // XXX collecting flow nodes is TBD
  const nodes = new Map<string, ERef<StorageNode>>();
  const providePathNode = (segments: string[]): ERef<StorageNode> => {
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
      };
    },
    {
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          trace('receiveUpcall', event);
          return vowTools.watch(
            parseInboundTransfer(event.packet, this.facets),
            this.facets.parseInboundTransferWatcher,
            event.packet,
          );
        },
      },
      parseInboundTransferWatcher: {
        onRejected(reason) {
          console.warn('⚠️ parseInboundTransfer failure', reason);
          throw reason;
        },
        async onFulfilled(parsed, packet) {
          if (!parsed) {
            trace('GMP processing skipped; no parsed inbound transfer');
            return false;
          }

          // Validate that this is really from Axelar to Agoric on the expected
          // channel. We do this after parseInboundTransfer so that that
          // function can be simpler and not need to know about Axelar or
          // channels.
          const [_agoric, _axelar, connection] = await vowTools.when(
            chainHubTools.getChainsAndConnection('agoric', 'axelar'),
          );
          const agoricTransferChannel = connection.transferChannel.channelId;
          if (packet.destination_channel !== agoricTransferChannel) {
            trace(
              `GMP processing skipped; Axelar chain packet expected on ${agoricTransferChannel}, got ${packet.destination_channel}`,
            );
            return false;
          }

          const { extra } = parsed;
          if (!extra.memo) return;
          if (extra.sender !== gmpAddresses.AXELAR_GMP) {
            trace(
              `GMP processing skipped; Axelar GMP sender expected ${gmpAddresses.AXELAR_GMP}, got ${extra.sender}`,
            );
            return false;
          }
          const memo: AxelarGmpIncomingMemo = JSON.parse(extra.memo); // XXX unsound! use typed pattern

          const result = (
            Object.entries(axelarIds) as [AxelarChain, string][]
          ).find(([_, chainId]) => chainId === memo.source_chain);

          if (!result) {
            console.warn('unknown source_chain', memo);
            return false;
          }

          const [chainName, _] = result;

          const payloadBytes = decodeBase64(memo.payload);
          const [{ isContractCallResult, data }] = decodeAbiParameters(
            DECODE_CONTRACT_CALL_RESULT_ABI,
            payloadBytes,
          ) as [AgoricResponse];

          trace(
            'receiveUpcall Decoded:',
            JSON.stringify({ isContractCallResult, data }),
          );

          if (isContractCallResult) {
            console.warn('TODO: Handle the result of the contract call', data);
          } else {
            const [message] = data;
            const { success, result: result2 } = message;
            if (!success) return;

            const [address] = decodeAbiParameters(
              [{ type: 'address' }],
              result2,
            );

            // chainInfo is safe to await: registerChain(...) ensure it's already resolved,
            // so vowTools.when won't cause async delays or cross-vat calls.
            const chainInfo = await vowTools.when(
              chainHubTools.getChainInfo(chainName),
            );
            const caipId: CaipChainId = `${chainInfo.namespace}:${chainInfo.reference}`;

            this.facets.manager.resolveAccount({
              namespace: 'eip155',
              chainName,
              chainId: caipId,
              remoteAddress: address,
            });
            trace(`remoteAddress ${address}`);
          }

          trace('receiveUpcall completed');
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
      },
      reporter: {
        publishStatus() {
          const {
            portfolioId,
            positions,
            accounts,
            nextFlowId,
            targetAllocation,
          } = this.state;

          const deposit = () => {
            const { lcaIn } = accounts.get('agoric') as AgoricAccountInfo;
            return { depositAddress: lcaIn.getAddress().value };
          };

          publishStatus(makePortfolioPath(portfolioId), {
            positionKeys: [...positions.keys()],
            flowCount: nextFlowId - 1,
            accountIdByChain: accountIdByChain(accounts),
            ...(accounts.has('agoric') ? deposit() : {}),
            ...(targetAllocation && { targetAllocation }),
          });
        },
        allocateFlowId() {
          const { nextFlowId } = this.state;
          this.state.nextFlowId = nextFlowId + 1;
          this.facets.reporter.publishStatus();
          return nextFlowId;
        },
        // XXX collecting flow nodes is TBD
        publishFlowStatus(id: number, status: StatusFor['flow']) {
          const { portfolioId } = this.state;
          publishStatus(makeFlowPath(portfolioId, id), status);
        },
      },
      manager: {
        reserveAccount<C extends SupportedChain>(
          chainName: C,
        ): undefined | Vow<AccountInfoFor[C]> {
          trace('reserveAccount', chainName);
          const { accounts, accountsPending } = this.state;
          if (accounts.has(chainName)) {
            trace('accounts.has', chainName);
            return vowTools.asVow(async () => {
              const infoAny = accounts.get(chainName);
              assert.equal(infoAny.chainName, chainName);
              const info = infoAny as AccountInfoFor[C];
              return info;
            });
          }
          if (accountsPending.has(chainName)) {
            trace('accountsPending.has', chainName);
            return accountsPending.get(chainName).vow as Vow<AccountInfoFor[C]>;
          }
          const pending: VowKit<AccountInfoFor[C]> = vowTools.makeVowKit();
          trace('accountsPending.init', chainName);
          accountsPending.init(chainName, pending);
          this.facets.reporter.publishStatus();
          return undefined;
        },
        resolveAccount(info: AccountInfo) {
          const { accounts, accountsPending } = this.state;
          if (accountsPending.has(info.chainName)) {
            const vow = accountsPending.get(info.chainName);
            // NEEDSTEST - why did all tests pass without .resolve()?
            vow.resolver.resolve(info);
            accountsPending.delete(info.chainName);
          }
          accounts.init(info.chainName, info);
          this.facets.reporter.publishStatus();
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
        /** KLUDGE around lack of synchronization signals for now. TODO: rethink design. */
        waitKLUDGE(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
        setTargetAllocation(allocation: TargetAllocation) {
          this.state.targetAllocation = allocation;
          this.facets.reporter.publishStatus();
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          mustMatch(offerArgs, offerArgsShapes.rebalance);
          return rebalance(seat, offerArgs, this.facets);
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
      },
    },
    {
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
