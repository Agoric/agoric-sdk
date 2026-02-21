import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { QueryClient } from '@cosmjs/stargate';
import { ConfigRequest, ConfigResponse, StatusRequest, StatusResponse } from '@agoric/cosmic-proto/codegen/cosmos/base/node/v1beta1/query.js';
/** Service defines the gRPC querier service for node related queries. */
export interface Service {
    /** Config queries for the operator configuration. */
    config(request?: ConfigRequest): Promise<ConfigResponse>;
    /** Status queries for the node status. */
    status(request?: StatusRequest): Promise<StatusResponse>;
}
export declare class ServiceClientImpl implements Service {
    private readonly rpc;
    constructor(rpc: TxRpc);
    config(request?: ConfigRequest): Promise<ConfigResponse>;
    status(request?: StatusRequest): Promise<StatusResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    config(request?: ConfigRequest): Promise<ConfigResponse>;
    status(request?: StatusRequest): Promise<StatusResponse>;
};
//# sourceMappingURL=query.rpc.Service.d.ts.map