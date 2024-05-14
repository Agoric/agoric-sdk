/* eslint-disable no-use-before-define -- fine for types */
// Ambients
import '@agoric/zoe/exported.js';

import { ChainAddress, DenomArg, TransferMsg } from './orchestration-api.js';

export type * from './chain-info.js';
export type * from './cosmos-api.js';
export type * from './ethereum-api.js';
export type * from './exos/chainAccountKit.js';
export type * from './exos/icqConnectionKit.js';
export type * from './orchestration-api.js';
export type * from './service.js';
export type * from './vat-orchestration.js';

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
