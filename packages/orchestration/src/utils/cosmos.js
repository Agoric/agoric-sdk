import { makeError } from '@endo/errors';
import { decodeBase64 } from '@endo/base64';
import { CodecHelper } from '@agoric/cosmic-proto';
import { TxMsgData as TxMsgDataType } from '@agoric/cosmic-proto/cosmos/base/abci/v1beta1/abci.js';

const TxMsgData = CodecHelper(TxMsgDataType);

/**
 * @import {Bech32Address, CosmosDelegationResponse, CosmosValidatorAddress, DenomAmount} from '../types.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js'
 * @import {DelegationResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {Proto3CodecHelper, MessageBody} from '@agoric/cosmic-proto';
 */

/** maximum clock skew, in seconds, for unbonding time reported from other chain */
export const maxClockSkew = 10n * 60n;

/**
 * @template {string[]} TUS
 * @param {string} ackStr
 * @param {{ [K in keyof TUS]: Proto3CodecHelper<TUS[K]> }} codecs
 */
export const tryDecodeResponses = (ackStr, codecs) => {
  try {
    const { msgResponses } = TxMsgData.decode(decodeBase64(ackStr));
    const results = codecs.map((codec, i) => {
      return codec.fromProtoMsg(msgResponses[i]);
    });
    return /** @type {{ [T in keyof TUS]: MessageBody<TUS[T]> }} */ (results);
  } catch (cause) {
    throw makeError(`bad response: ${ackStr}`, undefined, { cause });
  }
};

/**
 * @deprecated use {@link tryDecodeResponses} instead
 * @template {string} TU
 * @param {string} ackStr
 * @param {Proto3CodecHelper<TU>} codec
 */
export const tryDecodeResponse = (ackStr, codec) =>
  tryDecodeResponses(ackStr, /** @type {const} */ ([codec]))[0];

/**
 * Transform a cosmos-sdk {@link Coin} object into a {@link DenomAmount}
 *
 * @type {(c: { denom: string; amount: string }) => DenomAmount}
 * @see {@link toTruncatedDenomAmount} for DecCoin
 */
export const toDenomAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });

/**
 * Transform a cosmos-sdk {@link DecCoin} object into a {@link DenomAmount}, by
 * truncating the fractional portion.
 *
 * @type {(c: { denom: string; amount: string }) => DenomAmount}
 */
export const toTruncatedDenomAmount = c => ({
  denom: c.denom,
  value: BigInt(c.amount.split('.')[0]),
});

/**
 * Transform a cosmos-sdk `{validatorAddress}` object into an Orchestration
 * {@link CosmosValidatorAddress}
 *
 * @type {(
 *   r: { validatorAddress: string },
 *   chainId: string,
 * ) => CosmosValidatorAddress}
 */
export const toCosmosValidatorAddress = (r, chainId) => ({
  encoding: 'bech32',
  value: /** @type {CosmosValidatorAddress['value']} */ (r.validatorAddress),
  chainId,
});

/**
 * Transform a cosmos-sdk {@link DelegationResponse} object into an Orchestration
 * {@link CosmosDelegationResponse}
 *
 * @type {(
 *   chainInfo: { chainId: string },
 *   r: DelegationResponse,
 * ) => CosmosDelegationResponse}
 */
export const toCosmosDelegationResponse = ({ chainId }, r) => ({
  delegator: {
    chainId,
    encoding: 'bech32',
    value: /** @type {Bech32Address} */ (r.delegation.delegatorAddress),
  },
  validator: toCosmosValidatorAddress(r.delegation, chainId),
  amount: toDenomAmount(r.balance),
});
