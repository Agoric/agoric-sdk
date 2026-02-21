import { QueryParamsRequest, QueryParamsResponse, QueryInflationRequest, QueryInflationResponse, QueryAnnualProvisionsRequest, QueryAnnualProvisionsResponse } from '@agoric/cosmic-proto/codegen/cosmos/mint/v1beta1/query.js';
/**
 * Params returns the total set of minting parameters.
 * @name getParams
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Inflation returns the current minting inflation value.
 * @name getInflation
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.Inflation
 */
export declare const getInflation: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryInflationRequest) => Promise<QueryInflationResponse>;
/**
 * AnnualProvisions current minting annual provisions value.
 * @name getAnnualProvisions
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.AnnualProvisions
 */
export declare const getAnnualProvisions: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAnnualProvisionsRequest) => Promise<QueryAnnualProvisionsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map