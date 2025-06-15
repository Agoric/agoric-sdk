import { makeTracer } from '@agoric/internal';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { atob, decodeBase64 } from '@endo/base64';
import { decodeAbiParameters } from 'viem';
import { type MapStore } from '@agoric/store';
import type { AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { OrchestrationAccount, CaipChainId } from '@agoric/orchestration';
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.ts';
import { PortfolioChain, YieldProtocol } from './constants.js';

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

export const supportedEVMChains: CaipChainId[] = [
  'eip155:43114', // Avalanche
  'eip155:8453', // Base
  'eip155:1', // Ethereum
];

const TypeShape = M.or(...keys(YieldProtocol));
const ChainShape = M.or(...supportedEVMChains);
const PositionShape = M.splitRecord({}); // TODO

const KeeperI = M.interface('keeper', {
  add: M.call(
    M.or(...keys(YieldProtocol)),
    M.or(...values(PortfolioChain)),
    M.remotable('OrchestrationAccount'),
  ).returns(M.number()),
  getPositions: M.call(TypeShape, ChainShape).returns(M.arrayOf(PositionShape)),
  getAccount: M.call(M.number(), TypeShape).returns(
    M.remotable('OrchestrationAccount'),
  ),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
});

type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;

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

export const preparePortfolioKit = (zone: Zone) =>
  zone.exoClassKit(
    'Portfolio',
    {
      keeper: KeeperI,
      invitationMakers: M.interface('invitationMakers', {
        // TODO
        // supplyToAave: M.call(M.record()).returns(M.promise()),
        // borrowFromAave: M.call(M.record()).returns(M.promise()),
        // supplyToCompound: M.call(M.record()).returns(M.promise()),
        // borrowFromCompound: M.call(M.record()).returns(M.promise()),
        // withdraw: M.call(M.record()).returns(M.promise()),
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

          if ((supportedEVMChains as string[]).includes(memo.source_chain)) {
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

                const sourceChain = memo.source_chain;
                const targetChainId = PortfolioChain[sourceChain];
                if (!targetChainId) {
                  trace('Unknown source chain:', sourceChain);
                } else {
                  // Find the EVM protocol position that matches the source chain
                  const { positions } = this.state;
                  for (const [key, position] of positions.entries()) {
                    if (
                      (position.type === 'Aave' ||
                        position.type === 'Compound') &&
                      position.chain === targetChainId &&
                      'remoteAccountAddress' in position
                    ) {
                      const evmState = position as EVMProtocolState;
                      positions.set(key, {
                        ...evmState,
                        remoteAccountAddress: address,
                      });
                      break;
                    }
                  }
                }

                trace('remote evm account address:', address);
              }
            }
            // TODO: Handle the result of the contract call
          }

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
            case 'Compound':
              positions.init(key, {
                type,
                localAccount: account as LocalAccount,
                chain,
                isActive,
              });
              break;
            case 'USDN':
              positions.init(key, {
                type,
                chain,
                account: account as AccountOf['USDN'],
                isActive,
              });
              break;
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
              out.push(p);
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
      },
      invitationMakers: {
        // TODO
        // supplyToAave: M.call(M.record()).returns(M.promise()),
        // borrowFromAave: M.call(M.record()).returns(M.promise()),
        // supplyToCompound: M.call(M.record()).returns(M.promise()),
        // borrowFromCompound: M.call(M.record()).returns(M.promise()),
        // withdraw: M.call(M.record()).returns(M.promise()),
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
