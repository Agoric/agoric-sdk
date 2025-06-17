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
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.ts';
import {
  gmpAddresses,
  buildGMPPayload,
} from '@agoric/orchestration/src/utils/gmp.js';
import type { ZCF } from '@agoric/zoe';
import { YieldProtocol } from './constants.js';
import type { AxelarChainsMap } from './type-guards.js';

const trace = makeTracer('PortExo');
const { keys, values } = Object;

const DECODE_CONTRACT_CALL_RESULT_ABI = [
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

const TypeShape = M.or(...keys(YieldProtocol));
export const ChainShape = M.string(); // TODO: remove it
const PositionShape = M.splitRecord({}); // TODO

const KeeperI = M.interface('keeper', {
  add: M.call(
    TypeShape,
    M.or(ChainShape),
    M.remotable('OrchestrationAccount'),
  ).returns(M.number()),
  getPositions: M.call(TypeShape, ChainShape).returns(M.arrayOf(PositionShape)),
  getAccount: M.call(M.number(), TypeShape).returns(
    M.remotable('OrchestrationAccount'),
  ),
  getRemoteAccountAddress: M.call(M.number()).returns(
    M.or(M.string(), M.undefined()),
  ),
  sendGmp: M.call(M.remotable('Seat'), M.record()).returns(M.promise()),
});

const HolderI = M.interface('Holder', {
  supplyToAave: M.call(M.remotable('Seat')).returns(M.promise()),
  withdrawFromAave: M.call(M.remotable('Seat')).returns(M.promise()),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;

type EVMProtocolState = {
  type: 'Aave' | 'Compound';
  chain: CaipChainId;
  localAccount: LocalAccount;
  remoteAccountAddress?: string;
  isActive: boolean;
};

/** ICA on Noble */
type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;
type NobleDollarState = {
  type: 'USDN';
  chain: CaipChainId; // cosmos:noble-...
  account: NobleAccount;
  isActive: boolean;
};

type AccountOf = {
  Aave: LocalAccount;
  Compound: LocalAccount;
  USDN: NobleAccount;
};

type PositionInfo = EVMProtocolState | NobleDollarState;
type PortfolioKitState = {
  positions: MapStore<number, PositionInfo>;
};

export const preparePortfolioKit = (
  zone: Zone,
  { zcf, axelarChainsMap }: { zcf: ZCF; axelarChainsMap: AxelarChainsMap },
) =>
  zone.exoClassKit(
    'Portfolio',
    {
      keeper: KeeperI,
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        supplyToAave: M.call(M.record()).returns(M.promise()),
        withdrawFromAave: M.call(M.record()).returns(M.promise()),
      }),
      tap: EvmTapI,
    },

    (): PortfolioKitState => ({ positions: zone.mapStore('positions') }),
    {
      tap: {
        receiveUpcall(event: VTransferIBCEvent) {
          trace('receiveUpcall', event);

          const tx: FungibleTokenPacketData = JSON.parse(
            atob(event.packet.data),
          );

          trace('receiveUpcall packet data', tx);
          const memo: AxelarGmpIncomingMemo = JSON.parse(tx.memo);

          const ids = values(axelarChainsMap).map(chain => chain.axelarId);
          if (!ids.includes(memo.source_chain)) {
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

          if (!isContractCallResult) {
            const [message] = data;
            const { success, result } = message;

            trace('Contract Call Status:', success);

            if (success) {
              const [address] = decodeAbiParameters(
                [{ type: 'address' }],
                result,
              );

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
            }
          }
          // TODO: Handle the result of the contract call

          trace('receiveUpcall completed');
        },
      },
      keeper: {
        add<P extends YieldProtocol>(
          type: P,
          chain: CaipChainId,
          account: AccountOf[P],
        ): number {
          const { positions } = this.state;
          const isActive = true;
          const key = 1 + positions.getSize();
          switch (type) {
            case 'Aave':
            case 'Compound': {
              const evmState: EVMProtocolState = {
                type,
                localAccount: account as LocalAccount,
                chain,
                isActive,
              };
              positions.init(key, harden(evmState));
              break;
            }
            case 'USDN': {
              const nobleState: NobleDollarState = {
                type,
                chain,
                account: account as AccountOf['USDN'],
                isActive,
              };
              positions.init(key, harden(nobleState));
              break;
            }
            default:
              throw new Error(`Unknown protocol type: ${type}`);
          }
          trace('initialized position', key, 'for', type, '=>', `${account}`);
          return key;
        },
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
        },
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
