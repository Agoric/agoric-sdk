import { makeTracer, type Remote } from '@agoric/internal';
import { Fail } from '@endo/errors';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { VowShape, type VowTools } from '@agoric/vow';
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
import type {
  OrchestrationAccount,
  CaipChainId,
  ChainHub,
} from '@agoric/orchestration';
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import {
  gmpAddresses,
  buildGMPPayload,
} from '@agoric/orchestration/src/utils/gmp.js';
import type { ZCF } from '@agoric/zoe';
import type { TimerService } from '@agoric/time';
import { E } from '@endo/far';
import type { Amount } from '@agoric/ertp';
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
  addAavePosition: M.call(M.or(ChainShape)).returns(),
  addCompoundPosition: M.call(M.or(ChainShape)).returns(),
  addUSDNPosition: M.call(
    M.or(ChainShape),
    M.remotable('OrchestrationAccount'),
  ).returns(),
  getPositions: M.call(TypeShape, ChainShape).returns(M.arrayOf(PositionShape)),
  getAccount: M.call(TypeShape).returns(M.remotable('OrchestrationAccount')),
});

const HolderI = M.interface('Holder', {
  supplyToAave: M.call(M.record()).returns(M.promise()),
  withdrawFromAave: M.call(M.record()).returns(M.promise()),
  setupGmpLCA: M.call(M.remotable('OrchestrationAccount')).returns(),
  setupAxelarChainInfo: M.call(M.any()).returns(),
  getRemoteAccountAddress: M.call().returns(M.or(M.string(), M.undefined())),
  sendGmp: M.call(M.remotable('Seat'), M.record()).returns(M.promise()),
  wait: M.call(M.bigint()).returns(VowShape),
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
type ProtocolKey = keyof typeof YieldProtocol;

type PortfolioKitState = {
  positions: MapStore<ProtocolKey, PositionInfo>;
  gmp: MapStore<'manager', AxelarGmpManager>;
};

export const preparePortfolioKit = (
  zone: Zone,
  {
    chainHub,
    timer,
    zcf,
    axelarChainsMap,
    vowTools,
  }: {
    chainHub: ChainHub;
    zcf: ZCF;
    axelarChainsMap: AxelarChainsMap;
    timer: Remote<TimerService>;
    vowTools: VowTools;
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
    () => {
      const gmpStore = zone.mapStore<'manager', AxelarGmpManager>('manager');
      gmpStore.init(
        'manager',
        harden({
          localAccount: undefined as unknown as LocalAccount,
          remoteAccountAddress: undefined,
          axelarChainInfo: undefined as unknown as Record<string, unknown> & {
            chainId: string;
          },
        }),
      );
      return {
        positions: zone.mapStore<ProtocolKey, PositionInfo>('positions'),
        gmp: gmpStore,
      } as PortfolioKitState;
    },
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

              for (const [key, position] of this.state.positions.entries()) {
                if (position.type === 'Aave' || position.type === 'Compound') {
                  this.state.positions.set(
                    key,
                    harden({ ...position, remoteAccountAddress: address }),
                  );
                  break;
                }
              }

              const manager = this.state.gmp.get('manager');
              this.state.gmp.set('manager', {
                ...manager,
                remoteAccountAddress: address,
              });
            }
          }
          // TODO: Handle the result of the contract call

          trace('receiveUpcall completed');
        },
      },
      keeper: {
        addAavePosition(chain: CaipChainId) {
          this.state.positions.init(
            'Aave',
            harden({ type: 'Aave', chain, isActive: true }),
          );
        },
        addCompoundPosition(chain: CaipChainId) {
          this.state.positions.init(
            'Compound',
            harden({ type: 'Compound', chain, isActive: true }),
          );
        },
        addUSDNPosition<P extends YieldProtocol>(
          chain: CaipChainId,
          account: AccountOf[P],
        ) {
          this.state.positions.init(
            'USDN',
            harden({
              type: 'USDN',
              chain,
              account: account as NobleAccount,
              isActive: true,
            }),
          );
        },
        getPositions<P extends YieldProtocol>(
          type: P,
          chain: CaipChainId,
        ): readonly PositionInfo[] {
          const out: PositionInfo[] = [];
          for (const [_key, p] of this.state.positions.entries()) {
            if (p.type === type && p.chain === chain) {
              out.push(harden(p));
            }
          }
          return harden(out);
        },
        getAccount<P extends YieldProtocol>(type: P): AccountOf[P] {
          const p = this.state.positions.get(type);
          switch (type) {
            case 'Aave':
            case 'Compound': {
              const manager = this.state.gmp.get('manager');
              return manager.localAccount as AccountOf[P];
            }
            case 'USDN':
              return (p as NobleDollarState).account as AccountOf[P];
            default:
              throw Fail`Unknown protocol type: ${type}`;
          }
        },
      },
      holder: {
        setupGmpLCA<P extends YieldProtocol>(account: AccountOf[P]) {
          const manager = this.state.gmp.get('manager');
          this.state.gmp.set('manager', {
            ...manager,
            localAccount: account as LocalAccount,
          });
        },
        setupAxelarChainInfo(info) {
          const manager = this.state.gmp.get('manager');
          this.state.gmp.set('manager', {
            ...manager,
            axelarChainInfo: info,
          });
        },
        getRemoteAccountAddress(): string | undefined {
          return this.state.gmp.get('manager').remoteAccountAddress;
        },
        async sendGmp(
          seat: ZCFSeat,
          offerArgs: {
            destinationAddress: string;
            type: GMPMessageType;
            destinationEVMChain: SupportedEVMChains;
            amount: Amount<'nat'>;
            contractInvocationData: Array<ContractCall>;
          },
        ) {
          const {
            destinationAddress,
            type,
            destinationEVMChain,
            amount,
            contractInvocationData,
          } = offerArgs;

          destinationAddress != null ||
            Fail`Destination address must be defined`;
          destinationEVMChain != null ||
            Fail`Destination evm address must be defined`;

          const isContractInvocation = [1, 2].includes(type);
          if (isContractInvocation) {
            contractInvocationData != null ||
              Fail`contractInvocationData is not defined`;

            contractInvocationData.length !== 0 ||
              Fail`contractInvocationData array is empty`;
          }

          const payload =
            type === 3 ? null : buildGMPPayload(contractInvocationData);

          trace(`Payload: ${JSON.stringify(payload)}`);

          // @ts-expect-error // TODO: temporarily using mapstore to add tests
          const { chainId } = this.state.gmp.get('axelarChainInfo');

          const memo: AxelarGmpOutgoingMemo = {
            destination_chain: destinationEVMChain,
            destination_address: destinationAddress,
            payload,
            type,
          };

          if (type === 1 || type === 2) {
            memo.fee = {
              amount: String(amount.value),
              recipient: gmpAddresses.AXELAR_GAS,
            };
          }

          const denom = await chainHub.getDenom(amount.brand);
          assert(denom, 'denom must be defined');
          const denomAmount = {
            denom,
            value: amount.value,
          };

          await this.facets.keeper.getAccount(YieldProtocol.Aave).transfer(
            {
              value: gmpAddresses.AXELAR_GMP,
              encoding: 'bech32',
              chainId,
            },
            denomAmount,
            { memo: JSON.stringify(memo) },
          );

          seat.exit();
        },
        async supplyToAave({
          seat,
          aavePoolAddress,
          usdcTokenAddress,
          evmChain,
          amountToTransfer,
          amount,
        }: {
          seat: ZCFSeat;
          aavePoolAddress: `0x${string}`;
          usdcTokenAddress: `0x${string}`;
          evmChain: SupportedEVMChains;
          amountToTransfer: bigint;
          amount: Amount<'nat'>;
        }) {
          const remoteEVMAddress = this.facets.holder.getRemoteAccountAddress();
          assert(remoteEVMAddress, 'remoteEVMAddress must be defined');

          await this.facets.holder.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            destinationEVMChain: evmChain,
            type: AxelarGMPMessageType.ContractCall,
            amount,
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
        async withdrawFromAave({
          seat,
          aavePoolAddress,
          usdcTokenAddress,
          evmChain,
          amountToWithdraw,
          amount,
        }: {
          seat: ZCFSeat;
          aavePoolAddress: `0x${string}`;
          usdcTokenAddress: `0x${string}`;
          evmChain: SupportedEVMChains;
          amountToWithdraw: bigint;
          amount: Amount<'nat'>;
        }) {
          const remoteEVMAddress = this.facets.holder.getRemoteAccountAddress();
          remoteEVMAddress !== undefined ||
            Fail`remoteEVMAddress must be defined`;

          await this.facets.holder.sendGmp(seat, {
            destinationAddress: gmpAddresses.AXELAR_GMP,
            type: AxelarGMPMessageType.ContractCall,
            destinationEVMChain: evmChain,
            amount,
            contractInvocationData: [
              {
                functionSignature: 'withdraw(address,uint256,address)',
                args: [usdcTokenAddress, amountToWithdraw, remoteEVMAddress],
                target: aavePoolAddress,
              },
            ],
          });
        },

        wait(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
      },
      invitationMakers: {
        supplyToAave(
          evmChain: SupportedEVMChains,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          amountToTransfer: bigint,
          amount: Amount<'nat'>,
        ) {
          const invitation = async seat => {
            await this.facets.holder.supplyToAave({
              seat,
              aavePoolAddress,
              usdcTokenAddress,
              evmChain,
              amountToTransfer,
              amount,
            });
          };
          return zcf.makeInvitation(invitation, 'supplyToAave');
        },
        withdrawFromAave(
          evmChain: SupportedEVMChains,
          aavePoolAddress: `0x${string}`,
          usdcTokenAddress: `0x${string}`,
          amountToWithdraw: bigint,
          amount: Amount<'nat'>,
        ) {
          const invitation = async seat => {
            await this.facets.holder.withdrawFromAave({
              seat,
              aavePoolAddress,
              usdcTokenAddress,
              evmChain,
              amountToWithdraw,
              amount,
            });
          };
          return zcf.makeInvitation(invitation, 'withdrawFromAave');
        },
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
