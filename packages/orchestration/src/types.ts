/* eslint-disable no-use-before-define -- fine for types */
// Ambients
import '@agoric/zoe/exported.js';

import type { CosmosChainInfo, LiquidStakingMethods } from './cosmos-api.js';
import type { EthChainInfo } from './ethereum-api.js';
import { ChainAddress, DenomArg, TransferMsg } from './orchestration-api.js';

export type * from './cosmos-api.js';
export type * from './ethereum-api.js';
export type * from './exos/chainAccountKit.js';
export type * from './exos/icqConnectionKit.js';
export type * from './orchestration-api.js';
export type * from './service.js';
export type * from './vat-orchestration.js';

/**
 * static declaration of known chain types will allow type support for
 * additional chain-specific operations like `liquidStake`
 */
export type KnownChains = {
  stride: {
    info: CosmosChainInfo;
    methods: LiquidStakingMethods;
  };
  cosmos: { info: CosmosChainInfo; methods: {} };
  agoric: {
    info: Omit<CosmosChainInfo, 'ibcConnectionInfo'>;
    methods: {
      // TODO reference type from #8624 `packages/vats/src/localchain.js`
      /**
       * Register a hook to intercept an incoming IBC Transfer and handle it.
       * Calling without arguments will unregister the hook.
       */
      interceptTransfer: (tap?: {
        upcall: (args: any) => Promise<any>;
      }) => Promise<void>;
    };
  };
  celestia: { info: CosmosChainInfo; methods: {} };
  osmosis: { info: CosmosChainInfo; methods: {} };
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;

// marker interface
interface QueryResult {}

/**
 * @param pool - Required. Pool number
 * @example
 * await icaNoble.transferSteps(usdcAmt,
 *  osmosisSwap(tiaBrand, { pool: 1224, slippage: 0.05 }, icaCel.getAddress()));
 */
export type OsmoSwapOptions = {
  pool: string;
  slippage?: Number;
};

/**
 * Make a TransferMsg for a swap operation.
 * @param denom - the currency to swap to
 * @param options
 * @param slippage - the maximum acceptable slippage
 */
export type OsmoSwapFn = (
  denom: DenomArg,
  options: Partial<OsmoSwapOptions>,
  next: TransferMsg | ChainAddress,
) => TransferMsg;
