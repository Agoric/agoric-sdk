import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { makeTracer, type Remote } from '@agoric/internal';
import {
  type OrchestrationAccount,
  type CaipChainId,
} from '@agoric/orchestration';
import { type AxelarGmpIncomingMemo } from '@agoric/orchestration/src/axelar-types.js';
import { decodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import { type MapStore } from '@agoric/store';
import type { TimerService } from '@agoric/time';
import type { VTransferIBCEvent } from '@agoric/vats';
import { VowShape, type VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { AgoricResponse } from '@aglocal/boot/tools/axelar-supports.js';
import { atob, decodeBase64 } from '@endo/base64';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
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
const PositionShape = M.splitRecord({}); // TODO

const KeeperI = M.interface('keeper', {
  addAavePosition: M.call(M.string()).returns(),
  addCompoundPosition: M.call(M.string()).returns(),
  addUSDNPosition: M.call(
    M.string(),
    M.remotable('OrchestrationAccount'),
  ).returns(),
  getPositions: M.call(TypeShape, M.string()).returns(M.arrayOf(PositionShape)),
  getAccount: M.call(TypeShape).returns(M.remotable('OrchestrationAccount')),
});

const HolderI = M.interface('Holder', {
  setupGmpLCA: M.call(M.remotable('OrchestrationAccount')).returns(),
  getRemoteAccountAddress: M.call().returns(M.or(M.string(), M.undefined())),
  wait: M.call(M.bigint()).returns(VowShape),
});

const EvmTapI = M.interface('EvmTap', {
  receiveUpcall: M.call(M.record()).returns(M.or(VowShape, M.undefined())),
});

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;

type AxelarGmpManager = {
  localAccount: LocalAccount;
  remoteAccountAddress?: string;
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
    timer,
    axelarChainsMap,
    vowTools,
  }: {
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
      invitationMakers: M.interface('invitationMakers', {}),
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
          let memo: AxelarGmpIncomingMemo;
          try {
            memo = JSON.parse(tx.memo);
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

              // TODO: ensure remoteAccountAddress is setup only once
              const manager = this.state.gmp.get('manager');
              this.state.gmp.set('manager', {
                ...manager,
                remoteAccountAddress: address,
              });

              trace(`remoteAccountAddress ${address}`);
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
        getRemoteAccountAddress(): string | undefined {
          return this.state.gmp.get('manager').remoteAccountAddress;
        },
        wait(val: bigint) {
          return vowTools.watch(E(timer).delay(val));
        },
      },
      invitationMakers: {},
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
harden(preparePortfolioKit);
