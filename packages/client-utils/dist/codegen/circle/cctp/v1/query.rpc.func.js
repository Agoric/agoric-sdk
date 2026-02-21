//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryRolesRequest, QueryRolesResponse, QueryGetAttesterRequest, QueryGetAttesterResponse, QueryAllAttestersRequest, QueryAllAttestersResponse, QueryGetPerMessageBurnLimitRequest, QueryGetPerMessageBurnLimitResponse, QueryAllPerMessageBurnLimitsRequest, QueryAllPerMessageBurnLimitsResponse, QueryGetBurningAndMintingPausedRequest, QueryGetBurningAndMintingPausedResponse, QueryGetSendingAndReceivingMessagesPausedRequest, QueryGetSendingAndReceivingMessagesPausedResponse, QueryGetMaxMessageBodySizeRequest, QueryGetMaxMessageBodySizeResponse, QueryGetNextAvailableNonceRequest, QueryGetNextAvailableNonceResponse, QueryGetSignatureThresholdRequest, QueryGetSignatureThresholdResponse, QueryGetTokenPairRequest, QueryGetTokenPairResponse, QueryAllTokenPairsRequest, QueryAllTokenPairsResponse, QueryGetUsedNonceRequest, QueryGetUsedNonceResponse, QueryAllUsedNoncesRequest, QueryAllUsedNoncesResponse, QueryRemoteTokenMessengerRequest, QueryRemoteTokenMessengerResponse, QueryRemoteTokenMessengersRequest, QueryRemoteTokenMessengersResponse, QueryBurnMessageVersionRequest, QueryBurnMessageVersionResponse, QueryLocalMessageVersionRequest, QueryLocalMessageVersionResponse, QueryLocalDomainRequest, QueryLocalDomainResponse, } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/query.js';
/**
 * @name getRoles
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Roles
 */
export const getRoles = buildQuery({
    encode: QueryRolesRequest.encode,
    decode: QueryRolesResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'Roles',
    deps: [QueryRolesRequest, QueryRolesResponse],
});
/**
 * Queries an Attester by index
 * @name getAttester
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attester
 */
export const getAttester = buildQuery({
    encode: QueryGetAttesterRequest.encode,
    decode: QueryGetAttesterResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'Attester',
    deps: [QueryGetAttesterRequest, QueryGetAttesterResponse],
});
/**
 * Queries a list of Attesters
 * @name getAttesters
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attesters
 */
export const getAttesters = buildQuery({
    encode: QueryAllAttestersRequest.encode,
    decode: QueryAllAttestersResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'Attesters',
    deps: [QueryAllAttestersRequest, QueryAllAttestersResponse],
});
/**
 * Queries a PerMessageBurnLimit by index
 * @name getPerMessageBurnLimit
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimit
 */
export const getPerMessageBurnLimit = buildQuery({
    encode: QueryGetPerMessageBurnLimitRequest.encode,
    decode: QueryGetPerMessageBurnLimitResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'PerMessageBurnLimit',
    deps: [
        QueryGetPerMessageBurnLimitRequest,
        QueryGetPerMessageBurnLimitResponse,
    ],
});
/**
 * Queries a list of PerMessageBurnLimits
 * @name getPerMessageBurnLimits
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimits
 */
export const getPerMessageBurnLimits = buildQuery({
    encode: QueryAllPerMessageBurnLimitsRequest.encode,
    decode: QueryAllPerMessageBurnLimitsResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'PerMessageBurnLimits',
    deps: [
        QueryAllPerMessageBurnLimitsRequest,
        QueryAllPerMessageBurnLimitsResponse,
    ],
});
/**
 * Queries BurningAndMintingPaused
 * @name getBurningAndMintingPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurningAndMintingPaused
 */
export const getBurningAndMintingPaused = buildQuery({
    encode: QueryGetBurningAndMintingPausedRequest.encode,
    decode: QueryGetBurningAndMintingPausedResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'BurningAndMintingPaused',
    deps: [
        QueryGetBurningAndMintingPausedRequest,
        QueryGetBurningAndMintingPausedResponse,
    ],
});
/**
 * Queries SendingAndReceivingPaused
 * @name getSendingAndReceivingMessagesPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export const getSendingAndReceivingMessagesPaused = buildQuery({
    encode: QueryGetSendingAndReceivingMessagesPausedRequest.encode,
    decode: QueryGetSendingAndReceivingMessagesPausedResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'SendingAndReceivingMessagesPaused',
    deps: [
        QueryGetSendingAndReceivingMessagesPausedRequest,
        QueryGetSendingAndReceivingMessagesPausedResponse,
    ],
});
/**
 * Queries the MaxMessageBodySize
 * @name getMaxMessageBodySize
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.MaxMessageBodySize
 */
export const getMaxMessageBodySize = buildQuery({
    encode: QueryGetMaxMessageBodySizeRequest.encode,
    decode: QueryGetMaxMessageBodySizeResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'MaxMessageBodySize',
    deps: [QueryGetMaxMessageBodySizeRequest, QueryGetMaxMessageBodySizeResponse],
});
/**
 * Queries the NextAvailableNonce
 * @name getNextAvailableNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.NextAvailableNonce
 */
export const getNextAvailableNonce = buildQuery({
    encode: QueryGetNextAvailableNonceRequest.encode,
    decode: QueryGetNextAvailableNonceResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'NextAvailableNonce',
    deps: [QueryGetNextAvailableNonceRequest, QueryGetNextAvailableNonceResponse],
});
/**
 * Queries the SignatureThreshold
 * @name getSignatureThreshold
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SignatureThreshold
 */
export const getSignatureThreshold = buildQuery({
    encode: QueryGetSignatureThresholdRequest.encode,
    decode: QueryGetSignatureThresholdResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'SignatureThreshold',
    deps: [QueryGetSignatureThresholdRequest, QueryGetSignatureThresholdResponse],
});
/**
 * Queries a TokenPair by index
 * @name getTokenPair
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPair
 */
export const getTokenPair = buildQuery({
    encode: QueryGetTokenPairRequest.encode,
    decode: QueryGetTokenPairResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'TokenPair',
    deps: [QueryGetTokenPairRequest, QueryGetTokenPairResponse],
});
/**
 * Queries a list of TokenPair
 * @name getTokenPairs
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPairs
 */
export const getTokenPairs = buildQuery({
    encode: QueryAllTokenPairsRequest.encode,
    decode: QueryAllTokenPairsResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'TokenPairs',
    deps: [QueryAllTokenPairsRequest, QueryAllTokenPairsResponse],
});
/**
 * Queries a UsedNonce by index
 * @name getUsedNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonce
 */
export const getUsedNonce = buildQuery({
    encode: QueryGetUsedNonceRequest.encode,
    decode: QueryGetUsedNonceResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'UsedNonce',
    deps: [QueryGetUsedNonceRequest, QueryGetUsedNonceResponse],
});
/**
 * Queries a list of UsedNonces
 * @name getUsedNonces
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonces
 */
export const getUsedNonces = buildQuery({
    encode: QueryAllUsedNoncesRequest.encode,
    decode: QueryAllUsedNoncesResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'UsedNonces',
    deps: [QueryAllUsedNoncesRequest, QueryAllUsedNoncesResponse],
});
/**
 * Query the RemoteTokenMessenger of a specific domain.
 * @name getRemoteTokenMessenger
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessenger
 */
export const getRemoteTokenMessenger = buildQuery({
    encode: QueryRemoteTokenMessengerRequest.encode,
    decode: QueryRemoteTokenMessengerResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'RemoteTokenMessenger',
    deps: [QueryRemoteTokenMessengerRequest, QueryRemoteTokenMessengerResponse],
});
/**
 * Query all RemoteTokenMessenger's.
 * @name getRemoteTokenMessengers
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessengers
 */
export const getRemoteTokenMessengers = buildQuery({
    encode: QueryRemoteTokenMessengersRequest.encode,
    decode: QueryRemoteTokenMessengersResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'RemoteTokenMessengers',
    deps: [QueryRemoteTokenMessengersRequest, QueryRemoteTokenMessengersResponse],
});
/**
 * @name getBurnMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurnMessageVersion
 */
export const getBurnMessageVersion = buildQuery({
    encode: QueryBurnMessageVersionRequest.encode,
    decode: QueryBurnMessageVersionResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'BurnMessageVersion',
    deps: [QueryBurnMessageVersionRequest, QueryBurnMessageVersionResponse],
});
/**
 * @name getLocalMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalMessageVersion
 */
export const getLocalMessageVersion = buildQuery({
    encode: QueryLocalMessageVersionRequest.encode,
    decode: QueryLocalMessageVersionResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'LocalMessageVersion',
    deps: [QueryLocalMessageVersionRequest, QueryLocalMessageVersionResponse],
});
/**
 * @name getLocalDomain
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalDomain
 */
export const getLocalDomain = buildQuery({
    encode: QueryLocalDomainRequest.encode,
    decode: QueryLocalDomainResponse.decode,
    service: 'circle.cctp.v1.Query',
    method: 'LocalDomain',
    deps: [QueryLocalDomainRequest, QueryLocalDomainResponse],
});
//# sourceMappingURL=query.rpc.func.js.map