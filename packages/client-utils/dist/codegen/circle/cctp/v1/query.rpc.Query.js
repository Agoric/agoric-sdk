import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryRolesRequest, QueryRolesResponse, QueryGetAttesterRequest, QueryGetAttesterResponse, QueryAllAttestersRequest, QueryAllAttestersResponse, QueryGetPerMessageBurnLimitRequest, QueryGetPerMessageBurnLimitResponse, QueryAllPerMessageBurnLimitsRequest, QueryAllPerMessageBurnLimitsResponse, QueryGetBurningAndMintingPausedRequest, QueryGetBurningAndMintingPausedResponse, QueryGetSendingAndReceivingMessagesPausedRequest, QueryGetSendingAndReceivingMessagesPausedResponse, QueryGetMaxMessageBodySizeRequest, QueryGetMaxMessageBodySizeResponse, QueryGetNextAvailableNonceRequest, QueryGetNextAvailableNonceResponse, QueryGetSignatureThresholdRequest, QueryGetSignatureThresholdResponse, QueryGetTokenPairRequest, QueryGetTokenPairResponse, QueryAllTokenPairsRequest, QueryAllTokenPairsResponse, QueryGetUsedNonceRequest, QueryGetUsedNonceResponse, QueryAllUsedNoncesRequest, QueryAllUsedNoncesResponse, QueryRemoteTokenMessengerRequest, QueryRemoteTokenMessengerResponse, QueryRemoteTokenMessengersRequest, QueryRemoteTokenMessengersResponse, QueryBurnMessageVersionRequest, QueryBurnMessageVersionResponse, QueryLocalMessageVersionRequest, QueryLocalMessageVersionResponse, QueryLocalDomainRequest, QueryLocalDomainResponse, } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.roles = this.roles.bind(this);
        this.attester = this.attester.bind(this);
        this.attesters = this.attesters.bind(this);
        this.perMessageBurnLimit = this.perMessageBurnLimit.bind(this);
        this.perMessageBurnLimits = this.perMessageBurnLimits.bind(this);
        this.burningAndMintingPaused = this.burningAndMintingPaused.bind(this);
        this.sendingAndReceivingMessagesPaused =
            this.sendingAndReceivingMessagesPaused.bind(this);
        this.maxMessageBodySize = this.maxMessageBodySize.bind(this);
        this.nextAvailableNonce = this.nextAvailableNonce.bind(this);
        this.signatureThreshold = this.signatureThreshold.bind(this);
        this.tokenPair = this.tokenPair.bind(this);
        this.tokenPairs = this.tokenPairs.bind(this);
        this.usedNonce = this.usedNonce.bind(this);
        this.usedNonces = this.usedNonces.bind(this);
        this.remoteTokenMessenger = this.remoteTokenMessenger.bind(this);
        this.remoteTokenMessengers = this.remoteTokenMessengers.bind(this);
        this.burnMessageVersion = this.burnMessageVersion.bind(this);
        this.localMessageVersion = this.localMessageVersion.bind(this);
        this.localDomain = this.localDomain.bind(this);
    }
    roles(request = {}) {
        const data = QueryRolesRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'Roles', data);
        return promise.then(data => QueryRolesResponse.decode(new BinaryReader(data)));
    }
    attester(request) {
        const data = QueryGetAttesterRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'Attester', data);
        return promise.then(data => QueryGetAttesterResponse.decode(new BinaryReader(data)));
    }
    attesters(request = {
        pagination: undefined,
    }) {
        const data = QueryAllAttestersRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'Attesters', data);
        return promise.then(data => QueryAllAttestersResponse.decode(new BinaryReader(data)));
    }
    perMessageBurnLimit(request) {
        const data = QueryGetPerMessageBurnLimitRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'PerMessageBurnLimit', data);
        return promise.then(data => QueryGetPerMessageBurnLimitResponse.decode(new BinaryReader(data)));
    }
    perMessageBurnLimits(request = {
        pagination: undefined,
    }) {
        const data = QueryAllPerMessageBurnLimitsRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'PerMessageBurnLimits', data);
        return promise.then(data => QueryAllPerMessageBurnLimitsResponse.decode(new BinaryReader(data)));
    }
    burningAndMintingPaused(request = {}) {
        const data = QueryGetBurningAndMintingPausedRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'BurningAndMintingPaused', data);
        return promise.then(data => QueryGetBurningAndMintingPausedResponse.decode(new BinaryReader(data)));
    }
    sendingAndReceivingMessagesPaused(request = {}) {
        const data = QueryGetSendingAndReceivingMessagesPausedRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'SendingAndReceivingMessagesPaused', data);
        return promise.then(data => QueryGetSendingAndReceivingMessagesPausedResponse.decode(new BinaryReader(data)));
    }
    maxMessageBodySize(request = {}) {
        const data = QueryGetMaxMessageBodySizeRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'MaxMessageBodySize', data);
        return promise.then(data => QueryGetMaxMessageBodySizeResponse.decode(new BinaryReader(data)));
    }
    nextAvailableNonce(request = {}) {
        const data = QueryGetNextAvailableNonceRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'NextAvailableNonce', data);
        return promise.then(data => QueryGetNextAvailableNonceResponse.decode(new BinaryReader(data)));
    }
    signatureThreshold(request = {}) {
        const data = QueryGetSignatureThresholdRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'SignatureThreshold', data);
        return promise.then(data => QueryGetSignatureThresholdResponse.decode(new BinaryReader(data)));
    }
    tokenPair(request) {
        const data = QueryGetTokenPairRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'TokenPair', data);
        return promise.then(data => QueryGetTokenPairResponse.decode(new BinaryReader(data)));
    }
    tokenPairs(request = {
        pagination: undefined,
    }) {
        const data = QueryAllTokenPairsRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'TokenPairs', data);
        return promise.then(data => QueryAllTokenPairsResponse.decode(new BinaryReader(data)));
    }
    usedNonce(request) {
        const data = QueryGetUsedNonceRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'UsedNonce', data);
        return promise.then(data => QueryGetUsedNonceResponse.decode(new BinaryReader(data)));
    }
    usedNonces(request = {
        pagination: undefined,
    }) {
        const data = QueryAllUsedNoncesRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'UsedNonces', data);
        return promise.then(data => QueryAllUsedNoncesResponse.decode(new BinaryReader(data)));
    }
    remoteTokenMessenger(request) {
        const data = QueryRemoteTokenMessengerRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'RemoteTokenMessenger', data);
        return promise.then(data => QueryRemoteTokenMessengerResponse.decode(new BinaryReader(data)));
    }
    remoteTokenMessengers(request = {
        pagination: undefined,
    }) {
        const data = QueryRemoteTokenMessengersRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'RemoteTokenMessengers', data);
        return promise.then(data => QueryRemoteTokenMessengersResponse.decode(new BinaryReader(data)));
    }
    burnMessageVersion(request = {}) {
        const data = QueryBurnMessageVersionRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'BurnMessageVersion', data);
        return promise.then(data => QueryBurnMessageVersionResponse.decode(new BinaryReader(data)));
    }
    localMessageVersion(request = {}) {
        const data = QueryLocalMessageVersionRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'LocalMessageVersion', data);
        return promise.then(data => QueryLocalMessageVersionResponse.decode(new BinaryReader(data)));
    }
    localDomain(request = {}) {
        const data = QueryLocalDomainRequest.encode(request).finish();
        const promise = this.rpc.request('circle.cctp.v1.Query', 'LocalDomain', data);
        return promise.then(data => QueryLocalDomainResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        roles(request) {
            return queryService.roles(request);
        },
        attester(request) {
            return queryService.attester(request);
        },
        attesters(request) {
            return queryService.attesters(request);
        },
        perMessageBurnLimit(request) {
            return queryService.perMessageBurnLimit(request);
        },
        perMessageBurnLimits(request) {
            return queryService.perMessageBurnLimits(request);
        },
        burningAndMintingPaused(request) {
            return queryService.burningAndMintingPaused(request);
        },
        sendingAndReceivingMessagesPaused(request) {
            return queryService.sendingAndReceivingMessagesPaused(request);
        },
        maxMessageBodySize(request) {
            return queryService.maxMessageBodySize(request);
        },
        nextAvailableNonce(request) {
            return queryService.nextAvailableNonce(request);
        },
        signatureThreshold(request) {
            return queryService.signatureThreshold(request);
        },
        tokenPair(request) {
            return queryService.tokenPair(request);
        },
        tokenPairs(request) {
            return queryService.tokenPairs(request);
        },
        usedNonce(request) {
            return queryService.usedNonce(request);
        },
        usedNonces(request) {
            return queryService.usedNonces(request);
        },
        remoteTokenMessenger(request) {
            return queryService.remoteTokenMessenger(request);
        },
        remoteTokenMessengers(request) {
            return queryService.remoteTokenMessengers(request);
        },
        burnMessageVersion(request) {
            return queryService.burnMessageVersion(request);
        },
        localMessageVersion(request) {
            return queryService.localMessageVersion(request);
        },
        localDomain(request) {
            return queryService.localDomain(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map