import { keyMirror } from '@agoric/internal';

/**
 * @import {PureData} from '@endo/pass-style';
 * @import {AccountId, HexAddress, TrafficEntry} from '@agoric/orchestration';
 * @import {TxId} from './types.js';
 * @import {SupportedInstructions} from '@aglocal/portfolio-contract/src/interfaces/orch-router.js';
 */

/**
 * Statuses for published transactions. Exhaustive state machine transitions:
 *   - setup -> pending (when transaction information is assembled and sent)
 *   - pending -> success (when cross-chain operation completes successfully)
 *   - pending -> failed (when operation fails or times out)
 *
 * @enum {(typeof TxStatus)[keyof typeof TxStatus]}
 */
export const TxStatus = /** @type {const} */ ({
  SETUP: 'setup',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
});
harden(TxStatus);

/**
 * Tx types for published transactions
 *
 * @enum {Readonly<(typeof TxType)[keyof typeof TxType]>}
 */
export const TxType = keyMirror({
  CCTP_TO_EVM: null,
  GMP: null,
  ROUTED_GMP: null,
  CCTP_TO_AGORIC: null,
  IBC_FROM_AGORIC: null,
  IBC_FROM_REMOTE: null,
  MAKE_ACCOUNT: null,
  /**
   * Placeholder for ProgressTracker protocols not yet recognized by the
   * resolver client, just so they can be published to vstorage, but not
   * processed any further.  If these appear, it means the resolver client
   * source code needs to be updated.
   */
  UNKNOWN: null,
});
harden(TxType);

/**
 * @typedef {Partial<Omit<TrafficEntry, 'dst'>> & {
 *   type: TxType & ('IBC_FROM_AGORIC' | 'IBC_FROM_REMOTE');
 *   dest?: TrafficEntry['dst']
 *   amount?: bigint;
 * }} PublishedTrafficTxDetails
 * Adapt orchestration TrafficEntry to the portfolio's PublishedTx type.
 * - Rename 'dst' to 'dest' for consistency with portfolio-contract.
 * - Add optional 'amount' property.
 */

/**
 * Represents a transaction published in vstorage at
 * `published.${contractInstance}.pendingTxs.tx${number}`
 * with its type, optional amount, destination, and status.
 *
 * @typedef {object} PublishedPortfolioTxDetails
 * @property {Exclude<TxType, PublishedTrafficTxDetails['type'] | 'ROUTED_GMP'>} type - The type of
 * transaction (CCTP_TO_EVM, GMP, CCTP_TO_AGORIC, or MAKE_ACCOUNT)
 * @property {bigint} [amount] - Optional transaction amount as a bigint, currently in micro-USDC (6 decimal fixed-point)
 * @property {AccountId} [destinationAddress] - The destination account
 * identifier for the transaction
 * @property {AccountId} [sourceAddress] - The source LCA address initiating the
 * transaction (required for GMP and MAKE_ACCOUNT transactions)
 * @property {HexAddress} [expectedAddr] - The expected address of the EVM smart
 * wallet to be created (only for type "MAKE_ACCOUNT")
 * @property {HexAddress} [factoryAddr] - The address of the EVM smart wallet
 * factory contract responsible for creating the smart wallet (only for type
 * "MAKE_ACCOUNT")
 */

/**
 * Core debugging details that every pending ROUTED_GMP transaction publish
 *
 * @typedef {object} RoutedGMPTxBaseDetails
 * @property {`0x${string}`} instructionSelector - The 4-byte function selector of the process instruction function
 * @property {SupportedInstructions} instructionType - The routed instruction type
 * @property {HexAddress} expectedRemoteTargetAddress - The EVM address corresponding to the source LCA address
 */

/**
 * Specialized case of a transaction published in vstorage at
 * `published.${contractInstance}.pendingTxs.tx${number}`
 * for the ROUTED_GMP type.
 *
 * @typedef {object} PublishedRoutedGMPTxDetails
 * @property {TxType & ('ROUTED_GMP')} type - The type of transaction, always "ROUTED_GMP"
 * @property {AccountId} destinationAddress - The router account handling this transaction
 * @property {AccountId} sourceAddress - The source LCA address initiating the
 * transaction (either portfolio or contract)
 * @property {true} [incomplete] - Flag indicating that the initial transaction registration is incomplete and awaiting payloadHash and details update
 * @property {`0x${string}`} [payloadHash] - The hash of the GMP Payload
 * @property {RoutedGMPTxBaseDetails & Record<string, PureData>} [details] - Debugging details
 */

// eslint-disable-next-line @agoric/group-jsdoc-imports
/**
 * @typedef {object} PublishedTxBase
 * @property {TxType} type - The type of transaction (CCTP_TO_EVM, GMP, CCTP_TO_AGORIC, or MAKE_ACCOUNT)
 * @property {TxStatus} status - Current status of the transaction (pending, success, or failed)
 * @property {string} [rejectionReason] - Optional reason for failure (only present when status is 'failed')
 * @property {TxId} [nextTxId] - DEPRECATED in favor of {@link import('./types.js').FlowStep['phases']}. Optional ID of the next transaction in a sequence
 */

/**
 * @typedef {PublishedTxBase & (PublishedTrafficTxDetails | PublishedPortfolioTxDetails | PublishedRoutedGMPTxDetails)} PublishedTx
 */
