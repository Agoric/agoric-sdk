//@ts-nocheck
import { buildQuery } from '../../../helper-func-types.js';
import {
  QueryRolesRequest,
  QueryRolesResponse,
  QueryGetAttesterRequest,
  QueryGetAttesterResponse,
  QueryAllAttestersRequest,
  QueryAllAttestersResponse,
  QueryGetPerMessageBurnLimitRequest,
  QueryGetPerMessageBurnLimitResponse,
  QueryAllPerMessageBurnLimitsRequest,
  QueryAllPerMessageBurnLimitsResponse,
  QueryGetBurningAndMintingPausedRequest,
  QueryGetBurningAndMintingPausedResponse,
  QueryGetSendingAndReceivingMessagesPausedRequest,
  QueryGetSendingAndReceivingMessagesPausedResponse,
  QueryGetMaxMessageBodySizeRequest,
  QueryGetMaxMessageBodySizeResponse,
  QueryGetNextAvailableNonceRequest,
  QueryGetNextAvailableNonceResponse,
  QueryGetSignatureThresholdRequest,
  QueryGetSignatureThresholdResponse,
  QueryGetTokenPairRequest,
  QueryGetTokenPairResponse,
  QueryAllTokenPairsRequest,
  QueryAllTokenPairsResponse,
  QueryGetUsedNonceRequest,
  QueryGetUsedNonceResponse,
  QueryAllUsedNoncesRequest,
  QueryAllUsedNoncesResponse,
  QueryRemoteTokenMessengerRequest,
  QueryRemoteTokenMessengerResponse,
  QueryRemoteTokenMessengersRequest,
  QueryRemoteTokenMessengersResponse,
  QueryBurnMessageVersionRequest,
  QueryBurnMessageVersionResponse,
  QueryLocalMessageVersionRequest,
  QueryLocalMessageVersionResponse,
  QueryLocalDomainRequest,
  QueryLocalDomainResponse,
} from './query.js';
/**
 * @name getRoles
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Roles
 */
export const getRoles = buildQuery<QueryRolesRequest, QueryRolesResponse>({
  encode: QueryRolesRequest.encode,
  decode: QueryRolesResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'Roles',
});
/**
 * Queries an Attester by index
 * @name getAttester
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attester
 */
export const getAttester = buildQuery<
  QueryGetAttesterRequest,
  QueryGetAttesterResponse
>({
  encode: QueryGetAttesterRequest.encode,
  decode: QueryGetAttesterResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'Attester',
});
/**
 * Queries a list of Attesters
 * @name getAttesters
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attesters
 */
export const getAttesters = buildQuery<
  QueryAllAttestersRequest,
  QueryAllAttestersResponse
>({
  encode: QueryAllAttestersRequest.encode,
  decode: QueryAllAttestersResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'Attesters',
});
/**
 * Queries a PerMessageBurnLimit by index
 * @name getPerMessageBurnLimit
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimit
 */
export const getPerMessageBurnLimit = buildQuery<
  QueryGetPerMessageBurnLimitRequest,
  QueryGetPerMessageBurnLimitResponse
>({
  encode: QueryGetPerMessageBurnLimitRequest.encode,
  decode: QueryGetPerMessageBurnLimitResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'PerMessageBurnLimit',
});
/**
 * Queries a list of PerMessageBurnLimits
 * @name getPerMessageBurnLimits
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimits
 */
export const getPerMessageBurnLimits = buildQuery<
  QueryAllPerMessageBurnLimitsRequest,
  QueryAllPerMessageBurnLimitsResponse
>({
  encode: QueryAllPerMessageBurnLimitsRequest.encode,
  decode: QueryAllPerMessageBurnLimitsResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'PerMessageBurnLimits',
});
/**
 * Queries BurningAndMintingPaused
 * @name getBurningAndMintingPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurningAndMintingPaused
 */
export const getBurningAndMintingPaused = buildQuery<
  QueryGetBurningAndMintingPausedRequest,
  QueryGetBurningAndMintingPausedResponse
>({
  encode: QueryGetBurningAndMintingPausedRequest.encode,
  decode: QueryGetBurningAndMintingPausedResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'BurningAndMintingPaused',
});
/**
 * Queries SendingAndReceivingPaused
 * @name getSendingAndReceivingMessagesPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export const getSendingAndReceivingMessagesPaused = buildQuery<
  QueryGetSendingAndReceivingMessagesPausedRequest,
  QueryGetSendingAndReceivingMessagesPausedResponse
>({
  encode: QueryGetSendingAndReceivingMessagesPausedRequest.encode,
  decode: QueryGetSendingAndReceivingMessagesPausedResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'SendingAndReceivingMessagesPaused',
});
/**
 * Queries the MaxMessageBodySize
 * @name getMaxMessageBodySize
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.MaxMessageBodySize
 */
export const getMaxMessageBodySize = buildQuery<
  QueryGetMaxMessageBodySizeRequest,
  QueryGetMaxMessageBodySizeResponse
>({
  encode: QueryGetMaxMessageBodySizeRequest.encode,
  decode: QueryGetMaxMessageBodySizeResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'MaxMessageBodySize',
});
/**
 * Queries the NextAvailableNonce
 * @name getNextAvailableNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.NextAvailableNonce
 */
export const getNextAvailableNonce = buildQuery<
  QueryGetNextAvailableNonceRequest,
  QueryGetNextAvailableNonceResponse
>({
  encode: QueryGetNextAvailableNonceRequest.encode,
  decode: QueryGetNextAvailableNonceResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'NextAvailableNonce',
});
/**
 * Queries the SignatureThreshold
 * @name getSignatureThreshold
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SignatureThreshold
 */
export const getSignatureThreshold = buildQuery<
  QueryGetSignatureThresholdRequest,
  QueryGetSignatureThresholdResponse
>({
  encode: QueryGetSignatureThresholdRequest.encode,
  decode: QueryGetSignatureThresholdResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'SignatureThreshold',
});
/**
 * Queries a TokenPair by index
 * @name getTokenPair
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPair
 */
export const getTokenPair = buildQuery<
  QueryGetTokenPairRequest,
  QueryGetTokenPairResponse
>({
  encode: QueryGetTokenPairRequest.encode,
  decode: QueryGetTokenPairResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'TokenPair',
});
/**
 * Queries a list of TokenPair
 * @name getTokenPairs
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPairs
 */
export const getTokenPairs = buildQuery<
  QueryAllTokenPairsRequest,
  QueryAllTokenPairsResponse
>({
  encode: QueryAllTokenPairsRequest.encode,
  decode: QueryAllTokenPairsResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'TokenPairs',
});
/**
 * Queries a UsedNonce by index
 * @name getUsedNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonce
 */
export const getUsedNonce = buildQuery<
  QueryGetUsedNonceRequest,
  QueryGetUsedNonceResponse
>({
  encode: QueryGetUsedNonceRequest.encode,
  decode: QueryGetUsedNonceResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'UsedNonce',
});
/**
 * Queries a list of UsedNonces
 * @name getUsedNonces
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonces
 */
export const getUsedNonces = buildQuery<
  QueryAllUsedNoncesRequest,
  QueryAllUsedNoncesResponse
>({
  encode: QueryAllUsedNoncesRequest.encode,
  decode: QueryAllUsedNoncesResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'UsedNonces',
});
/**
 * Query the RemoteTokenMessenger of a specific domain.
 * @name getRemoteTokenMessenger
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessenger
 */
export const getRemoteTokenMessenger = buildQuery<
  QueryRemoteTokenMessengerRequest,
  QueryRemoteTokenMessengerResponse
>({
  encode: QueryRemoteTokenMessengerRequest.encode,
  decode: QueryRemoteTokenMessengerResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'RemoteTokenMessenger',
});
/**
 * Query all RemoteTokenMessenger's.
 * @name getRemoteTokenMessengers
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessengers
 */
export const getRemoteTokenMessengers = buildQuery<
  QueryRemoteTokenMessengersRequest,
  QueryRemoteTokenMessengersResponse
>({
  encode: QueryRemoteTokenMessengersRequest.encode,
  decode: QueryRemoteTokenMessengersResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'RemoteTokenMessengers',
});
/**
 * @name getBurnMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurnMessageVersion
 */
export const getBurnMessageVersion = buildQuery<
  QueryBurnMessageVersionRequest,
  QueryBurnMessageVersionResponse
>({
  encode: QueryBurnMessageVersionRequest.encode,
  decode: QueryBurnMessageVersionResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'BurnMessageVersion',
});
/**
 * @name getLocalMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalMessageVersion
 */
export const getLocalMessageVersion = buildQuery<
  QueryLocalMessageVersionRequest,
  QueryLocalMessageVersionResponse
>({
  encode: QueryLocalMessageVersionRequest.encode,
  decode: QueryLocalMessageVersionResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'LocalMessageVersion',
});
/**
 * @name getLocalDomain
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalDomain
 */
export const getLocalDomain = buildQuery<
  QueryLocalDomainRequest,
  QueryLocalDomainResponse
>({
  encode: QueryLocalDomainRequest.encode,
  decode: QueryLocalDomainResponse.decode,
  service: 'circle.cctp.v1.Query',
  method: 'LocalDomain',
});
