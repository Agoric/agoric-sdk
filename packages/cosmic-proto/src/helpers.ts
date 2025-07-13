import { RequestQuery } from './codegen/tendermint/abci/types.js';

import type { TypeFromUrl } from './codegen/typeFromUrl.js';
import type { JsonSafe } from './codegen/index.js';
import type { Any } from './codegen/google/protobuf/any.js';
import type { QueryBalanceRequestProtoMsg } from './codegen/cosmos/bank/v1beta1/query.js';

/**
 * The result of Any.toJSON(). Exported at top level as a convenience
 * for a very common import.
 */
export type AnyJson = JsonSafe<Any>;

/**
 * The encoding introduced in Protobuf 3 for Any that can be serialized to JSON.
 *
 * Technically JSON is a string, a notation encoding a JSON object. So this is
 * more accurately "JSON-ifiable" but we don't expect anyone to confuse this
 * type with a string.
 */
export type TypedJson<TU extends unknown | keyof TypeFromUrl = unknown> =
  TU extends keyof TypeFromUrl
    ? TypeFromUrl[TU] & {
        '@type': TU;
      }
    : { '@type': string };

export type MessageBody<TU extends keyof TypeFromUrl | unknown> = Omit<
  TypedJson<TU>,
  '@type'
>;

/** General pattern for Request that has a corresponding Response */
type RequestTypeUrl<Base extends string> = `/${Base}Request`;
/** Pattern specific to Msg sends, in which "Msg" without "Response" implies it's a request */
type TxMessageTypeUrl<
  Package extends string,
  Name extends Capitalize<string>,
> = `/${Package}.Msg${Name}`;

export type ResponseTo<T extends TypedJson> =
  T['@type'] extends RequestTypeUrl<infer Base>
    ? TypedJson<`/${Base}Response`>
    : T['@type'] extends TxMessageTypeUrl<infer Package, infer Name>
      ? TypedJson<`/${Package}.Msg${Name}Response`>
      : TypedJson;

export const typedJson = <TU extends keyof TypeFromUrl>(
  typeStr: TU,
  value: MessageBody<TU>,
) => {
  return {
    '@type': typeStr,
    ...value,
  } as TypedJson<TU>;
};

const QUERY_REQ_TYPEURL_RE =
  /^\/(?<serviceName>\w+(?:\.\w+)*)\.Query(?<methodName>\w+)Request$/;

export const typeUrlToGrpcPath = (typeUrl: Any['typeUrl']) => {
  const match = typeUrl.match(QUERY_REQ_TYPEURL_RE);
  if (!(match && match.groups)) {
    throw TypeError(`Invalid typeUrl: ${typeUrl}. Must be a Query Request.`);
  }
  const { serviceName, methodName } = match.groups;
  return `/${serviceName}.Query/${methodName}`;
};

type RequestQueryOpts = Partial<Omit<RequestQuery, 'path' | 'data'>>;

export const toRequestQueryJson = (
  msg: Any | QueryBalanceRequestProtoMsg,
  opts: RequestQueryOpts = {},
) =>
  RequestQuery.toJSON(
    RequestQuery.fromPartial({
      path: typeUrlToGrpcPath(msg.typeUrl),
      data: msg.value,
      ...opts,
    }),
  );
