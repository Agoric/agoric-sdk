<<<<<<< HEAD
=======
import { makeTracer } from '@agoric/internal';
import { assert, Fail } from '@endo/errors';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { atob, decodeBase64 } from '@endo/base64';
import { decodeAbiParameters } from 'viem';
import { type MapStore } from '@agoric/store';
import {
  type AxelarGmpIncomingMemo,
  type SupportedEVMChains,
  type ContractCall,
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type GMPMessageType,
} from '@agoric/orchestration/src/axelar-types.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { OrchestrationAccount, CaipChainId } from '@agoric/orchestration';
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.ts';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeTracer } from '@agoric/internal';
import type { CaipChainId, OrchestrationAccount } from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import { type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
<<<<<<< HEAD
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
=======
import { YieldProtocol } from './constants.js';
import type { AxelarChainsMap } from './type-guards.js';
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)

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
<<<<<<< HEAD
] as const;
harden(DECODE_CONTRACT_CALL_RESULT_ABI);

export const supportedEVMChains: CaipChainId[] = [
  'eip155:43114', // Avalanche
  'eip155:8453', // Base
  'eip155:1', // Ethereum
] as const;
harden(supportedEVMChains);
=======
];

const TypeShape = M.or(...keys(YieldProtocol));
export const ChainShape = M.string(); // TODO: remove it
const PositionShape = M.splitRecord({}); // TODO
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)

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

<<<<<<< HEAD
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
=======
export const preparePortfolioKit = (
  zone: Zone,
  { zcf, axelarChainsMap }: { zcf: ZCF; axelarChainsMap: AxelarChainsMap },
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
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

<<<<<<< HEAD
          if (!(memo.source_chain in PositionChain)) {
            console.warn('unknown source_chain', memo);
=======
          const ids = values(axelarChainsMap).map(chain => chain.axelarId);
          if (!ids.includes(memo.source_chain)) {
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
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
<<<<<<< HEAD
=======

              // Find the EVM protocol position that matches the source chain
              const { positions } = this.state;
              for (const [key, position] of positions.entries()) {
                if (
                  (position.type === 'Aave' || position.type === 'Compound') &&
                  'remoteAccountAddress' in position
                ) {
                  const evmState = position as EVMProtocolState;
                  positions.set(
                    key,
                    harden({
                      ...evmState,
                      remoteAccountAddress: address,
                    }),
                  );
                  break;
                }
              }

              trace('remote evm account address:', address);
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
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
<<<<<<< HEAD
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
=======
        getPositions<P extends YieldProtocol>(type: P, chain: CaipChainId) {
          const { positions } = this.state;
          const out: PositionInfo[] = [];
          for (const p of positions.values()) {
            if (p.type === type && chain === p.chain) {
              out.push(harden(p));
            }
          }
          return harden(out);
        },
        getAccount<P extends YieldProtocol>(
          positionId: number,
          type: P,
        ): AccountOf[P] {
          const { positions } = this.state;
          const p = positions.get(positionId);
          assert.equal(p.type, type);
          switch (type) {
            case 'Aave':
            case 'Compound':
              return (p as EVMProtocolState).localAccount as AccountOf[P];
            case 'USDN':
              return (p as NobleDollarState).account as AccountOf[P];
            default:
              throw new Error(`Unknown protocol type: ${type}`);
          }
        },
        getRemoteAccountAddress(positionId: number): string | undefined {
          const { positions } = this.state;
          const p = positions.get(positionId);
          if (p.type === 'Aave' || p.type === 'Compound') {
            return (p as EVMProtocolState).remoteAccountAddress;
          }
          return undefined;
        },
        async sendGmp(
          seat: ZCFSeat,
          offerArgs: {
            destinationAddress: string;
            type: GMPMessageType;
            destinationEVMChain: SupportedEVMChains;
            gasAmount: bigint;
            contractInvocationData: Array<ContractCall>;
          },
        ) {
          const {
            destinationAddress,
            type,
            destinationEVMChain,
            gasAmount,
            contractInvocationData,
          } = offerArgs;

          destinationAddress != null ||
            Fail`Destination address must be defined`;
          destinationEVMChain != null ||
            Fail`Destination evm address must be defined`;

          const isContractInvocation = [1, 2].includes(type);
          if (isContractInvocation) {
            gasAmount != null || Fail`gasAmount must be defined`;
            contractInvocationData != null ||
              Fail`contractInvocationData is not defined`;

            contractInvocationData.length !== 0 ||
              Fail`contractInvocationData array is empty`;
          }

          const { give } = seat.getProposal();

          const [[_kw, amt]] = Object.entries(give);
          amt.value > 0n || Fail`IBC transfer amount must be greater than zero`;

          const payload =
            type === 3 ? null : buildGMPPayload(contractInvocationData);

          trace(`Payload: ${JSON.stringify(payload)}`);

          // TODO: get the right denom for gas
          const denom = 'BLD';

          trace('amt and brand', amt.brand);

          // TODO: Maintain state for Axlear Chain ID
          // const axelar = await orch.getChain('axelar');
          const chainId = 'axelar';

          const memo: AxelarGmpOutgoingMemo = {
            destination_chain: destinationEVMChain,
            destination_address: destinationAddress,
            payload,
            type,
          };

          if (type === 1 || type === 2) {
            memo.fee = {
              amount: String(gasAmount),
              recipient: gmpAddresses.AXELAR_GAS,
            };
          }

          trace(`Initiating IBC Transfer...`);
          trace(`DENOM of token:${denom}`);

          // TODO: dont hardcode positionID
          const positionId = 2;
          await this.facets.keeper
            .getAccount(positionId, YieldProtocol.Aave)
            .transfer(
              {
                value: gmpAddresses.AXELAR_GMP,
                encoding: 'bech32',
                chainId,
              },
              {
                denom,
                value: amt.value,
              },
              { memo: JSON.stringify(memo) },
            );

          seat.exit();
          return 'sendGmp successful';
        },
      },
      holder: {
        async supplyToAave(
          seat: ZCFSeat,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          evmChain: SupportedEVMChains,
          amountToTransfer: bigint,
          gasAmount: bigint,
        ) {
          // TODO: dont hardcode positionID
          const positionId = 2;
          await this.facets.keeper.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            destinationEVMChain: evmChain,
            type: AxelarGMPMessageType.ContractCall,
            gasAmount,
            contractInvocationData: [
              {
                functionSignature: 'approve(address,uint256)',
                args: [aavePoolAddress, amountToTransfer],
                target: usdcTokenAddress,
              },
              {
                functionSignature: 'supply(address,uint256,address,uint16)',
                args: [
                  usdcTokenAddress,
                  amountToTransfer,
                  this.facets.keeper.getRemoteAccountAddress(positionId),
                  0,
                ],
                target: aavePoolAddress,
              },
            ],
          });
        },
        async withdrawFromAave(
          seat: ZCFSeat,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          evmChain: SupportedEVMChains,
          amountToWithdraw: bigint,
          gasAmount: bigint,
        ) {
          // TODO: dont hardcode positionID
          const positionId = 2;
          await this.facets.keeper.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            type: AxelarGMPMessageType.ContractCall,
            destinationEVMChain: evmChain,
            gasAmount,
            contractInvocationData: [
              {
                functionSignature: 'withdraw(address,uint256,address)',
                args: [
                  usdcTokenAddress,
                  amountToWithdraw,
                  this.facets.keeper.getRemoteAccountAddress(positionId),
                ],
                target: aavePoolAddress,
              },
            ],
          });
        },
      },
      invitationMakers: {
        supplyToAave(
          evmChain: SupportedEVMChains,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          amountToTransfer: bigint,
          gasAmount: bigint,
        ) {
          const invitation = async seat => {
            await this.facets.holder.supplyToAave(
              seat,
              aavePoolAddress,
              usdcTokenAddress,
              evmChain,
              amountToTransfer,
              gasAmount,
            );
          };
          return zcf.makeInvitation(invitation, 'supplyToAave');
        },
        withdrawFromAave(
          evmChain: SupportedEVMChains,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          amountToWithdraw: bigint,
          gasAmount: bigint,
        ) {
          const invitation = async seat => {
            await this.facets.holder.withdrawFromAave(
              seat,
              aavePoolAddress,
              usdcTokenAddress,
              evmChain,
              amountToWithdraw,
              gasAmount,
            );
          };
          return zcf.makeInvitation(invitation, 'withdrawFromAave');
>>>>>>> 2af2462149 (chore: create axelarChainsMap and updates types)
        },
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
