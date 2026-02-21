import { QueryDenomTracesRequest, QueryDenomTracesResponse, QueryDenomTraceRequest, QueryDenomTraceResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomHashRequest, QueryDenomHashResponse, QueryEscrowAddressRequest, QueryEscrowAddressResponse, QueryTotalEscrowForDenomRequest, QueryTotalEscrowForDenomResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/query.js';
/**
 * DenomTraces queries all denomination traces.
 * @name getDenomTraces
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomTraces
 */
export declare const getDenomTraces: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomTracesRequest) => Promise<QueryDenomTracesResponse>;
/**
 * DenomTrace queries a denomination trace information.
 * @name getDenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomTrace
 */
export declare const getDenomTrace: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomTraceRequest) => Promise<QueryDenomTraceResponse>;
/**
 * Params queries all parameters of the ibc-transfer module.
 * @name getParams
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * DenomHash queries a denomination hash information.
 * @name getDenomHash
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.DenomHash
 */
export declare const getDenomHash: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomHashRequest) => Promise<QueryDenomHashResponse>;
/**
 * EscrowAddress returns the escrow address for a particular port and channel id.
 * @name getEscrowAddress
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.EscrowAddress
 */
export declare const getEscrowAddress: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryEscrowAddressRequest) => Promise<QueryEscrowAddressResponse>;
/**
 * TotalEscrowForDenom returns the total amount of tokens in escrow based on the denom.
 * @name getTotalEscrowForDenom
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.TotalEscrowForDenom
 */
export declare const getTotalEscrowForDenom: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryTotalEscrowForDenomRequest) => Promise<QueryTotalEscrowForDenomResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map