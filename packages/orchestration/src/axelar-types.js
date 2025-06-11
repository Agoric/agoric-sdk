/**
 * @import {OrchestrationAccount,
 *   CosmosChainAddress,
 *   Denom,
 *   Bech32Address,} from '@agoric/orchestration';
 * @import {IBCChannelID} from '@agoric/vats';
 * @import {EVM_CHAINS} from './utils/gmp.js';
 */

// NOTE: The following 3 types are also documented in README.md located at:
// @agoric/orchestration/docs/axelar-gmp/README.md
// - GMPMessageType
// - AxelarFeeObject
// - AxelarGmpOutgoingMemo
// If you change any of these, you must also update the README to keep it in sync.

export const AxelarGMPMessageType = {
  ContractCall: 1,
  ContractCallWithToken: 2,
  TokenTransfer: 3,
};

/**
 * @typedef {(typeof AxelarGMPMessageType)[keyof typeof AxelarGMPMessageType]} GMPMessageType
 */

/**
 * @typedef {object} AxelarGmpIncomingMemo
 * @property {string} source_chain
 * @property {string} source_address
 * @property {string} payload
 * @property {GMPMessageType} type
 */

/**
 * @typedef {object} AxelarFeeObject
 * @property {string} amount
 * @property {Bech32Address} recipient
 */

/**
 * @typedef {object} AxelarGmpOutgoingMemo
 * @property {string} destination_chain
 * @property {string} destination_address
 * @property {number[] | null} payload
 * @property {GMPMessageType} type
 * @property {AxelarFeeObject} [fee]
 */

/**
 * @typedef {object} EvmTapState
 * @property {OrchestrationAccount<{ chainId: 'agoric' }>} localAccount
 * @property {CosmosChainAddress} localChainAddress
 * @property {IBCChannelID} sourceChannel
 * @property {Denom} localDenom
 * @property {any} assets
 * @property {any} remoteChainInfo
 */

/**
 * @typedef {object} ContractCall
 * @property {`0x${string}`} target
 * @property {string} functionSignature
 * @property {unknown[]} args
 */

/**
 * @typedef {object} AbiEncodedContractCall
 * @property {`0x${string}`} target
 * @property {`0x${string}`} data
 */

/**
 * @typedef {keyof typeof EVM_CHAINS} SupportedDestinationChains
 */
