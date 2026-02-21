//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { ConfigRequest, ConfigResponse, StatusRequest, StatusResponse, } from '@agoric/cosmic-proto/codegen/cosmos/base/node/v1beta1/query.js';
/**
 * Config queries for the operator configuration.
 * @name getConfig
 * @package cosmos.base.node.v1beta1
 * @see proto service: cosmos.base.node.v1beta1.Config
 */
export const getConfig = buildQuery({
    encode: ConfigRequest.encode,
    decode: ConfigResponse.decode,
    service: 'cosmos.base.node.v1beta1.Service',
    method: 'Config',
    deps: [ConfigRequest, ConfigResponse],
});
/**
 * Status queries for the node status.
 * @name getStatus
 * @package cosmos.base.node.v1beta1
 * @see proto service: cosmos.base.node.v1beta1.Status
 */
export const getStatus = buildQuery({
    encode: StatusRequest.encode,
    decode: StatusResponse.decode,
    service: 'cosmos.base.node.v1beta1.Service',
    method: 'Status',
    deps: [StatusRequest, StatusResponse],
});
//# sourceMappingURL=query.rpc.func.js.map