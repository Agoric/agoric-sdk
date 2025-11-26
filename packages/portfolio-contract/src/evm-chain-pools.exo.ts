/**
 * @file Aggregator of per-chain EvmChainKit pools.
 *
 * Goal: centralize lazy creation + warming of account pools so that
 * portfolio flows can simply call `requestEvmAccount(chain, fee, gas)`.
 *
 * Integration Path (incremental):
 * 1. Contract setup creates an instance of EvmChainPools (no pools yet).
 * 2. Once the Agoric local account (lca) and fee account promise are known,
 *    call `initialize(base)` exactly once.
 * 3. Flows replace calls to `provideEVMAccount(...)` with
 *       `kit.reader.requestEvmAccount(chain, fee, gas)` (that method will
 *       delegate to the pools facet here).
 * 4. Optional: call `warm(chain, count, fee, gas)` during startup / bootstrap
 *    to pre-provision a cache of remote accounts.
 *
 * This keeps migration lightweight: you don't need orchestration API changes
 * first, only to route through the new pooling layer.
 */
import { M } from '@endo/patterns';
import type { Zone } from '@agoric/zone';
import type { Passable } from '@endo/marshal';
import type { DenomAmount, Chain } from '@agoric/orchestration';
import type { Vow, VowTools } from '@agoric/vow';
import { VowShape } from '@agoric/vow';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { LocalAccount } from './portfolio.flows.js';
import type { GmpAddresses } from './portfolio.contract.js';
import type { GMPAccountInfo } from './portfolio.exo.js';
import {
  prepareEvmChainKit,
  type ProvisionContext,
  type EvmChainKit,
} from './evm-chain.exo.js';

export type PoolsInitializeArgs = {
  lca: LocalAccount; // Agoric local account (controller)
  feeAccountP: Promise<LocalAccount>; // separate fee funding account
  gmpChain: Chain<{ chainId: string }>; // axelar cosmos chain handle
  gmpAddresses: GmpAddresses; // { AXELAR_GMP, AXELAR_GAS }
  axelarIds: Record<AxelarChain, string>; // mapping chainName -> axelarId
  contracts: Record<AxelarChain, { factory: `0x${string}` }>; // remote factory per chain
};

type PoolsState = {
  initialized: boolean;
  initArgs?: PoolsInitializeArgs;
  kits: Partial<Record<AxelarChain, EvmChainKit>>;
};

export const prepareEvmChainPools = (
  zone: Zone,
  {
    publishStatus,
    vowTools,
  }: {
    publishStatus: (path: string[], status: Passable) => void;
    vowTools: Pick<VowTools, 'makeVowKit' | 'asVow' | 'when'>;
  },
) => {
  const makeKit = (
    chainName: AxelarChain,
    init: PoolsInitializeArgs,
  ): EvmChainKit => {
    const { lca, feeAccountP, gmpChain, gmpAddresses, axelarIds, contracts } =
      init;
    const provisionBase: ProvisionContext = {
      label: `evm-${chainName}`,
      lca,
      feeAccountP,
      target: {
        axelarId: axelarIds[chainName],
        remoteAddress: contracts[chainName].factory,
      },
      gmpChain,
      gmpAddresses,
    };
    return prepareEvmChainKit(zone, { publishStatus, vowTools })(
      chainName,
      ['portfolio', 'evmPools'],
      `evmPools-${chainName}`,
      provisionBase,
    );
  };

  return zone.exoClassKit(
    'EvmChainPools',
    {
      pools: M.interface('EvmChainPoolsFacet', {
        requestEvmAccount: M.call(M.string(), M.record(), M.bigint()).returns(
          VowShape,
        ),
      }),
      admin: M.interface('EvmChainPoolsAdminFacet', {
        initialize: M.call(M.record()).returns(M.undefined()),
        warm: M.call(M.string(), M.number(), M.record(), M.bigint()).returns(
          M.undefined(),
        ),
        getSnapshot: M.call().returns(M.record()),
      }),
    },
    (): PoolsState => ({ initialized: false, kits: {} }),
    {
      pools: {
        requestEvmAccount(
          chainName: string,
          fee: DenomAmount,
          evmGas: bigint,
        ): Vow<GMPAccountInfo> {
          const cName = chainName as AxelarChain;
          const { state } = this;
          state.initialized ||
            ((): never => {
              throw Error('EvmChainPools not initialized');
            })();
          let kit = state.kits[cName];
          if (!kit) {
            kit = makeKit(cName, state.initArgs!);
            state.kits[cName] = kit;
          }
          return kit.account.requestAccount(fee, evmGas) as Vow<GMPAccountInfo>;
        },
      },
      admin: {
        initialize(args: PoolsInitializeArgs) {
          const { state } = this;
          if (state.initialized)
            throw Error('EvmChainPools already initialized');
          state.initialized = true;
          state.initArgs = args;
        },
        warm(
          chainName: string,
          count: number,
          fee: DenomAmount,
          evmGas: bigint,
        ) {
          const cName = chainName as AxelarChain;
          const { state } = this;
          state.initialized ||
            ((): never => {
              throw Error('EvmChainPools not initialized');
            })();
          let kit = state.kits[cName];
          if (!kit) {
            kit = makeKit(cName, state.initArgs!);
            state.kits[cName] = kit;
          }
          kit.admin.provisionMany(count, fee, evmGas);
        },
        getSnapshot() {
          const { state } = this;
          const entries = Object.entries(state.kits).map(([k, kit]) => [
            k,
            kit?.admin.getStateSnapshot(),
          ]);
          return harden({ initialized: state.initialized, chains: entries });
        },
      },
    },
  );
};

export type EvmChainPoolsKit = ReturnType<
  ReturnType<typeof prepareEvmChainPools>
>;
