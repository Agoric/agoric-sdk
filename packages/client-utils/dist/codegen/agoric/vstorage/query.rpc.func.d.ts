import { QueryDataRequest, QueryDataResponse, QueryCapDataRequest, QueryCapDataResponse, QueryChildrenRequest, QueryChildrenResponse } from '@agoric/cosmic-proto/codegen/agoric/vstorage/query.js';
/**
 * Return the raw string value of an arbitrary vstorage datum.
 * @name getData
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.Data
 */
export declare const getData: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDataRequest) => Promise<QueryDataResponse>;
/**
 * Return a formatted representation of a vstorage datum that must be
 * a valid StreamCell with CapData values, or standalone CapData.
 * @name getCapData
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.CapData
 */
export declare const getCapData: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryCapDataRequest) => Promise<QueryCapDataResponse>;
/**
 * Return the children of a given vstorage path.
 * @name getChildren
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.Children
 */
export declare const getChildren: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryChildrenRequest) => Promise<QueryChildrenResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map