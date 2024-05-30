import type {
  QueryAllBalancesRequest,
  QueryAllBalancesResponse,
  QueryBalanceRequestProtoMsg,
} from './codegen/cosmos/bank/v1beta1/query.js';
import type {
  MsgSend,
  MsgSendResponse,
} from './codegen/cosmos/bank/v1beta1/tx.js';
import type {
  MsgDelegate,
  MsgDelegateResponse,
  MsgUndelegate,
  MsgUndelegateResponse,
} from './codegen/cosmos/staking/v1beta1/tx.js';
import type { Any } from './codegen/google/protobuf/any.js';
import {
  MsgTransfer,
  MsgTransferResponse,
} from './codegen/ibc/applications/transfer/v1/tx.js';
import type { JsonSafe } from './codegen/index.js';
import { RequestQuery } from './codegen/tendermint/abci/types.js';

/**
 * The result of Any.toJSON(). Exported at top level as a convenience
 * for a very common import.
 */
export type AnyJson = JsonSafe<Any>;

// TODO codegen this by modifying Telescope
export type Proto3Shape = {
  '/cosmos.bank.v1beta1.MsgSend': MsgSend;
  '/cosmos.bank.v1beta1.MsgSendResponse': MsgSendResponse;
  '/cosmos.bank.v1beta1.QueryAllBalancesRequest': QueryAllBalancesRequest;
  '/cosmos.bank.v1beta1.QueryAllBalancesResponse': QueryAllBalancesResponse;
  '/cosmos.staking.v1beta1.MsgDelegate': MsgDelegate;
  '/cosmos.staking.v1beta1.MsgDelegateResponse': MsgDelegateResponse;
  '/cosmos.staking.v1beta1.MsgUndelegate': MsgUndelegate;
  '/cosmos.staking.v1beta1.MsgUndelegateResponse': MsgUndelegateResponse;
  '/ibc.applications.transfer.v1.MsgTransfer': MsgTransfer;
  '/ibc.applications.transfer.v1.MsgTransferResponse': MsgTransferResponse;
};

// Often s/Request$/Response/ but not always
type ResponseMap = {
  '/cosmos.bank.v1beta1.MsgSend': '/cosmos.bank.v1beta1.MsgSendResponse';
  '/cosmos.bank.v1beta1.QueryAllBalancesRequest': '/cosmos.bank.v1beta1.QueryAllBalancesResponse';
  '/cosmos.staking.v1beta1.MsgDelegate': '/cosmos.staking.v1beta1.MsgDelegateResponse';
  '/ibc.applications.transfer.v1.MsgTransfer': '/ibc.applications.transfer.v1.MsgTransferResponse';
  '/cosmos.staking.v1beta1.MsgUndelegate': '/cosmos.staking.v1beta1.MsgUndelegateResponse';
};

/**
 * The encoding introduced in Protobuf 3 for Any that can be serialized to JSON.
 *
 * Technically JSON is a string, a notation encoding a JSON object. So this is
 * more accurately "JSON-ifiable" but we don't expect anyone to confuse this
 * type with a string.
 */
export type TypedJson<T extends unknown | keyof Proto3Shape = unknown> =
  T extends keyof Proto3Shape
    ? Proto3Shape[T] & {
        '@type': T;
      }
    : { '@type': string };

export type ResponseTo<T extends TypedJson> =
  T['@type'] extends keyof ResponseMap
    ? TypedJson<ResponseMap[T['@type']]>
    : TypedJson;

export const typedJson = <T extends keyof Proto3Shape>(
  typeStr: T,
  obj: Proto3Shape[T],
) => {
  return {
    '@type': typeStr,
    ...obj,
  } as TypedJson<T>;
};

const QUERY_REQ_TYPEURL_RE =
  /^\/(?<serviceName>\w+(?:\.\w+)*)\.Query(?<methodName>\w+)Request$/;

export const typeUrlToGrpcPath = (typeUrl: Any['typeUrl']) => {
  const match = typeUrl.match(QUERY_REQ_TYPEURL_RE);
  if (!(match && match.groups)) {
    throw new TypeError(
      `Invalid typeUrl: ${typeUrl}. Must be a Query Request.`,
    );
  }
  const { serviceName, methodName } = match.groups;
  return `/${serviceName}.Query/${methodName}`;
};

type RequestQueryOpts = Partial<Omit<RequestQuery, 'path' | 'data'>>;

export const toRequestQueryJson = (
  msg: QueryBalanceRequestProtoMsg,
  opts: RequestQueryOpts = {},
) =>
  RequestQuery.toJSON(
    RequestQuery.fromPartial({
      path: typeUrlToGrpcPath(msg.typeUrl),
      data: msg.value,
      ...opts,
    }),
  );
