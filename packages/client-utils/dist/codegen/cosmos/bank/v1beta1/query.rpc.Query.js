import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryBalanceRequest, QueryBalanceResponse, QueryAllBalancesRequest, QueryAllBalancesResponse, QuerySpendableBalancesRequest, QuerySpendableBalancesResponse, QuerySpendableBalanceByDenomRequest, QuerySpendableBalanceByDenomResponse, QueryTotalSupplyRequest, QueryTotalSupplyResponse, QuerySupplyOfRequest, QuerySupplyOfResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomMetadataRequest, QueryDenomMetadataResponse, QueryDenomMetadataByQueryStringRequest, QueryDenomMetadataByQueryStringResponse, QueryDenomsMetadataRequest, QueryDenomsMetadataResponse, QueryDenomOwnersRequest, QueryDenomOwnersResponse, QueryDenomOwnersByQueryRequest, QueryDenomOwnersByQueryResponse, QuerySendEnabledRequest, QuerySendEnabledResponse, } from '@agoric/cosmic-proto/codegen/cosmos/bank/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.balance = this.balance.bind(this);
        this.allBalances = this.allBalances.bind(this);
        this.spendableBalances = this.spendableBalances.bind(this);
        this.spendableBalanceByDenom = this.spendableBalanceByDenom.bind(this);
        this.totalSupply = this.totalSupply.bind(this);
        this.supplyOf = this.supplyOf.bind(this);
        this.params = this.params.bind(this);
        this.denomMetadata = this.denomMetadata.bind(this);
        this.denomMetadataByQueryString =
            this.denomMetadataByQueryString.bind(this);
        this.denomsMetadata = this.denomsMetadata.bind(this);
        this.denomOwners = this.denomOwners.bind(this);
        this.denomOwnersByQuery = this.denomOwnersByQuery.bind(this);
        this.sendEnabled = this.sendEnabled.bind(this);
    }
    balance(request) {
        const data = QueryBalanceRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'Balance', data);
        return promise.then(data => QueryBalanceResponse.decode(new BinaryReader(data)));
    }
    allBalances(request) {
        const data = QueryAllBalancesRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'AllBalances', data);
        return promise.then(data => QueryAllBalancesResponse.decode(new BinaryReader(data)));
    }
    spendableBalances(request) {
        const data = QuerySpendableBalancesRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'SpendableBalances', data);
        return promise.then(data => QuerySpendableBalancesResponse.decode(new BinaryReader(data)));
    }
    spendableBalanceByDenom(request) {
        const data = QuerySpendableBalanceByDenomRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'SpendableBalanceByDenom', data);
        return promise.then(data => QuerySpendableBalanceByDenomResponse.decode(new BinaryReader(data)));
    }
    totalSupply(request = {
        pagination: undefined,
    }) {
        const data = QueryTotalSupplyRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'TotalSupply', data);
        return promise.then(data => QueryTotalSupplyResponse.decode(new BinaryReader(data)));
    }
    supplyOf(request) {
        const data = QuerySupplyOfRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'SupplyOf', data);
        return promise.then(data => QuerySupplyOfResponse.decode(new BinaryReader(data)));
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
    denomMetadata(request) {
        const data = QueryDenomMetadataRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'DenomMetadata', data);
        return promise.then(data => QueryDenomMetadataResponse.decode(new BinaryReader(data)));
    }
    denomMetadataByQueryString(request) {
        const data = QueryDenomMetadataByQueryStringRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'DenomMetadataByQueryString', data);
        return promise.then(data => QueryDenomMetadataByQueryStringResponse.decode(new BinaryReader(data)));
    }
    denomsMetadata(request = {
        pagination: undefined,
    }) {
        const data = QueryDenomsMetadataRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'DenomsMetadata', data);
        return promise.then(data => QueryDenomsMetadataResponse.decode(new BinaryReader(data)));
    }
    denomOwners(request) {
        const data = QueryDenomOwnersRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'DenomOwners', data);
        return promise.then(data => QueryDenomOwnersResponse.decode(new BinaryReader(data)));
    }
    denomOwnersByQuery(request) {
        const data = QueryDenomOwnersByQueryRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'DenomOwnersByQuery', data);
        return promise.then(data => QueryDenomOwnersByQueryResponse.decode(new BinaryReader(data)));
    }
    sendEnabled(request) {
        const data = QuerySendEnabledRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.bank.v1beta1.Query', 'SendEnabled', data);
        return promise.then(data => QuerySendEnabledResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        balance(request) {
            return queryService.balance(request);
        },
        allBalances(request) {
            return queryService.allBalances(request);
        },
        spendableBalances(request) {
            return queryService.spendableBalances(request);
        },
        spendableBalanceByDenom(request) {
            return queryService.spendableBalanceByDenom(request);
        },
        totalSupply(request) {
            return queryService.totalSupply(request);
        },
        supplyOf(request) {
            return queryService.supplyOf(request);
        },
        params(request) {
            return queryService.params(request);
        },
        denomMetadata(request) {
            return queryService.denomMetadata(request);
        },
        denomMetadataByQueryString(request) {
            return queryService.denomMetadataByQueryString(request);
        },
        denomsMetadata(request) {
            return queryService.denomsMetadata(request);
        },
        denomOwners(request) {
            return queryService.denomOwners(request);
        },
        denomOwnersByQuery(request) {
            return queryService.denomOwnersByQuery(request);
        },
        sendEnabled(request) {
            return queryService.sendEnabled(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map