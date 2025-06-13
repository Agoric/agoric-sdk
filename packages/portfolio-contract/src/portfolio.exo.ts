import { makeTracer } from '@agoric/internal';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { atob, decodeBase64 } from '@endo/base64';
import { decodeAbiParameters } from 'viem';
import { type MapStore } from '@agoric/store';
import type {
  AxelarGmpIncomingMemo,
  SupportedDestinationChains,
} from '@agoric/orchestration/src/axelar-types.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { OrchestrationAccount } from '@agoric/orchestration';
import { YieldProtocol } from './constants.js';

const trace = makeTracer('PortExo');

const KeeperI = M.interface('keeper', {
  init: M.call(M.string(), M.remotable('OrchestrationAccount')).returns(),
  getAccount: M.call(M.string()).returns(M.remotable('OrchestrationAccount')),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
});

const supportedDestinationChains: SupportedDestinationChains[] = [
  'Avalanche',
  'Base',
  'Ethereum',
];

type EVMProtocolState = {
  localAccount?: OrchestrationAccount<{ chainId: 'agoric-any' }>;
  remoteAccountAddress?: string;
  evmChain?: string;
  isActive: boolean;
};

type CosmosProtocolState = {
  icaAccount?: OrchestrationAccount<{ chainId: 'noble-any' }>;
  isActive: boolean;
};

type PortfolioKitStateShape = {
  protocolStates: MapStore<
    YieldProtocol,
    CosmosProtocolState | EVMProtocolState
  >;
};

export const preparePortfolioKit = (zone: Zone) =>
  zone.exoClassKit(
    'Portfolio',
    {
      keeper: KeeperI,
      invitationMakers: M.interface('invitationMakers', {
        // supplyToAave: M.call(M.record()).returns(M.promise()),
        // borrowFromAave: M.call(M.record()).returns(M.promise()),
        // supplyToCompound: M.call(M.record()).returns(M.promise()),
        // borrowFromCompound: M.call(M.record()).returns(M.promise()),
        // withdraw: M.call(M.record()).returns(M.promise()),
      }),
      tap: EvmTapI,
    },

    (): PortfolioKitStateShape => {
      return harden({
        protocolStates: zone.mapStore('protocolStates'),
      });
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

          if (
            supportedDestinationChains.includes(
              memo.source_chain as SupportedDestinationChains,
            )
          ) {
            const payloadBytes = decodeBase64(memo.payload);
            const [{ isContractCallResult, data }] = decodeAbiParameters(
              [
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
              ],
              payloadBytes,
            );

            trace(
              'receiveUpcall Decoded:',
              JSON.stringify({ isContractCallResult, data }),
            );

            // TODO: Handle the result of the contract call
          }

          trace('receiveUpcall completed');
        },
      },
      keeper: {
        init(
          key: YieldProtocol,
          account:
            | OrchestrationAccount<{ chainId: 'agoric-any' }>
            | OrchestrationAccount<{ chainId: 'noble-any' }>,
        ) {
          if (key === 'USDN') {
            this.state.protocolStates.init(
              key,
              harden({
                icaAccount: account as OrchestrationAccount<{
                  chainId: 'noble-any';
                }>,
                isActive: true,
              }),
            );
          } else {
            // Aave or Compound
            this.state.protocolStates.init(
              key,
              harden({
                localAccount: account as OrchestrationAccount<{
                  chainId: 'agoric-any';
                }>,
                remoteAccountAddress: undefined,
                evmChain: undefined,
                isActive: true,
              }),
            );
          }

          trace('initialized account for', key, '=>', `${account}`);
        },
        getAccount(
          key: YieldProtocol,
        ):
          | OrchestrationAccount<{ chainId: 'agoric-any' }>
          | OrchestrationAccount<{ chainId: 'noble-any' }> {
          if (!this.state.protocolStates.has(key)) {
            throw Fail`account not initialized: ${q(key)}`;
          }
          const protocolState = this.state.protocolStates.get(key);
          if (key === 'USDN') {
            const cosmosState = protocolState as CosmosProtocolState;
            if (!cosmosState.icaAccount) {
              throw Fail`account not initialized: ${q(key)}`;
            }
            return cosmosState.icaAccount;
          } else {
            const evmState = protocolState as EVMProtocolState;
            if (!evmState.localAccount) {
              throw Fail`account not initialized: ${q(key)}`;
            }
            return evmState.localAccount;
          }
        },
      },
      invitationMakers: {
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
