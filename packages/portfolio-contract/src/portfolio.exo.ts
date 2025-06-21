import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeTracer, type Remote } from '@agoric/internal';
import { type CaipChainId } from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import type { TimerService } from '@agoric/time';
import type { VTransferIBCEvent } from '@agoric/vats';
import { VowShape, type VowKit, type VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import { atob } from '@endo/base64';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { YieldProtocol } from './constants.js';
import type { AxelarChainsMap, NobleAccount } from './type-guards.js';
import { type Vow } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { InvitationShape, OfferHandlerI } from '@agoric/zoe/src/typeGuards.js';
import {
  type makeProposalShapes,
  type LocalAccount,
  type OfferArgsFor,
  OfferArgsShapeFor,
} from './type-guards.js';
import type { HostInterface } from '../../async-flow/src/types.js';

const trace = makeTracer('PortExo');
const { keys, values } = Object;

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
const KeeperI = M.interface('keeper', {
  getGMPAddress: M.call().returns(VowShape),
  getLCA: M.call().returns(OrchestrationAccountShape),
  getPositions: M.call().returns(M.arrayOf(M.string())),
  getUSDNICA: M.call().returns(OrchestrationAccountShape),
  initAave: M.call(M.string()).returns(),
  initCompound: M.call(M.string()).returns(),
  wait: M.call(M.bigint()).returns(VowShape),
});

type EVMProtocolState = {
  chain: CaipChainId;
};

type PortfolioKitState = {
  Aave: EVMProtocolState | undefined;
  Compound: EVMProtocolState | undefined;
  USDN: NobleAccount;
  Gmp: {
    localAccount: HostInterface<LocalAccount>;
    remoteAddressVK: VowKit<`0x${string}`>;
  };
};

// NOTE: This is host side code; can't use await.
export const preparePortfolioKit = (
  zone: Zone,
  {
    axelarChainsMap,
    rebalance,
    timer,
    proposalShapes,
    vowTools,
    zcf,
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
  },
) =>
  zone.exoClassKit(
    'Portfolio',
    {
      tap: M.interface('tap', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      keeper: KeeperI,
      rebalanceHandler: OfferHandlerI,
      invitationMakers: M.interface('invitationMakers', {
        Rebalance: M.callWhen().returns(InvitationShape),
      }),
    },
    (
      nobleAcct: NobleAccount,
      localAcct: HostInterface<LocalAccount>,
    ): PortfolioKitState => {
      return {
        Aave: undefined,
        Compound: undefined,
        USDN: nobleAcct,
        Gmp: harden({
          localAccount: localAcct,
          remoteAddressVK: vowTools.makeVowKit(),
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
            !(
              memo.source_chain in
              values(axelarChainsMap).map(chain => chain.axelarId)
            )
          ) {
            console.warn('unknown source_chain', memo);
            return;
          }

          const [{ isContractCallResult, data }] = decodeAbiParameters(
            DECODE_CONTRACT_CALL_RESULT_ABI,
            memo.payload as `0x${string}`, // hm.. cast...
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

            const { Gmp } = this.state;
            Gmp.remoteAddressVK.resolver.resolve(address);
            trace(`remoteAddress ${address}`);
          }

          trace('receiveUpcall completed');
        },
      },
      keeper: {
        getGMPAddress() {
          const { Gmp } = this.state;
          return Gmp.remoteAddressVK.vow;
        },
        getLCA() {
          const { Gmp } = this.state;
          return Gmp.localAccount;
        },
        getPositions(): YieldProtocol[] {
          const { state } = this;
          return harden(
            (keys(YieldProtocol) as YieldProtocol[]).filter(k => !!state[k]),
          );
        },
        getUSDNICA() {
          return this.state.USDN;
        },
        initAave(chain: CaipChainId) {
          this.state.Aave = harden({
            chain,
          });
        },
        initCompound(chain: CaipChainId) {
          this.state.Compound = harden({
            chain,
          });
        },
        /** KLUDGE around lack of synchronization signals for now. TODO: rethink design. */
        wait(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: unknown) {
          const { keeper } = this.facets;
          mustMatch(offerArgs, OfferArgsShapeFor.rebalance);
          // @ts-expect-error: offerArgs is validated just above and safe to use as OfferArgsFor['rebalance']
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
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
