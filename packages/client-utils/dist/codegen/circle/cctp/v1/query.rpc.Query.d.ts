import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryRolesRequest, QueryRolesResponse, QueryGetAttesterRequest, QueryGetAttesterResponse, QueryAllAttestersRequest, QueryAllAttestersResponse, QueryGetPerMessageBurnLimitRequest, QueryGetPerMessageBurnLimitResponse, QueryAllPerMessageBurnLimitsRequest, QueryAllPerMessageBurnLimitsResponse, QueryGetBurningAndMintingPausedRequest, QueryGetBurningAndMintingPausedResponse, QueryGetSendingAndReceivingMessagesPausedRequest, QueryGetSendingAndReceivingMessagesPausedResponse, QueryGetMaxMessageBodySizeRequest, QueryGetMaxMessageBodySizeResponse, QueryGetNextAvailableNonceRequest, QueryGetNextAvailableNonceResponse, QueryGetSignatureThresholdRequest, QueryGetSignatureThresholdResponse, QueryGetTokenPairRequest, QueryGetTokenPairResponse, QueryAllTokenPairsRequest, QueryAllTokenPairsResponse, QueryGetUsedNonceRequest, QueryGetUsedNonceResponse, QueryAllUsedNoncesRequest, QueryAllUsedNoncesResponse, QueryRemoteTokenMessengerRequest, QueryRemoteTokenMessengerResponse, QueryRemoteTokenMessengersRequest, QueryRemoteTokenMessengersResponse, QueryBurnMessageVersionRequest, QueryBurnMessageVersionResponse, QueryLocalMessageVersionRequest, QueryLocalMessageVersionResponse, QueryLocalDomainRequest, QueryLocalDomainResponse } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/query.js';
/** Query defines the gRPC querier service. */
export interface Query {
    roles(request?: QueryRolesRequest): Promise<QueryRolesResponse>;
    /** Queries an Attester by index */
    attester(request: QueryGetAttesterRequest): Promise<QueryGetAttesterResponse>;
    /** Queries a list of Attesters */
    attesters(request?: QueryAllAttestersRequest): Promise<QueryAllAttestersResponse>;
    /** Queries a PerMessageBurnLimit by index */
    perMessageBurnLimit(request: QueryGetPerMessageBurnLimitRequest): Promise<QueryGetPerMessageBurnLimitResponse>;
    /** Queries a list of PerMessageBurnLimits */
    perMessageBurnLimits(request?: QueryAllPerMessageBurnLimitsRequest): Promise<QueryAllPerMessageBurnLimitsResponse>;
    /** Queries BurningAndMintingPaused */
    burningAndMintingPaused(request?: QueryGetBurningAndMintingPausedRequest): Promise<QueryGetBurningAndMintingPausedResponse>;
    /** Queries SendingAndReceivingPaused */
    sendingAndReceivingMessagesPaused(request?: QueryGetSendingAndReceivingMessagesPausedRequest): Promise<QueryGetSendingAndReceivingMessagesPausedResponse>;
    /** Queries the MaxMessageBodySize */
    maxMessageBodySize(request?: QueryGetMaxMessageBodySizeRequest): Promise<QueryGetMaxMessageBodySizeResponse>;
    /** Queries the NextAvailableNonce */
    nextAvailableNonce(request?: QueryGetNextAvailableNonceRequest): Promise<QueryGetNextAvailableNonceResponse>;
    /** Queries the SignatureThreshold */
    signatureThreshold(request?: QueryGetSignatureThresholdRequest): Promise<QueryGetSignatureThresholdResponse>;
    /** Queries a TokenPair by index */
    tokenPair(request: QueryGetTokenPairRequest): Promise<QueryGetTokenPairResponse>;
    /** Queries a list of TokenPair */
    tokenPairs(request?: QueryAllTokenPairsRequest): Promise<QueryAllTokenPairsResponse>;
    /** Queries a UsedNonce by index */
    usedNonce(request: QueryGetUsedNonceRequest): Promise<QueryGetUsedNonceResponse>;
    /** Queries a list of UsedNonces */
    usedNonces(request?: QueryAllUsedNoncesRequest): Promise<QueryAllUsedNoncesResponse>;
    /** Query the RemoteTokenMessenger of a specific domain. */
    remoteTokenMessenger(request: QueryRemoteTokenMessengerRequest): Promise<QueryRemoteTokenMessengerResponse>;
    /** Query all RemoteTokenMessenger's. */
    remoteTokenMessengers(request?: QueryRemoteTokenMessengersRequest): Promise<QueryRemoteTokenMessengersResponse>;
    burnMessageVersion(request?: QueryBurnMessageVersionRequest): Promise<QueryBurnMessageVersionResponse>;
    localMessageVersion(request?: QueryLocalMessageVersionRequest): Promise<QueryLocalMessageVersionResponse>;
    localDomain(request?: QueryLocalDomainRequest): Promise<QueryLocalDomainResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    roles(request?: QueryRolesRequest): Promise<QueryRolesResponse>;
    attester(request: QueryGetAttesterRequest): Promise<QueryGetAttesterResponse>;
    attesters(request?: QueryAllAttestersRequest): Promise<QueryAllAttestersResponse>;
    perMessageBurnLimit(request: QueryGetPerMessageBurnLimitRequest): Promise<QueryGetPerMessageBurnLimitResponse>;
    perMessageBurnLimits(request?: QueryAllPerMessageBurnLimitsRequest): Promise<QueryAllPerMessageBurnLimitsResponse>;
    burningAndMintingPaused(request?: QueryGetBurningAndMintingPausedRequest): Promise<QueryGetBurningAndMintingPausedResponse>;
    sendingAndReceivingMessagesPaused(request?: QueryGetSendingAndReceivingMessagesPausedRequest): Promise<QueryGetSendingAndReceivingMessagesPausedResponse>;
    maxMessageBodySize(request?: QueryGetMaxMessageBodySizeRequest): Promise<QueryGetMaxMessageBodySizeResponse>;
    nextAvailableNonce(request?: QueryGetNextAvailableNonceRequest): Promise<QueryGetNextAvailableNonceResponse>;
    signatureThreshold(request?: QueryGetSignatureThresholdRequest): Promise<QueryGetSignatureThresholdResponse>;
    tokenPair(request: QueryGetTokenPairRequest): Promise<QueryGetTokenPairResponse>;
    tokenPairs(request?: QueryAllTokenPairsRequest): Promise<QueryAllTokenPairsResponse>;
    usedNonce(request: QueryGetUsedNonceRequest): Promise<QueryGetUsedNonceResponse>;
    usedNonces(request?: QueryAllUsedNoncesRequest): Promise<QueryAllUsedNoncesResponse>;
    remoteTokenMessenger(request: QueryRemoteTokenMessengerRequest): Promise<QueryRemoteTokenMessengerResponse>;
    remoteTokenMessengers(request?: QueryRemoteTokenMessengersRequest): Promise<QueryRemoteTokenMessengersResponse>;
    burnMessageVersion(request?: QueryBurnMessageVersionRequest): Promise<QueryBurnMessageVersionResponse>;
    localMessageVersion(request?: QueryLocalMessageVersionRequest): Promise<QueryLocalMessageVersionResponse>;
    localDomain(request?: QueryLocalDomainRequest): Promise<QueryLocalDomainResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    roles(request?: QueryRolesRequest): Promise<QueryRolesResponse>;
    attester(request: QueryGetAttesterRequest): Promise<QueryGetAttesterResponse>;
    attesters(request?: QueryAllAttestersRequest): Promise<QueryAllAttestersResponse>;
    perMessageBurnLimit(request: QueryGetPerMessageBurnLimitRequest): Promise<QueryGetPerMessageBurnLimitResponse>;
    perMessageBurnLimits(request?: QueryAllPerMessageBurnLimitsRequest): Promise<QueryAllPerMessageBurnLimitsResponse>;
    burningAndMintingPaused(request?: QueryGetBurningAndMintingPausedRequest): Promise<QueryGetBurningAndMintingPausedResponse>;
    sendingAndReceivingMessagesPaused(request?: QueryGetSendingAndReceivingMessagesPausedRequest): Promise<QueryGetSendingAndReceivingMessagesPausedResponse>;
    maxMessageBodySize(request?: QueryGetMaxMessageBodySizeRequest): Promise<QueryGetMaxMessageBodySizeResponse>;
    nextAvailableNonce(request?: QueryGetNextAvailableNonceRequest): Promise<QueryGetNextAvailableNonceResponse>;
    signatureThreshold(request?: QueryGetSignatureThresholdRequest): Promise<QueryGetSignatureThresholdResponse>;
    tokenPair(request: QueryGetTokenPairRequest): Promise<QueryGetTokenPairResponse>;
    tokenPairs(request?: QueryAllTokenPairsRequest): Promise<QueryAllTokenPairsResponse>;
    usedNonce(request: QueryGetUsedNonceRequest): Promise<QueryGetUsedNonceResponse>;
    usedNonces(request?: QueryAllUsedNoncesRequest): Promise<QueryAllUsedNoncesResponse>;
    remoteTokenMessenger(request: QueryRemoteTokenMessengerRequest): Promise<QueryRemoteTokenMessengerResponse>;
    remoteTokenMessengers(request?: QueryRemoteTokenMessengersRequest): Promise<QueryRemoteTokenMessengersResponse>;
    burnMessageVersion(request?: QueryBurnMessageVersionRequest): Promise<QueryBurnMessageVersionResponse>;
    localMessageVersion(request?: QueryLocalMessageVersionRequest): Promise<QueryLocalMessageVersionResponse>;
    localDomain(request?: QueryLocalDomainRequest): Promise<QueryLocalDomainResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map