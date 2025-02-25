import { makeError } from '@endo/errors';
import { decodeBase64 } from '@endo/base64';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';

/**
 * @import {CosmosDelegationResponse, CosmosValidatorAddress, DenomAmount} from '../types.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js'
 * @import {DelegationResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 */

/** maximum clock skew, in seconds, for unbonding time reported from other chain */
export const maxClockSkew = 10n * 60n;

/**
 * @template T
 * @param {string} ackStr
 * @param {(p: { typeUrl: string; value: Uint8Array }) => T} fromProtoMsg
 */
export const tryDecodeResponse = (ackStr, fromProtoMsg) => {
  try {
    const any = Any.decode(decodeBase64(ackStr));
    const protoMsg = Any.decode(any.value);

    const msg = fromProtoMsg(protoMsg);
    return msg;
  } catch (cause) {
    throw makeError(`bad response: ${ackStr}`, undefined, { cause });
  }
};

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
    value: r.delegation.delegatorAddress,
  },
  validator: toCosmosValidatorAddress(r.delegation, chainId),
  amount: toDenomAmount(r.balance),
});
