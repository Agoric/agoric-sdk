/**
 * NOTE: This is host side code; can't use await.
 */
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { AmountMath } from '@agoric/ertp';
import { makeTracer, mustMatch, type Remote } from '@agoric/internal';
import { decodeBase64 } from '@endo/base64';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import {
  type AccountId,
  type CaipChainId,
  type CosmosChainAddress,
} from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import type { MapStore } from '@agoric/store';
import type { TimerService } from '@agoric/time';
import type { VTransferIBCEvent } from '@agoric/vats';
import { VowShape, type Vow, type VowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import type { Zone } from '@agoric/zone';
import { atob } from '@endo/base64';
import type { ERef } from '@endo/far';
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { HostInterface } from '../../async-flow/src/types.js';
import { YieldProtocol } from './constants.js';
import type { AxelarChainsMap, NobleAccount } from './type-guards.js';
import {
  OfferArgsShapeFor,
  makeFlowPath,
  makePortfolioPath,
  makePositionPath,
  type LocalAccount,
  type OfferArgsFor,
  type makeProposalShapes,
} from './type-guards.js';

const trace = makeTracer('PortExo');
const { assign, values } = Object;
const { add, subtract } = AmountMath;

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

const OrchestrationAccountShape = M.remotable('OrchestrationAccount');
const ReaderI = M.interface('reader', {
  getGMPAddress: M.call().returns(M.any()),
  getLCA: M.call().returns(OrchestrationAccountShape),
  getPositions: M.call().returns(M.arrayOf(M.string())),
  getUSDNICA: M.call().returns(OrchestrationAccountShape),
});

const ManagerI = M.interface('manager', {
  initAave: M.call(M.string()).returns(),
  initCompound: M.call(M.string()).returns(),
  wait: M.call(M.bigint()).returns(VowShape),
});

interface PositionRd {
  getPositionId(): number;
  getYieldProtocol(): YieldProtocol;
}

interface PositionPub extends PositionRd {
  publishStatus(): void;
}

export interface Position extends PositionPub {
  recordTransferIn(amount: Amount<'nat'>): Amount<'nat'>;
  recordTransferOut(amount: Amount<'nat'>): Amount<'nat'>;
}

type TransferStatus = {
  totalIn: Amount<'nat'>;
  totalOut: Amount<'nat'>;
  netTransfers: Amount<'nat'>;
};

const recordTransferIn = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { netTransfers, totalIn } = state;
  assign(state, {
    netTransfers: add(netTransfers, amount),
    totalIn: add(totalIn, amount),
  });
  position.publishStatus();
  return state.netTransfers;
};

const recordTransferOut = (
  amount: Amount<'nat'>,
  state: TransferStatus,
  position: Pick<Position, 'publishStatus'>,
) => {
  const { netTransfers, totalOut } = state;
  assign(state, {
    netTransfers: subtract(netTransfers, amount),
    totalOut: add(totalOut, amount),
  });
  position.publishStatus();
  return state.netTransfers;
};

type PortfolioKitState = {
  portfolioId: number;
  localAccount: HostInterface<LocalAccount>;
  nobleAccount: HostInterface<NobleAccount>;
  positions: MapStore<number, Position>;
  nextFlowId: number;
};

export const preparePortfolioKit = (
  zone: Zone,
  {
    axelarChainsMap,
    rebalance,
    timer,
    proposalShapes,
    vowTools,
    zcf,
    portfoliosNode,
    marshaller,
    usdcBrand,
  }: {
    axelarChainsMap: AxelarChainsMap;
    rebalance: (
      seat: ZCFSeat,
      offerArgs: OfferArgsFor['rebalance'],
      keeper: unknown, // XXX avoid circular reference
    ) => Vow<any>; // XXX HostForGuest???
    timer: Remote<TimerService>;
    proposalShapes: ReturnType<typeof makeProposalShapes>;
    vowTools: VowTools;
    zcf: ZCF;
    portfoliosNode: ERef<StorageNode>;
    marshaller: Marshaller;
    usdcBrand: Brand<'nat'>;
  },
) => {
  const makePathNode = (path: string[]) => {
    let node = portfoliosNode;
    for (const segment of path) {
      node = E(node).makeChildNode(segment);
    }
    return node;
  };
  const publishStatus = (path: string[], status: CopyRecord): void => {
    const node = makePathNode(path);
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

  const makeUSDNPosition = zone.exoClass(
    'USDN Position',
    undefined, // interface TODO
    (portfolioId: number, positionId: number, address: CosmosChainAddress) => ({
      portfolioId,
      positionId,
      accountId: coerceAccountId(address),
      ...emptyTransferState,
    }),
    {
      getPositionId() {
        return this.state.positionId;
      },
      getYieldProtocol() {
        return 'USDN';
      },
      publishStatus() {
        const {
          portfolioId,
          positionId,
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        } = this.state;
        // TODO: typed pattern for USDN status
        publishStatus(makePositionPath(portfolioId, positionId), {
          protocol: 'USDN',
          accountId,
          netTransfers,
          totalIn,
          totalOut,
        });
      },
      recordTransferIn(amount: Amount<'nat'>) {
        return recordTransferIn(amount, this.state, this.self);
      },
      recordTransferOut(amount: Amount<'nat'>) {
        return recordTransferOut(amount, this.state, this.self);
      },
    },
  ) satisfies (...args: any[]) => Position;

  const makeGMPPosition = zone.exoClass(
    'GMP Position',
    undefined, // interface TODO
    (
      portfolioId: number,
      positionId: number,
      protocol: YieldProtocol,
      chainId: CaipChainId,
    ) => ({
      portfolioId,
      positionId,
      protocol,
      ...emptyTransferState,
      chainId,
      // nobleAccount,
      remoteAddressVK: vowTools.makeVowKit<`0x${string}`>(),
      accountId: undefined as undefined | AccountId,
    }),
    {
      getPositionId() {
        return this.state.positionId;
      },
      getYieldProtocol() {
        const { protocol } = this.state;
        return protocol;
      },
      getAddress(): Vow<`0x${string}`> {
        const { remoteAddressVK } = this.state;
        // TODO: when the vow resolves, publishStatus()
        return remoteAddressVK.vow;
      },
      getChainId() {
        return this.state.chainId;
      },
      recordTransferIn(amount: Amount<'nat'>) {
        return recordTransferIn(amount, this.state, this.self);
      },
      recordTransferOut(amount: Amount<'nat'>) {
        return recordTransferOut(amount, this.state, this.self);
      },
      publishStatus() {
        const { portfolioId, positionId, protocol, accountId } = this.state;
        // TODO: typed pattern for GMP status
        const status = { protocol, accountId };
        publishStatus(makePositionPath(portfolioId, positionId), status);
      },
      resolveAddress(address: `0x${string}`) {
        const { chainId, remoteAddressVK } = this.state;
        remoteAddressVK.resolver.resolve(address);
        this.state.accountId = `${chainId}:${address}`;
        this.self.publishStatus();
      },
    },
  ); // TODO: satisfies (...args: any[]) => Position
  type GMPPosition = ReturnType<typeof makeGMPPosition>;

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
      // TODO: are these needed?
      localAccount,
      nobleAccount,
    }: {
      portfolioId: number;
      localAccount: HostInterface<LocalAccount>;
      nobleAccount: HostInterface<NobleAccount>;
    }): PortfolioKitState => {
      return {
        portfolioId,
        localAccount,
        nobleAccount,
        nextFlowId: 1,
        // TODO: test for forgetting to use detached()
        positions: zone.detached().mapStore('positions', {
          keyShape: M.number(),
          valueShape: M.remotable('Position'),
        }),
      };
    },
    {
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          trace('receiveUpcall', event);

          const tx: FungibleTokenPacketData = JSON.parse(
            atob(event.packet.data),
          );

          trace('receiveUpcall packet data', tx);
          if (!tx.memo) return;
          const memo: AxelarGmpIncomingMemo = JSON.parse(tx.memo); // XXX unsound! use typed pattern

          if (
            !values(axelarChainsMap)
              .map(chain => chain.axelarId)
              .includes(memo.source_chain)
          ) {
            console.warn('unknown source_chain', memo);
            return;
          }

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
            const { success, result } = message;
            if (!success) return;

            const [address] = decodeAbiParameters(
              [{ type: 'address' }],
              result,
            );

            const gmpPos = this.facets.manager.findPendingGMPPosition();
            if (!gmpPos) {
              trace('no pending GMP position', address);
              return;
            }
            gmpPos.resolveAddress(address);
            trace(`remoteAddress ${address}`);
          }

          trace('receiveUpcall completed');
        },
      },
      reader: {
        getStoragePath() {
          const { portfolioId } = this.state;
          const node = makePathNode(makePortfolioPath(portfolioId));
          return vowTools.asVow(() => E(node).getPath());
        },
        getPortfolioId() {
          return this.state.portfolioId;
        },
        getLCA() {
          return this.state.localAccount;
        },
        getNobleICA() {
          return this.state.nobleAccount;
        },
        getGMPAddress(protocol: YieldProtocol) {
          const { positions } = this.state;
          for (const pos of positions.values()) {
            if (protocol === pos.getYieldProtocol()) {
              // XXX is there a typesafe way?
              const gp = pos as unknown as GMPPosition;
              return gp.getAddress();
              // TODO: what if there are > 1?
            }
          }
          assert.fail(`no position for ${protocol}`);
        },
      },
      reporter: {
        // TODO: move back to a .status facet?
        publishStatus() {
          const {
            portfolioId,
            positions,
            localAccount,
            nobleAccount,
            nextFlowId,
          } = this.state;
          publishStatus(makePortfolioPath(portfolioId), {
            local: coerceAccountId(localAccount.getAddress()),
            noble: coerceAccountId(nobleAccount.getAddress()),
            positionCount: positions.getSize(),
            flowCount: nextFlowId - 1,
          });
        },

        allocateFlowId() {
          const { nextFlowId } = this.state;
          this.state.nextFlowId = nextFlowId + 1;
          this.facets.reporter.publishStatus();
          return nextFlowId;
        },
        publishFlowStatus(id: number, status: CopyRecord) {
          const { portfolioId } = this.state;
          publishStatus(makeFlowPath(portfolioId, id), status);
        },
      },
      manager: {
        // TODO: support >1 pending position?
        findPendingGMPPosition() {
          const { positions } = this.state;
          for (const pos of positions.values()) {
            if (['Aave', 'Compound'].includes(pos.getYieldProtocol())) {
              // XXX is there a typesafe way?
              return pos as unknown as GMPPosition;
            }
          }
          return undefined; // like array.find()
        },
        provideGMPPositionOn(protocol: YieldProtocol, chain: CaipChainId) {
          const { positions } = this.state;
          for (const pos of positions.values()) {
            if (['Aave', 'Compound'].includes(pos.getYieldProtocol())) {
              const gpos = pos as unknown as GMPPosition;
              if (gpos.getChainId() === chain)
                return { position: gpos, isNew: false };
            }
          }
          const { portfolioId } = this.state;
          const positionId = positions.getSize() + 1;
          const position = makeGMPPosition(
            portfolioId,
            positionId,
            protocol,
            chain,
          );
          positions.init(positionId, position);
          position.publishStatus();
          this.facets.reporter.publishStatus();
          return { position, isNew: true };
        },
        provideAavePositionOn(chain: CaipChainId) {
          const { manager } = this.facets;
          return manager.provideGMPPositionOn('Aave', chain);
        },
        provideCompoundPositionOn(chain: CaipChainId) {
          const { manager } = this.facets;
          return manager.provideGMPPositionOn('Compound', chain);
        },
        provideUSDNPosition() {
          const { positions } = this.state;
          for (const pos of positions.values()) {
            if (pos.getYieldProtocol() === 'USDN') {
              return pos;
            }
          }
          const { portfolioId, nobleAccount } = this.state;
          const positionId = positions.getSize() + 1;
          const position = makeUSDNPosition(
            portfolioId,
            positionId,
            nobleAccount.getAddress(),
          );
          positions.init(positionId, position);
          position.publishStatus();
          this.facets.reporter.publishStatus();
          return position;
        },
        /** KLUDGE around lack of synchronization signals for now. TODO: rethink design. */
        waitKLUDGE(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          const { reader, manager } = this.facets;
          const keeper = { ...reader, ...manager };
          mustMatch(offerArgs, OfferArgsShapeFor.rebalance);
          return rebalance(seat, offerArgs, keeper);
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
      finish({ facets }) {
        facets.reporter.publishStatus();
      },
    },
  );
};
harden(preparePortfolioKit);

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;

export type USDNPosition = ReturnType<
  PortfolioKit['manager']['provideUSDNPosition']
>;
