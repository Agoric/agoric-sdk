import type { QueryAllBalancesRequest } from './codegen/cosmos/bank/v1beta1/query.js';
import type { MsgSend } from './codegen/cosmos/bank/v1beta1/tx.js';
import type { MsgDelegate } from './codegen/cosmos/staking/v1beta1/tx.js';
import type { RequestQuery } from './codegen/tendermint/abci/types.js';

/**
 * The result of Any.toJSON(). The type in cosms-types says it returns
 * `unknown` but it's actually this. The `value` string is a base64 encoding of
 * the bytes array.
 */
export type AnyJson = { typeUrl: string; value: string };

// TODO codegen this by modifying Telescope
export type Proto3Shape = {
  '/cosmos.bank.v1beta1.MsgSend': MsgSend;
  '/cosmos.bank.v1beta1.QueryAllBalancesRequest': QueryAllBalancesRequest;
  '/cosmos.staking.v1beta1.MsgDelegate': MsgDelegate;
};

/**
 * The encoding introduced in Protobuf 3 for Any that can be serialized to JSON.
 *
 * Technically JSON is a string, a notation encoding a JSON object. So this is
 * more accurately "JSON-ifiable" but we don't expect anyone to confuse this
 * type with a string.
 */
export type TypedJson<T extends unknown | keyof Proto3Shape = unknown> =
  T extends unknown
    ? { '@type': string }
    : T extends keyof Proto3Shape
      ? Proto3Shape[T] & {
          '@type': T;
        }
      : never;

export const typedJson = <T extends keyof Proto3Shape>(
  typeStr: T,
  obj: Proto3Shape[T],
) => {
  return {
    '@type': typeStr,
    ...obj,
  } as TypedJson<T>;
};

// TODO make codegen toJSON() return these instead of unknown
/**
 * Proto Any with arrays encoded as base64
 */
export type Base64Any<T> = {
  [Prop in keyof T]: T[Prop] extends Uint8Array ? string : T[Prop];
};

// TODO make codegen toJSON() return these instead of unknown
// https://github.com/cosmology-tech/telescope/issues/605
/**
 * Mimics behavor of .toJSON(), converting Uint8Array to base64 strings
 * and bigints to strings
 */
export type JsonSafe<T> = {
  [Prop in keyof T]: T[Prop] extends Uint8Array
    ? string
    : T[Prop] extends bigint
      ? string
      : T[Prop];
};

/**
 * The result of RequestQuery.toJSON(). The type in cosms-types says it returns
 * `unknown` but it's actually this. The Uint8Array fields are base64 encoded, while
 * bigint fields are strings.
 */
export type RequestQueryJson = JsonSafe<RequestQuery>;
