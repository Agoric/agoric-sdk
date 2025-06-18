import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.ts';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeTracer } from '@agoric/internal';
import type { CaipChainId, OrchestrationAccount } from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { InvitationShape, OfferHandlerI } from '@agoric/zoe/src/typeGuards.js';
import type { Zone } from '@agoric/zone';
import { atob } from '@endo/base64';
import { makeError, q } from '@endo/errors';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { PositionChain, YieldProtocol } from './constants.js';
import {
  ChainShape,
  type makeProposalShapes,
  type LocalAccount,
  type OfferArgsFor,
} from './type-guards.js';

const trace = makeTracer('PortExo');
const { keys } = Object;

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

export const supportedEVMChains: CaipChainId[] = [
  'eip155:43114', // Avalanche
  'eip155:8453', // Base
  'eip155:1', // Ethereum
] as const;
harden(supportedEVMChains);

const OrchestrationAccountShape = M.remotable('OrchestrationAccount');
const VowStringShape = M.any(); // Vow(M.string())
const KeeperI = M.interface('keeper', {
  getLCA: M.call().returns(OrchestrationAccountShape),
  getPositions: M.call().returns(M.arrayOf(M.string())),
  initAave: M.call(ChainShape).returns(),
  initCompound: M.call().returns(),
  initUSDN: M.call(OrchestrationAccountShape).returns(),
  getUSDNICA: M.call().returns(OrchestrationAccountShape),
  getAaveAddress: M.call().returns(VowStringShape),
  getCompoundAddress: M.call().returns(VowStringShape),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.promise()),
});

type EVMProtocolState = {
  chain: CaipChainId;
  remoteAddressVK: VowKit<`0x${string}`>;
};

const EthL1: CaipChainId = 'eip155:1';

/** ICA on Noble */
type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;

type PortfolioKitState = {
  localAccount: LocalAccount;
  Aave: EVMProtocolState | undefined;
  Compound: EVMProtocolState | undefined;
  USDN: NobleAccount | undefined;
};

// NOTE: This is host side code; can't use await.
export const preparePortfolioKit = (
  zone: Zone,
  {
    zcf,
    vowTools,
    rebalance,
    proposalShapes,
  }: {
    zcf: ZCF;
    vowTools: VowTools;
    rebalance: (
      seat: ZCFSeat,
      offerArgs: OfferArgsFor['rebalance'],
      keeper: unknown, // XXX avoid circular reference
    ) => Vow<any>; // XXX HostForGuest???
    proposalShapes: ReturnType<typeof makeProposalShapes>;
  },
) =>
  zone.exoClassKit(
    'Portfolio',
    {
      keeper: KeeperI,
      rebalanceHandler: OfferHandlerI,
      invitationMakers: M.interface('invitationMakers', {
        Rebalance: M.callWhen().returns(InvitationShape),
      }),
      tap: EvmTapI,
    },

    (localAccount: LocalAccount): PortfolioKitState => ({
      localAccount,
      Aave: undefined,
      Compound: undefined,
      USDN: undefined,
    }),
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

          if (!(memo.source_chain in PositionChain)) {
            console.warn('unknown source_chain', memo);
            return;
          }

          // const payloadBytes = decodeBase64(memo.payload.replace(/^0x/, ''));
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

            const sourceChain = memo.source_chain;
            const targetChainId = PositionChain[sourceChain];
            trace('target', sourceChain, targetChainId);

            // Find the EVM protocol position that matches the source chain
            const { Aave, Compound } = this.state;
            if (Aave && targetChainId === Aave.chain) {
              Aave.remoteAddressVK.resolver.resolve(address);
            } else if (Compound && targetChainId === Compound.chain) {
              Compound.remoteAddressVK.resolver.resolve(address);
            } else {
              throw makeError(
                `no matching chainId ${targetChainId}: ${q({ Aave: Aave?.chain, Compound: Compound?.chain })}`,
              );
            }
          }

          trace('receiveUpcall completed');
        },
      },
      keeper: {
        getLCA() {
          const { localAccount } = this.state;
          return localAccount;
        },
        getPositions(): YieldProtocol[] {
          const { state } = this;
          return harden(
            (keys(YieldProtocol) as YieldProtocol[]).filter(k => !!state[k]),
          );
        },
        initAave(chain: CaipChainId) {
          this.state.Aave = harden({
            chain,
            remoteAddressVK: vowTools.makeVowKit(),
          });
          trace('initAave', chain);
        },
        initCompound() {
          this.state.Compound = harden({
            chain: EthL1,
            remoteAddressVK: vowTools.makeVowKit(),
          });
          trace('initCompound');
        },
        initUSDN(account: NobleAccount) {
          this.state.USDN = account;
          trace('initUSDN', account);
        },
        getUSDNICA() {
          const { USDN } = this.state;
          if (!USDN) throw Error('USDN not set');
          return USDN;
        },
        getAaveAddress() {
          const { Aave } = this.state;
          if (!Aave) throw Error('Aave not set');
          return Aave.remoteAddressVK.vow;
        },
        getCompoundAddress() {
          const { Compound } = this.state;
          if (!Compound) throw Error('Compound not set');
          return Compound.remoteAddressVK.vow;
        },
      },
      rebalanceHandler: {
        async handle(seat: ZCFSeat, offerArgs: CopyRecord) {
          const { keeper } = this.facets;
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
