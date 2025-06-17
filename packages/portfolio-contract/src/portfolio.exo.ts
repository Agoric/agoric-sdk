import { makeTracer, type Remote } from '@agoric/internal';
import { Fail } from '@endo/errors';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { atob, decodeBase64 } from '@endo/base64';
import { decodeAbiParameters } from 'viem';
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
import type { TimerService } from '@agoric/time';
import { E } from '@endo/far';
import { YieldProtocol } from './constants.js';
import type { AxelarChainsMap } from './type-guards.js';

const trace = makeTracer('PortExo');
const { keys, values, entries } = Object;

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
  addAavePosition: M.call(M.or(ChainShape)).returns(),
  addCompoundPosition: M.call(M.or(ChainShape)).returns(),
  addUSDNPosition: M.call(
    M.or(ChainShape),
    M.remotable('OrchestrationAccount'),
  ).returns(),
  getPositions: M.call(TypeShape, ChainShape).returns(M.arrayOf(PositionShape)),
  getAccount: M.call(M.number(), TypeShape).returns(
    M.remotable('OrchestrationAccount'),
  ),
});

const HolderI = M.interface('Holder', {
  supplyToAave: M.call(M.remotable('Seat')).returns(M.promise()),
  withdrawFromAave: M.call(M.remotable('Seat')).returns(M.promise()),
  setupGmpLCA: M.call(M.remotable('OrchestrationAccount')).returns(),
  setupAxelarChainInfo: M.call(M.any()).returns(),
  getRemoteAccountAddress: M.call(M.number()).returns(
    M.or(M.string(), M.undefined()),
  ),
  sendGmp: M.call(M.remotable('Seat'), M.record()).returns(M.promise()),
  wait: M.call(M.bigint()).returns(M.promise()),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;

type AxelarGmpManager = {
  localAccount: LocalAccount;
  remoteAccountAddress?: string;
  axelarChainInfo: Record<string, unknown> & { chainId: string };
};

type EVMProtocolState = {
  type: 'Aave' | 'Compound';
  chain: CaipChainId;
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

type PortfolioPositions = {
  Aave: EVMProtocolState;
  Compound: EVMProtocolState;
  USDN: NobleDollarState;
};

type PortfolioKitState = {
  positions: PortfolioPositions;
  gmp: AxelarGmpManager;
};

export const preparePortfolioKit = (
  zone: Zone,
  {
    timer,
    zcf,
    axelarChainsMap,
  }: {
    zcf: ZCF;
    axelarChainsMap: AxelarChainsMap;
    timer: Remote<TimerService>;
  },
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
    () =>
      harden({
        positions: {
          Aave: undefined,
          Compound: undefined,
          USDN: undefined,
        },
        gmp: {
          localAccount: undefined,
          remoteAccountAddress: undefined,
          axelarChainInfo: undefined,
        },
      }) as unknown as PortfolioKitState,
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

              const { positions } = this.state;
              for (const [_key, position] of entries(positions)) {
                if (position.type === 'Aave' || position.type === 'Compound') {
                  const evmState = position as EVMProtocolState;
                  positions[position.type] = harden({
                    ...evmState,
                    remoteAccountAddress: address,
                  });

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
        addAavePosition(chain: CaipChainId) {
          const isActive = true;
          const evmState: EVMProtocolState = {
            type: 'Aave',
            chain,
            isActive,
          };
          this.state.positions = harden({
            ...this.state.positions,
            Aave: evmState,
          });
          trace('initialized position for aave');
        },
        addCompoundPosition(chain: CaipChainId) {
          const isActive = true;
          const evmState: EVMProtocolState = {
            type: 'Compound',
            chain,
            isActive,
          };
          this.state.positions = harden({
            ...this.state.positions,
            Compound: evmState,
          });
          trace('initialized position for compound');
        },
        addUSDNPosition<P extends YieldProtocol>(
          chain: CaipChainId,
          account: AccountOf[P],
        ) {
          const isActive = true;
          const nobleState: NobleDollarState = {
            type: 'USDN',
            chain,
            account: account as AccountOf['USDN'],
            isActive,
          };
          this.state.positions = harden({
            ...this.state.positions,
            USDN: nobleState,
          });
          trace('initialized position for', 'USDN', '=>', `${account}`);
        },
        getPositions<P extends YieldProtocol>(
          type: P,
          chain: CaipChainId,
        ): readonly PositionInfo[] {
          const { positions } = this.state;
          const out: PositionInfo[] = [];

          for (const p of values(positions)) {
            if (p.type === type && p.chain === chain) {
              out.push(harden(p));
            }
          }

          return harden(out);
        },
        getAccount<P extends YieldProtocol>(type: P): AccountOf[P] {
          switch (type) {
            case 'Aave':
            case 'Compound':
              return this.state.gmp.localAccount as AccountOf[P];
            case 'USDN': {
              const { positions } = this.state;
              const p = positions[type];
              return (p as NobleDollarState).account as AccountOf[P];
            }
            default:
              throw new Error(`Unknown protocol type: ${type}`);
          }
        },
      },
      holder: {
        setupGmpLCA<P extends YieldProtocol>(account: AccountOf[P]) {
          this.state.gmp = {
            ...this.state.gmp,
            // Can use Aave or Compound as both share this account
            localAccount: account as AccountOf['Aave'],
          };
        },
        setupAxelarChainInfo(info) {
          this.state.gmp = {
            ...this.state.gmp,
            axelarChainInfo: info,
          };
        },
        getRemoteAccountAddress(): string | undefined {
          const { gmp } = this.state;

          if (gmp.remoteAccountAddress) {
            return gmp.remoteAccountAddress;
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

          const { chainId } = this.state.gmp.axelarChainInfo;
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

          await this.facets.keeper.getAccount(YieldProtocol.Aave).transfer(
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
        async supplyToAave(
          seat: ZCFSeat,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          evmChain: SupportedEVMChains,
          amountToTransfer: bigint,
          gasAmount: bigint,
        ) {
          const remoteEVMAddress = this.facets.holder.getRemoteAccountAddress();
          remoteEVMAddress !== undefined ||
            Fail`remoteEVMAddress must be defined`;

          await this.facets.holder.sendGmp(seat, {
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
                args: [usdcTokenAddress, amountToTransfer, remoteEVMAddress, 0],
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
          const remoteEVMAddress = this.facets.holder.getRemoteAccountAddress();
          remoteEVMAddress !== undefined ||
            Fail`remoteEVMAddress must be defined`;

          await this.facets.holder.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            type: AxelarGMPMessageType.ContractCall,
            destinationEVMChain: evmChain,
            gasAmount,
            contractInvocationData: [
              {
                functionSignature: 'withdraw(address,uint256,address)',
                args: [usdcTokenAddress, amountToWithdraw, remoteEVMAddress],
                target: aavePoolAddress,
              },
            ],
          });
        },

        async wait(delay: bigint) {
          await E(timer).delay(delay);
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
