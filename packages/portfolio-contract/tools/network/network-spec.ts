import type { NatValue } from '@agoric/ertp';
import type {
  AxelarChain,
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
  | 'cctpReturn'
  | 'cctpSlow'
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
  | 'poolToEvm';

// Chains (hubs)
export interface ChainSpec {
  name: SupportedChain;
  chainId?: string; // cosmos chain-id or network id
  evmChainId?: number; // EVM numeric chain id if applicable
  bech32Prefix?: string; // for Cosmos
  axelarKey?: AxelarChain; // Axelar registry key if differs from name
  feeDenom?: string; // e.g., 'ubld', 'uusdc'
  gasDenom?: string; // if distinct from feeDenom
  control: ControlProtocol; // how agoric reaches this chain: 'ibc' (noble) or 'axelar' (EVM) or 'local' (agoric)
}

// Pools (leaves)
export interface PoolSpec {
  pool: PoolKey; // e.g., 'Aave_Arbitrum', 'USDNVault'
  chain: SupportedChain; // host chain of the pool
  protocol: YieldProtocol; // reuse existing YieldProtocol keys
}

// Local places: seats (<Deposit>, <Cash>) and local accounts (+agoric), with local edge fees
export interface LocalPlaceSpec {
  id: AssetPlaceRef; // '<Deposit>' | '<Cash>' | '+agoric' | PoolKey (treated as local to its hub)
  chain: SupportedChain; // typically 'agoric'
  // Local edge fee/policy when connecting to the hub on the same chain
  variableFeeBps?: number;
  flatFee?: NatValue;
  timeSec?: number;
  capacity?: NatValue;
  enabled?: boolean;
}

// Directed inter-hub link
export interface LinkSpec {
  src: AssetPlaceRef;
  dest: AssetPlaceRef;

  // Fees
  variableFeeBps: number; // basis points of amount
  flatFee?: NatValue; // minor units in src fee token

  // Performance & limits
  timeSec: number; // latency
  capacity?: NatValue; // optional throughput limit
  min?: NatValue; // optional min transfer size

  // Protocols
  transfer: TransferProtocol; // asset transfer mechanism
  feeMode?: FeeMode; // how fees apply to transation using this link. See plan-solve.ts

  // Policy / guardrails (optional)
  // priority?: number; // tie-break hint
  // enabled?: boolean; // admin toggle
}

// Overall network definition
export interface NetworkSpec {
  debug?: boolean;
  environment?: 'dev' | 'test' | 'prod';

  chains: ChainSpec[];
  pools: PoolSpec[];
  localPlaces?: LocalPlaceSpec[];
  links: LinkSpec[];
}
export type { PoolKey };
