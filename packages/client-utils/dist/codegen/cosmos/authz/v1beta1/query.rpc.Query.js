import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryGrantsRequest, QueryGrantsResponse, QueryGranterGrantsRequest, QueryGranterGrantsResponse, QueryGranteeGrantsRequest, QueryGranteeGrantsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.grants = this.grants.bind(this);
        this.granterGrants = this.granterGrants.bind(this);
        this.granteeGrants = this.granteeGrants.bind(this);
    }
    grants(request) {
        const data = QueryGrantsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.authz.v1beta1.Query', 'Grants', data);
        return promise.then(data => QueryGrantsResponse.decode(new BinaryReader(data)));
    }
    granterGrants(request) {
        const data = QueryGranterGrantsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.authz.v1beta1.Query', 'GranterGrants', data);
        return promise.then(data => QueryGranterGrantsResponse.decode(new BinaryReader(data)));
    }
    granteeGrants(request) {
        const data = QueryGranteeGrantsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.authz.v1beta1.Query', 'GranteeGrants', data);
        return promise.then(data => QueryGranteeGrantsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        grants(request) {
            return queryService.grants(request);
        },
        granterGrants(request) {
            return queryService.granterGrants(request);
        },
        granteeGrants(request) {
            return queryService.granteeGrants(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map