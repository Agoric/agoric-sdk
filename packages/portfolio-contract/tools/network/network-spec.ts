import type { NatValue } from '@agoric/ertp';
import type {
  YieldProtocol,
  SupportedChain,
} from '@agoric/portfolio-api/src/constants.js';

import type { PoolKey } from '../../src/type-guards.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';

// Control and transfer planes
export type ControlProtocol = 'ibc' | 'axelar' | 'local';
export type TransferProtocol =
  | 'ibc'
  | 'fastusdc'
  | 'cctpFromNoble'
  | 'cctpToNoble' // (often to a forwarding address)
  | 'cctpV2'
  | 'local';
/**
 * Link to Factory and Wallet contracts:
 * https://github.com/agoric-labs/agoric-to-axelar-local/blob/cd6087fa44de3b019b2cdac6962bb49b6a2bc1ca/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol
 *
 * Steps submitted to the contract are expected to include fee/gas payment
 * details which vary by the traversed link.
 * - toUSDN: transferring into USDN transfer reduces the *payload* (e.g., $10k
 *   might get reduced to $9995)
 * - makeEvmAccount: the fee for executing the Factory contract to
 *   create a new remote wallet
 * - evmToNoble: the fee for running the tx to send tokens from the remote wallet
 *   to Noble
 * - evmToPool: the fee for sending and executing a tx on the Wallet contract
 *   to supply tokens to a specified pool
 * - poolToEvm: the fee for sending and executing a tx on the Wallet contract
 *   to withdraw tokens from a specified pool
 */
export type FeeMode =
  | 'toUSDN'
  | 'makeEvmAccount'
  | 'evmToNoble'
  | 'evmToPool'
  | 'poolToEvm'
  | 'evmToEvm';

// Chains (hubs)
export interface ChainSpec {
  readonly name: SupportedChain;
  /** how agoric reaches this chain: 'ibc' (noble) or 'axelar' (EVM) or 'local' (agoric) */
  readonly control: ControlProtocol;
  /** minimum delta amount for planned moves involving this chain */
  readonly deltaSoftMin?: NatValue;
}

// Pools (leaves)
export interface PoolSpec {
  readonly pool: PoolKey;
  /** host chain of the corresponding instrument */
  readonly chain: SupportedChain;
  /** protocol of the corresponding instrument */
  readonly protocol: YieldProtocol;
}

/**
 * A +agoric local account or <Deposit>/<Cash> Agoric blockchain contract seat.
 */
export interface LocalPlaceSpec {
  readonly id: '<Deposit>' | '<Cash>' | '+agoric';
  readonly chain: 'agoric';
}

/**
 * A directed edge from one place to another, usually having at least one hub
 * endpoint.
 */
export interface LinkSpec {
  readonly src: AssetPlaceRef;
  readonly dest: AssetPlaceRef;

  /**
   * variable transfer fee in basis points to be applied against the transferred
   * amount of major units (e.g., USDC)
   */
  readonly variableFeeBps: number;
  /** flat-rate transfer fee in minor units (e.g., uusdc) */
  readonly flatFee?: NatValue;

  /** expected transfer settlement time in seconds */
  readonly timeSec: number;
  /** inclusive maximum transfer amount in minor units (e.g., uusdc) */
  readonly capacity?: NatValue;
  /** inclusive minimum transfer amount in minor units (e.g., uusdc) */
  readonly min?: NatValue;

  /** mechanism by which the transfer occurs */
  readonly transfer: TransferProtocol;
  /** designator for how fees apply to transactions over this link */
  readonly feeMode?: FeeMode;
}

/** Details of how chains/pools/etc. and how they connect. */
export interface NetworkSpec {
  readonly debug?: boolean;
  readonly environment?: 'dev' | 'test' | 'prod';

  readonly chains: ChainSpec[];
  readonly pools: PoolSpec[];
  readonly localPlaces?: LocalPlaceSpec[];
  readonly links: LinkSpec[];
}
export type { PoolKey };
