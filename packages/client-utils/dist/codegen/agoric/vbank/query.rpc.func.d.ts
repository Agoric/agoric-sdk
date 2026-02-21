import { QueryParamsRequest, QueryParamsResponse, QueryStateRequest, QueryStateResponse } from '@agoric/cosmic-proto/codegen/agoric/vbank/query.js';
/**
 * Params queries params of the vbank module.
 * @name getParams
 * @package agoric.vbank
 * @see proto service: agoric.vbank.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * State queries current state of the vbank module.
 * @name getState
 * @package agoric.vbank
 * @see proto service: agoric.vbank.State
 */
export declare const getState: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryStateRequest) => Promise<QueryStateResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map