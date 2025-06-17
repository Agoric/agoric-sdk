import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeTracer, type Remote } from '@agoric/internal';
import { type CaipChainId } from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import type { TimerService } from '@agoric/time';
import type { VTransferIBCEvent } from '@agoric/vats';
import { VowShape, type VowKit, type VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import { atob, decodeBase64 } from '@endo/base64';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { YieldProtocol } from './constants.js';
import type {
  AxelarChainsMap,
  EVMOfferArgs,
  NobleAccount,
} from './type-guards.js';
import { type Vow } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { InvitationShape, OfferHandlerI } from '@agoric/zoe/src/typeGuards.js';
import {
  type makeProposalShapes,
  type LocalAccount,
  type OfferArgsFor,
  OfferArgsShapeFor,
} from './type-guards.js';

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
];

const OrchestrationAccountShape = M.remotable('OrchestrationAccount');
const VowStringShape = M.any(); // Vow(M.string())
const KeeperI = M.interface('keeper', {
  getLCA: M.call().returns(OrchestrationAccountShape),
  getPositions: M.call().returns(M.arrayOf(M.string())),
  getUSDNICA: M.call().returns(OrchestrationAccountShape),
  initAave: M.call(M.string()).returns(),
  initCompound: M.call(M.string()).returns(),
  initUSDN: M.call(M.remotable('OrchestrationAccount')).returns(),
  initGmp: M.call(M.remotable('OrchestrationAccount')).returns(),
  getRemoteAddress: M.call().returns(VowStringShape),
  wait: M.call(M.bigint()).returns(VowShape),
});

type AxelarGmpManager = {
  localAccount: LocalAccount;
  remoteAddressVK: VowKit<`0x${string}`>;
};

type EVMProtocolState = {
  chain: CaipChainId;
};

type PortfolioKitState = {
  Aave: EVMProtocolState | undefined;
  Compound: EVMProtocolState | undefined;
  USDN: NobleAccount | undefined;
  Gmp: AxelarGmpManager | undefined;
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
    (): PortfolioKitState => {
      return {
        Aave: undefined,
        Compound: undefined,
        USDN: undefined,
        Gmp: undefined,
      };
    },
    {
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          trace('receiveUpcall', event);

          // TODO: dont use the same LCA for sending transfers to noble
          let tx: FungibleTokenPacketData;
          try {
            tx = JSON.parse(atob(event.packet.data));
          } catch (err) {
            trace(
              'Failed to parse packet data JSON in receiveUpcall:',
              err,
              event.packet.data,
            );
            return;
          }

          trace('receiveUpcall packet data', tx);
          if (!tx.memo) return;
          let memo: AxelarGmpIncomingMemo;
          try {
            memo = JSON.parse(tx.memo); // XXX unsound! use typed pattern
          } catch (err) {
            trace('Failed to parse memo JSON in receiveUpcall:', err, tx.memo);
            return;
          }

          const ids = values(axelarChainsMap).map(chain => chain.axelarId);
          if (!ids.includes(memo.source_chain)) return;

          const payloadBytes = decodeBase64(memo.payload);
          const [{ isContractCallResult, data }] = decodeAbiParameters(
            DECODE_CONTRACT_CALL_RESULT_ABI,
            payloadBytes,
          ) as [AgoricResponse];

          if (!isContractCallResult) {
            const [message] = data;
            if (message.success) {
              const [address] = decodeAbiParameters(
                [{ type: 'address' }],
                message.result,
              );
              const { Gmp } = this.state;
              if (Gmp) {
                // TODO: remoteAddressVK is set only once
                Gmp.remoteAddressVK.resolver.resolve(address);
              }
              trace(`remoteAccountAddress ${address}`);
            }
          }
          // TODO: Handle the result of the contract call
          trace('receiveUpcall completed');
        },
      },
      keeper: {
        getLCA() {
          const { Gmp } = this.state;
          if (!Gmp) throw Error('Gmp not set');
          return Gmp.localAccount;
        },
        getPositions(): YieldProtocol[] {
          const { state } = this;
          return harden(
            (keys(YieldProtocol) as YieldProtocol[]).filter(k => !!state[k]),
          );
        },
        getUSDNICA() {
          const { USDN } = this.state;
          if (!USDN) throw Error('USDN not set');
          return USDN;
        },
        getRemoteAddress() {
          const { Gmp } = this.state;
          if (!Gmp) throw Error('Gmp not set');
          return Gmp.remoteAddressVK.vow;
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
        initUSDN(account: NobleAccount) {
          this.state.USDN = account;
        },

        initGmp(account: LocalAccount) {
          this.state.Gmp = harden({
            localAccount: account,
            remoteAddressVK: vowTools.makeVowKit(),
          });
          trace('initLCA');
        },
        wait(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: EVMOfferArgs) {
          const { keeper } = this.facets;
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
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
