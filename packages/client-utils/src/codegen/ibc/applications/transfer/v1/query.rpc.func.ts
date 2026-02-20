//@ts-nocheck
import { buildQuery } from '../../../../helper-func-types.js';
import {
  QueryDenomTracesRequest,
  QueryDenomTracesResponse,
  QueryDenomTraceRequest,
  QueryDenomTraceResponse,
  QueryParamsRequest,
  QueryParamsResponse,
  QueryDenomHashRequest,
  QueryDenomHashResponse,
  QueryEscrowAddressRequest,
  QueryEscrowAddressResponse,
  QueryTotalEscrowForDenomRequest,
  QueryTotalEscrowForDenomResponse,
} from './query.js';
/**
 * DenomTraces queries all denomination traces.
 * @name getDenomTraces
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomTraces
 */
export const getDenomTraces = buildQuery<
  QueryDenomTracesRequest,
  QueryDenomTracesResponse
>({
  encode: QueryDenomTracesRequest.encode,
  decode: QueryDenomTracesResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'DenomTraces',
});
/**
 * DenomTrace queries a denomination trace information.
 * @name getDenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomTrace
 */
export const getDenomTrace = buildQuery<
  QueryDenomTraceRequest,
  QueryDenomTraceResponse
>({
  encode: QueryDenomTraceRequest.encode,
  decode: QueryDenomTraceResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'DenomTrace',
});
/**
 * Params queries all parameters of the ibc-transfer module.
 * @name getParams
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'Params',
});
/**
 * DenomHash queries a denomination hash information.
 * @name getDenomHash
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomHash
 */
export const getDenomHash = buildQuery<
  QueryDenomHashRequest,
  QueryDenomHashResponse
>({
  encode: QueryDenomHashRequest.encode,
  decode: QueryDenomHashResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'DenomHash',
});
/**
 * EscrowAddress returns the escrow address for a particular port and channel id.
 * @name getEscrowAddress
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.EscrowAddress
 */
export const getEscrowAddress = buildQuery<
  QueryEscrowAddressRequest,
  QueryEscrowAddressResponse
>({
  encode: QueryEscrowAddressRequest.encode,
  decode: QueryEscrowAddressResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'EscrowAddress',
});
/**
 * TotalEscrowForDenom returns the total amount of tokens in escrow based on the denom.
 * @name getTotalEscrowForDenom
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.TotalEscrowForDenom
 */
export const getTotalEscrowForDenom = buildQuery<
  QueryTotalEscrowForDenomRequest,
  QueryTotalEscrowForDenomResponse
>({
  encode: QueryTotalEscrowForDenomRequest.encode,
  decode: QueryTotalEscrowForDenomResponse.decode,
  service: 'ibc.applications.transfer.v1.Query',
  method: 'TotalEscrowForDenom',
});
