import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryHostZoneRequest, QueryHostZoneResponse, QueryDelegationRecordsRequest, QueryDelegationRecordsResponse, QueryUnbondingRecordsRequest, QueryUnbondingRecordsResponse, QueryRedemptionRecordRequest, QueryRedemptionRecordResponse, QueryRedemptionRecordsRequest, QueryRedemptionRecordsResponse, QuerySlashRecordsRequest, QuerySlashRecordsResponse, } from '@agoric/cosmic-proto/codegen/stride/staketia/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.hostZone = this.hostZone.bind(this);
        this.delegationRecords = this.delegationRecords.bind(this);
        this.unbondingRecords = this.unbondingRecords.bind(this);
        this.redemptionRecord = this.redemptionRecord.bind(this);
        this.redemptionRecords = this.redemptionRecords.bind(this);
        this.slashRecords = this.slashRecords.bind(this);
    }
    hostZone(request = {}) {
        const data = QueryHostZoneRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'HostZone', data);
        return promise.then(data => QueryHostZoneResponse.decode(new BinaryReader(data)));
    }
    delegationRecords(request) {
        const data = QueryDelegationRecordsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'DelegationRecords', data);
        return promise.then(data => QueryDelegationRecordsResponse.decode(new BinaryReader(data)));
    }
    unbondingRecords(request) {
        const data = QueryUnbondingRecordsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'UnbondingRecords', data);
        return promise.then(data => QueryUnbondingRecordsResponse.decode(new BinaryReader(data)));
    }
    redemptionRecord(request) {
        const data = QueryRedemptionRecordRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'RedemptionRecord', data);
        return promise.then(data => QueryRedemptionRecordResponse.decode(new BinaryReader(data)));
    }
    redemptionRecords(request) {
        const data = QueryRedemptionRecordsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'RedemptionRecords', data);
        return promise.then(data => QueryRedemptionRecordsResponse.decode(new BinaryReader(data)));
    }
    slashRecords(request = {}) {
        const data = QuerySlashRecordsRequest.encode(request).finish();
        const promise = this.rpc.request('stride.staketia.Query', 'SlashRecords', data);
        return promise.then(data => QuerySlashRecordsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        hostZone(request) {
            return queryService.hostZone(request);
        },
        delegationRecords(request) {
            return queryService.delegationRecords(request);
        },
        unbondingRecords(request) {
            return queryService.unbondingRecords(request);
        },
        redemptionRecord(request) {
            return queryService.redemptionRecord(request);
        },
        redemptionRecords(request) {
            return queryService.redemptionRecords(request);
        },
        slashRecords(request) {
            return queryService.slashRecords(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map