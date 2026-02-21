import { QueryRolesRequest, QueryRolesResponse, QueryGetAttesterRequest, QueryGetAttesterResponse, QueryAllAttestersRequest, QueryAllAttestersResponse, QueryGetPerMessageBurnLimitRequest, QueryGetPerMessageBurnLimitResponse, QueryAllPerMessageBurnLimitsRequest, QueryAllPerMessageBurnLimitsResponse, QueryGetBurningAndMintingPausedRequest, QueryGetBurningAndMintingPausedResponse, QueryGetSendingAndReceivingMessagesPausedRequest, QueryGetSendingAndReceivingMessagesPausedResponse, QueryGetMaxMessageBodySizeRequest, QueryGetMaxMessageBodySizeResponse, QueryGetNextAvailableNonceRequest, QueryGetNextAvailableNonceResponse, QueryGetSignatureThresholdRequest, QueryGetSignatureThresholdResponse, QueryGetTokenPairRequest, QueryGetTokenPairResponse, QueryAllTokenPairsRequest, QueryAllTokenPairsResponse, QueryGetUsedNonceRequest, QueryGetUsedNonceResponse, QueryAllUsedNoncesRequest, QueryAllUsedNoncesResponse, QueryRemoteTokenMessengerRequest, QueryRemoteTokenMessengerResponse, QueryRemoteTokenMessengersRequest, QueryRemoteTokenMessengersResponse, QueryBurnMessageVersionRequest, QueryBurnMessageVersionResponse, QueryLocalMessageVersionRequest, QueryLocalMessageVersionResponse, QueryLocalDomainRequest, QueryLocalDomainResponse } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/query.js';
/**
 * @name getRoles
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Roles
 */
export declare const getRoles: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRolesRequest) => Promise<QueryRolesResponse>;
/**
 * Queries an Attester by index
 * @name getAttester
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attester
 */
export declare const getAttester: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetAttesterRequest) => Promise<QueryGetAttesterResponse>;
/**
 * Queries a list of Attesters
 * @name getAttesters
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.Attesters
 */
export declare const getAttesters: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllAttestersRequest) => Promise<QueryAllAttestersResponse>;
/**
 * Queries a PerMessageBurnLimit by index
 * @name getPerMessageBurnLimit
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimit
 */
export declare const getPerMessageBurnLimit: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetPerMessageBurnLimitRequest) => Promise<QueryGetPerMessageBurnLimitResponse>;
/**
 * Queries a list of PerMessageBurnLimits
 * @name getPerMessageBurnLimits
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.PerMessageBurnLimits
 */
export declare const getPerMessageBurnLimits: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllPerMessageBurnLimitsRequest) => Promise<QueryAllPerMessageBurnLimitsResponse>;
/**
 * Queries BurningAndMintingPaused
 * @name getBurningAndMintingPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurningAndMintingPaused
 */
export declare const getBurningAndMintingPaused: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetBurningAndMintingPausedRequest) => Promise<QueryGetBurningAndMintingPausedResponse>;
/**
 * Queries SendingAndReceivingPaused
 * @name getSendingAndReceivingMessagesPaused
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export declare const getSendingAndReceivingMessagesPaused: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetSendingAndReceivingMessagesPausedRequest) => Promise<QueryGetSendingAndReceivingMessagesPausedResponse>;
/**
 * Queries the MaxMessageBodySize
 * @name getMaxMessageBodySize
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.MaxMessageBodySize
 */
export declare const getMaxMessageBodySize: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetMaxMessageBodySizeRequest) => Promise<QueryGetMaxMessageBodySizeResponse>;
/**
 * Queries the NextAvailableNonce
 * @name getNextAvailableNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.NextAvailableNonce
 */
export declare const getNextAvailableNonce: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetNextAvailableNonceRequest) => Promise<QueryGetNextAvailableNonceResponse>;
/**
 * Queries the SignatureThreshold
 * @name getSignatureThreshold
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.SignatureThreshold
 */
export declare const getSignatureThreshold: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetSignatureThresholdRequest) => Promise<QueryGetSignatureThresholdResponse>;
/**
 * Queries a TokenPair by index
 * @name getTokenPair
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPair
 */
export declare const getTokenPair: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetTokenPairRequest) => Promise<QueryGetTokenPairResponse>;
/**
 * Queries a list of TokenPair
 * @name getTokenPairs
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.TokenPairs
 */
export declare const getTokenPairs: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllTokenPairsRequest) => Promise<QueryAllTokenPairsResponse>;
/**
 * Queries a UsedNonce by index
 * @name getUsedNonce
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonce
 */
export declare const getUsedNonce: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetUsedNonceRequest) => Promise<QueryGetUsedNonceResponse>;
/**
 * Queries a list of UsedNonces
 * @name getUsedNonces
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.UsedNonces
 */
export declare const getUsedNonces: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllUsedNoncesRequest) => Promise<QueryAllUsedNoncesResponse>;
/**
 * Query the RemoteTokenMessenger of a specific domain.
 * @name getRemoteTokenMessenger
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessenger
 */
export declare const getRemoteTokenMessenger: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRemoteTokenMessengerRequest) => Promise<QueryRemoteTokenMessengerResponse>;
/**
 * Query all RemoteTokenMessenger's.
 * @name getRemoteTokenMessengers
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.RemoteTokenMessengers
 */
export declare const getRemoteTokenMessengers: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryRemoteTokenMessengersRequest) => Promise<QueryRemoteTokenMessengersResponse>;
/**
 * @name getBurnMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.BurnMessageVersion
 */
export declare const getBurnMessageVersion: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryBurnMessageVersionRequest) => Promise<QueryBurnMessageVersionResponse>;
/**
 * @name getLocalMessageVersion
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalMessageVersion
 */
export declare const getLocalMessageVersion: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryLocalMessageVersionRequest) => Promise<QueryLocalMessageVersionResponse>;
/**
 * @name getLocalDomain
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.LocalDomain
 */
export declare const getLocalDomain: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryLocalDomainRequest) => Promise<QueryLocalDomainResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map