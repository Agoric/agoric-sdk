import { ConfigRequest, ConfigResponse, StatusRequest, StatusResponse } from '@agoric/cosmic-proto/codegen/cosmos/base/node/v1beta1/query.js';
/**
 * Config queries for the operator configuration.
 * @name getConfig
 * @package cosmos.base.node.v1beta1
 * @see proto service: cosmos.base.node.v1beta1.Config
 */
export declare const getConfig: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: ConfigRequest) => Promise<ConfigResponse>;
/**
 * Status queries for the node status.
 * @name getStatus
 * @package cosmos.base.node.v1beta1
 * @see proto service: cosmos.base.node.v1beta1.Status
 */
export declare const getStatus: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: StatusRequest) => Promise<StatusResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map