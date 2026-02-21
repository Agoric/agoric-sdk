import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../../cosmos/base/query/v1beta1/pagination.js';
import { Attester, type AttesterSDKType } from './attester.js';
import { PerMessageBurnLimit, type PerMessageBurnLimitSDKType } from './per_message_burn_limit.js';
import { BurningAndMintingPaused, type BurningAndMintingPausedSDKType } from './burning_and_minting_paused.js';
import { SendingAndReceivingMessagesPaused, type SendingAndReceivingMessagesPausedSDKType } from './sending_and_receiving_messages_paused.js';
import { MaxMessageBodySize, type MaxMessageBodySizeSDKType } from './max_message_body_size.js';
import { Nonce, type NonceSDKType } from './nonce.js';
import { SignatureThreshold, type SignatureThresholdSDKType } from './signature_threshold.js';
import { TokenPair, type TokenPairSDKType } from './token_pair.js';
import { RemoteTokenMessenger, type RemoteTokenMessengerSDKType } from './remote_token_messenger.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryRolesRequest is the request type for the Query/Roles RPC method.
 * @name QueryRolesRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesRequest
 */
export interface QueryRolesRequest {
}
export interface QueryRolesRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRolesRequest';
    value: Uint8Array;
}
/**
 * QueryRolesRequest is the request type for the Query/Roles RPC method.
 * @name QueryRolesRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesRequest
 */
export interface QueryRolesRequestSDKType {
}
/**
 * QueryRolesResponse is the response type for the Query/Roles RPC method.
 * @name QueryRolesResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesResponse
 */
export interface QueryRolesResponse {
    owner: string;
    attesterManager: string;
    pauser: string;
    tokenController: string;
}
export interface QueryRolesResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRolesResponse';
    value: Uint8Array;
}
/**
 * QueryRolesResponse is the response type for the Query/Roles RPC method.
 * @name QueryRolesResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesResponse
 */
export interface QueryRolesResponseSDKType {
    owner: string;
    attester_manager: string;
    pauser: string;
    token_controller: string;
}
/**
 * QueryAttestersRequest is the request type for the Query/Attester RPC method.
 * @name QueryGetAttesterRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterRequest
 */
export interface QueryGetAttesterRequest {
    attester: string;
}
export interface QueryGetAttesterRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetAttesterRequest';
    value: Uint8Array;
}
/**
 * QueryAttestersRequest is the request type for the Query/Attester RPC method.
 * @name QueryGetAttesterRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterRequest
 */
export interface QueryGetAttesterRequestSDKType {
    attester: string;
}
/**
 * QueryAttestersResponse is the response type for the Query/Attester RPC
 * method.
 * @name QueryGetAttesterResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterResponse
 */
export interface QueryGetAttesterResponse {
    attester: Attester;
}
export interface QueryGetAttesterResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetAttesterResponse';
    value: Uint8Array;
}
/**
 * QueryAttestersResponse is the response type for the Query/Attester RPC
 * method.
 * @name QueryGetAttesterResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterResponse
 */
export interface QueryGetAttesterResponseSDKType {
    attester: AttesterSDKType;
}
/**
 * QueryAllAttestersRequest is the request type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersRequest
 */
export interface QueryAllAttestersRequest {
    pagination?: PageRequest;
}
export interface QueryAllAttestersRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllAttestersRequest';
    value: Uint8Array;
}
/**
 * QueryAllAttestersRequest is the request type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersRequest
 */
export interface QueryAllAttestersRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryAllAttestersResponse is the response type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersResponse
 */
export interface QueryAllAttestersResponse {
    attesters: Attester[];
    pagination?: PageResponse;
}
export interface QueryAllAttestersResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllAttestersResponse';
    value: Uint8Array;
}
/**
 * QueryAllAttestersResponse is the response type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersResponse
 */
export interface QueryAllAttestersResponseSDKType {
    attesters: AttesterSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryPerMessageBurnLimitRequest is the request type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitRequest
 */
export interface QueryGetPerMessageBurnLimitRequest {
    denom: string;
}
export interface QueryGetPerMessageBurnLimitRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitRequest';
    value: Uint8Array;
}
/**
 * QueryPerMessageBurnLimitRequest is the request type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitRequest
 */
export interface QueryGetPerMessageBurnLimitRequestSDKType {
    denom: string;
}
/**
 * QueryPerMessageBurnLimitResponse is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitResponse
 */
export interface QueryGetPerMessageBurnLimitResponse {
    burnLimit: PerMessageBurnLimit;
}
export interface QueryGetPerMessageBurnLimitResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitResponse';
    value: Uint8Array;
}
/**
 * QueryPerMessageBurnLimitResponse is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitResponse
 */
export interface QueryGetPerMessageBurnLimitResponseSDKType {
    burn_limit: PerMessageBurnLimitSDKType;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest
 */
export interface QueryAllPerMessageBurnLimitsRequest {
    pagination?: PageRequest;
}
export interface QueryAllPerMessageBurnLimitsRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest';
    value: Uint8Array;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest
 */
export interface QueryAllPerMessageBurnLimitsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse
 */
export interface QueryAllPerMessageBurnLimitsResponse {
    burnLimits: PerMessageBurnLimit[];
    pagination?: PageResponse;
}
export interface QueryAllPerMessageBurnLimitsResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse';
    value: Uint8Array;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse
 */
export interface QueryAllPerMessageBurnLimitsResponseSDKType {
    burn_limits: PerMessageBurnLimitSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryBurningAndMintingPausedRequest is the request type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedRequest
 */
export interface QueryGetBurningAndMintingPausedRequest {
}
export interface QueryGetBurningAndMintingPausedRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedRequest';
    value: Uint8Array;
}
/**
 * QueryBurningAndMintingPausedRequest is the request type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedRequest
 */
export interface QueryGetBurningAndMintingPausedRequestSDKType {
}
/**
 * QueryBurningAndMintingPausedResponse is the response type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedResponse
 */
export interface QueryGetBurningAndMintingPausedResponse {
    paused: BurningAndMintingPaused;
}
export interface QueryGetBurningAndMintingPausedResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedResponse';
    value: Uint8Array;
}
/**
 * QueryBurningAndMintingPausedResponse is the response type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedResponse
 */
export interface QueryGetBurningAndMintingPausedResponseSDKType {
    paused: BurningAndMintingPausedSDKType;
}
/**
 * QuerySendingAndReceivingPausedRequest is the request type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest
 */
export interface QueryGetSendingAndReceivingMessagesPausedRequest {
}
export interface QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest';
    value: Uint8Array;
}
/**
 * QuerySendingAndReceivingPausedRequest is the request type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest
 */
export interface QueryGetSendingAndReceivingMessagesPausedRequestSDKType {
}
/**
 * QuerySendingAndReceivingPausedResponse is the response type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse
 */
export interface QueryGetSendingAndReceivingMessagesPausedResponse {
    paused: SendingAndReceivingMessagesPaused;
}
export interface QueryGetSendingAndReceivingMessagesPausedResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse';
    value: Uint8Array;
}
/**
 * QuerySendingAndReceivingPausedResponse is the response type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse
 */
export interface QueryGetSendingAndReceivingMessagesPausedResponseSDKType {
    paused: SendingAndReceivingMessagesPausedSDKType;
}
/**
 * QueryMaxMessageBodySizeRequest is the request type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeRequest
 */
export interface QueryGetMaxMessageBodySizeRequest {
}
export interface QueryGetMaxMessageBodySizeRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeRequest';
    value: Uint8Array;
}
/**
 * QueryMaxMessageBodySizeRequest is the request type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeRequest
 */
export interface QueryGetMaxMessageBodySizeRequestSDKType {
}
/**
 * QueryMaxMessageBodySizeResponse is the response type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeResponse
 */
export interface QueryGetMaxMessageBodySizeResponse {
    amount: MaxMessageBodySize;
}
export interface QueryGetMaxMessageBodySizeResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeResponse';
    value: Uint8Array;
}
/**
 * QueryMaxMessageBodySizeResponse is the response type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeResponse
 */
export interface QueryGetMaxMessageBodySizeResponseSDKType {
    amount: MaxMessageBodySizeSDKType;
}
/**
 * QueryGetNextAvailableNonceRequest is the request type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceRequest
 */
export interface QueryGetNextAvailableNonceRequest {
}
export interface QueryGetNextAvailableNonceRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceRequest';
    value: Uint8Array;
}
/**
 * QueryGetNextAvailableNonceRequest is the request type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceRequest
 */
export interface QueryGetNextAvailableNonceRequestSDKType {
}
/**
 * Query QueryGetNextAvailableNonceResponse is the response type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceResponse
 */
export interface QueryGetNextAvailableNonceResponse {
    nonce: Nonce;
}
export interface QueryGetNextAvailableNonceResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceResponse';
    value: Uint8Array;
}
/**
 * Query QueryGetNextAvailableNonceResponse is the response type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceResponse
 */
export interface QueryGetNextAvailableNonceResponseSDKType {
    nonce: NonceSDKType;
}
/**
 * QuerySignatureThresholdRequest is the request type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdRequest
 */
export interface QueryGetSignatureThresholdRequest {
}
export interface QueryGetSignatureThresholdRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdRequest';
    value: Uint8Array;
}
/**
 * QuerySignatureThresholdRequest is the request type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdRequest
 */
export interface QueryGetSignatureThresholdRequestSDKType {
}
/**
 * QuerySignatureThresholdResponse is the response type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdResponse
 */
export interface QueryGetSignatureThresholdResponse {
    amount: SignatureThreshold;
}
export interface QueryGetSignatureThresholdResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdResponse';
    value: Uint8Array;
}
/**
 * QuerySignatureThresholdResponse is the response type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdResponse
 */
export interface QueryGetSignatureThresholdResponseSDKType {
    amount: SignatureThresholdSDKType;
}
/**
 * QueryGetTokenPairRequest is the request type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairRequest
 */
export interface QueryGetTokenPairRequest {
    remoteDomain: number;
    remoteToken: string;
}
export interface QueryGetTokenPairRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetTokenPairRequest';
    value: Uint8Array;
}
/**
 * QueryGetTokenPairRequest is the request type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairRequest
 */
export interface QueryGetTokenPairRequestSDKType {
    remote_domain: number;
    remote_token: string;
}
/**
 * QueryGetTokenPairResponse is the response type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairResponse
 */
export interface QueryGetTokenPairResponse {
    pair: TokenPair;
}
export interface QueryGetTokenPairResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetTokenPairResponse';
    value: Uint8Array;
}
/**
 * QueryGetTokenPairResponse is the response type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairResponse
 */
export interface QueryGetTokenPairResponseSDKType {
    pair: TokenPairSDKType;
}
/**
 * QueryAllTokenPairsRequest is the request type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsRequest
 */
export interface QueryAllTokenPairsRequest {
    pagination?: PageRequest;
}
export interface QueryAllTokenPairsRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllTokenPairsRequest';
    value: Uint8Array;
}
/**
 * QueryAllTokenPairsRequest is the request type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsRequest
 */
export interface QueryAllTokenPairsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryAllTokenPairsResponse is the response type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsResponse
 */
export interface QueryAllTokenPairsResponse {
    tokenPairs: TokenPair[];
    pagination?: PageResponse;
}
export interface QueryAllTokenPairsResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllTokenPairsResponse';
    value: Uint8Array;
}
/**
 * QueryAllTokenPairsResponse is the response type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsResponse
 */
export interface QueryAllTokenPairsResponseSDKType {
    token_pairs: TokenPairSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryGetUsedNonceRequest is the request type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceRequest
 */
export interface QueryGetUsedNonceRequest {
    sourceDomain: number;
    nonce: bigint;
}
export interface QueryGetUsedNonceRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetUsedNonceRequest';
    value: Uint8Array;
}
/**
 * QueryGetUsedNonceRequest is the request type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceRequest
 */
export interface QueryGetUsedNonceRequestSDKType {
    source_domain: number;
    nonce: bigint;
}
/**
 * QueryGetUsedNonceResponse is the response type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceResponse
 */
export interface QueryGetUsedNonceResponse {
    nonce: Nonce;
}
export interface QueryGetUsedNonceResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryGetUsedNonceResponse';
    value: Uint8Array;
}
/**
 * QueryGetUsedNonceResponse is the response type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceResponse
 */
export interface QueryGetUsedNonceResponseSDKType {
    nonce: NonceSDKType;
}
/**
 * QueryAllUsedNonceRequest is the request type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesRequest
 */
export interface QueryAllUsedNoncesRequest {
    pagination?: PageRequest;
}
export interface QueryAllUsedNoncesRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesRequest';
    value: Uint8Array;
}
/**
 * QueryAllUsedNonceRequest is the request type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesRequest
 */
export interface QueryAllUsedNoncesRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryAllUsedNonceResponse is the response type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesResponse
 */
export interface QueryAllUsedNoncesResponse {
    usedNonces: Nonce[];
    pagination?: PageResponse;
}
export interface QueryAllUsedNoncesResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesResponse';
    value: Uint8Array;
}
/**
 * QueryAllUsedNonceResponse is the response type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesResponse
 */
export interface QueryAllUsedNoncesResponseSDKType {
    used_nonces: NonceSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryRemoteTokenMessengerRequest is the request type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerRequest
 */
export interface QueryRemoteTokenMessengerRequest {
    domainId: number;
}
export interface QueryRemoteTokenMessengerRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerRequest';
    value: Uint8Array;
}
/**
 * QueryRemoteTokenMessengerRequest is the request type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerRequest
 */
export interface QueryRemoteTokenMessengerRequestSDKType {
    domain_id: number;
}
/**
 * QueryRemoteTokenMessengerResponse is the response type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerResponse
 */
export interface QueryRemoteTokenMessengerResponse {
    remoteTokenMessenger: RemoteTokenMessenger;
}
export interface QueryRemoteTokenMessengerResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerResponse';
    value: Uint8Array;
}
/**
 * QueryRemoteTokenMessengerResponse is the response type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerResponse
 */
export interface QueryRemoteTokenMessengerResponseSDKType {
    remote_token_messenger: RemoteTokenMessengerSDKType;
}
/**
 * QueryRemoteTokenMessengersRequest is the request type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersRequest
 */
export interface QueryRemoteTokenMessengersRequest {
    pagination?: PageRequest;
}
export interface QueryRemoteTokenMessengersRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersRequest';
    value: Uint8Array;
}
/**
 * QueryRemoteTokenMessengersRequest is the request type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersRequest
 */
export interface QueryRemoteTokenMessengersRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryRemoteTokenMessengersResponse is the response type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersResponse
 */
export interface QueryRemoteTokenMessengersResponse {
    remoteTokenMessengers: RemoteTokenMessenger[];
    pagination?: PageResponse;
}
export interface QueryRemoteTokenMessengersResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersResponse';
    value: Uint8Array;
}
/**
 * QueryRemoteTokenMessengersResponse is the response type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersResponse
 */
export interface QueryRemoteTokenMessengersResponseSDKType {
    remote_token_messengers: RemoteTokenMessengerSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryBurnMessageVersionRequest is the request type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionRequest
 */
export interface QueryBurnMessageVersionRequest {
}
export interface QueryBurnMessageVersionRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionRequest';
    value: Uint8Array;
}
/**
 * QueryBurnMessageVersionRequest is the request type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionRequest
 */
export interface QueryBurnMessageVersionRequestSDKType {
}
/**
 * QueryBurnMessageVersionResponse is the response type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionResponse
 */
export interface QueryBurnMessageVersionResponse {
    /**
     * version is the burn message version of the local domain.
     */
    version: number;
}
export interface QueryBurnMessageVersionResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionResponse';
    value: Uint8Array;
}
/**
 * QueryBurnMessageVersionResponse is the response type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionResponse
 */
export interface QueryBurnMessageVersionResponseSDKType {
    version: number;
}
/**
 * QueryLocalMessageVersionRequest is the request type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionRequest
 */
export interface QueryLocalMessageVersionRequest {
}
export interface QueryLocalMessageVersionRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionRequest';
    value: Uint8Array;
}
/**
 * QueryLocalMessageVersionRequest is the request type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionRequest
 */
export interface QueryLocalMessageVersionRequestSDKType {
}
/**
 * QueryLocalMessageVersionResponse is the response type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionResponse
 */
export interface QueryLocalMessageVersionResponse {
    /**
     * version is the message version of the local domain.
     */
    version: number;
}
export interface QueryLocalMessageVersionResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionResponse';
    value: Uint8Array;
}
/**
 * QueryLocalMessageVersionResponse is the response type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionResponse
 */
export interface QueryLocalMessageVersionResponseSDKType {
    version: number;
}
/**
 * QueryLocalDomainRequest is the request type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainRequest
 */
export interface QueryLocalDomainRequest {
}
export interface QueryLocalDomainRequestProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryLocalDomainRequest';
    value: Uint8Array;
}
/**
 * QueryLocalDomainRequest is the request type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainRequestSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainRequest
 */
export interface QueryLocalDomainRequestSDKType {
}
/**
 * QueryLocalDomainResponse is the response type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainResponse
 */
export interface QueryLocalDomainResponse {
    /**
     * domain_id is the id of the local domain.
     */
    domainId: number;
}
export interface QueryLocalDomainResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.QueryLocalDomainResponse';
    value: Uint8Array;
}
/**
 * QueryLocalDomainResponse is the response type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainResponse
 */
export interface QueryLocalDomainResponseSDKType {
    domain_id: number;
}
/**
 * QueryRolesRequest is the request type for the Query/Roles RPC method.
 * @name QueryRolesRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesRequest
 */
export declare const QueryRolesRequest: {
    typeUrl: "/circle.cctp.v1.QueryRolesRequest";
    is(o: any): o is QueryRolesRequest;
    isSDK(o: any): o is QueryRolesRequestSDKType;
    encode(_: QueryRolesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRolesRequest;
    fromJSON(_: any): QueryRolesRequest;
    toJSON(_: QueryRolesRequest): JsonSafe<QueryRolesRequest>;
    fromPartial(_: Partial<QueryRolesRequest>): QueryRolesRequest;
    fromProtoMsg(message: QueryRolesRequestProtoMsg): QueryRolesRequest;
    toProto(message: QueryRolesRequest): Uint8Array;
    toProtoMsg(message: QueryRolesRequest): QueryRolesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRolesResponse is the response type for the Query/Roles RPC method.
 * @name QueryRolesResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRolesResponse
 */
export declare const QueryRolesResponse: {
    typeUrl: "/circle.cctp.v1.QueryRolesResponse";
    is(o: any): o is QueryRolesResponse;
    isSDK(o: any): o is QueryRolesResponseSDKType;
    encode(message: QueryRolesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRolesResponse;
    fromJSON(object: any): QueryRolesResponse;
    toJSON(message: QueryRolesResponse): JsonSafe<QueryRolesResponse>;
    fromPartial(object: Partial<QueryRolesResponse>): QueryRolesResponse;
    fromProtoMsg(message: QueryRolesResponseProtoMsg): QueryRolesResponse;
    toProto(message: QueryRolesResponse): Uint8Array;
    toProtoMsg(message: QueryRolesResponse): QueryRolesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAttestersRequest is the request type for the Query/Attester RPC method.
 * @name QueryGetAttesterRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterRequest
 */
export declare const QueryGetAttesterRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetAttesterRequest";
    is(o: any): o is QueryGetAttesterRequest;
    isSDK(o: any): o is QueryGetAttesterRequestSDKType;
    encode(message: QueryGetAttesterRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetAttesterRequest;
    fromJSON(object: any): QueryGetAttesterRequest;
    toJSON(message: QueryGetAttesterRequest): JsonSafe<QueryGetAttesterRequest>;
    fromPartial(object: Partial<QueryGetAttesterRequest>): QueryGetAttesterRequest;
    fromProtoMsg(message: QueryGetAttesterRequestProtoMsg): QueryGetAttesterRequest;
    toProto(message: QueryGetAttesterRequest): Uint8Array;
    toProtoMsg(message: QueryGetAttesterRequest): QueryGetAttesterRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAttestersResponse is the response type for the Query/Attester RPC
 * method.
 * @name QueryGetAttesterResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetAttesterResponse
 */
export declare const QueryGetAttesterResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetAttesterResponse";
    is(o: any): o is QueryGetAttesterResponse;
    isSDK(o: any): o is QueryGetAttesterResponseSDKType;
    encode(message: QueryGetAttesterResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetAttesterResponse;
    fromJSON(object: any): QueryGetAttesterResponse;
    toJSON(message: QueryGetAttesterResponse): JsonSafe<QueryGetAttesterResponse>;
    fromPartial(object: Partial<QueryGetAttesterResponse>): QueryGetAttesterResponse;
    fromProtoMsg(message: QueryGetAttesterResponseProtoMsg): QueryGetAttesterResponse;
    toProto(message: QueryGetAttesterResponse): Uint8Array;
    toProtoMsg(message: QueryGetAttesterResponse): QueryGetAttesterResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllAttestersRequest is the request type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersRequest
 */
export declare const QueryAllAttestersRequest: {
    typeUrl: "/circle.cctp.v1.QueryAllAttestersRequest";
    is(o: any): o is QueryAllAttestersRequest;
    isSDK(o: any): o is QueryAllAttestersRequestSDKType;
    encode(message: QueryAllAttestersRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllAttestersRequest;
    fromJSON(object: any): QueryAllAttestersRequest;
    toJSON(message: QueryAllAttestersRequest): JsonSafe<QueryAllAttestersRequest>;
    fromPartial(object: Partial<QueryAllAttestersRequest>): QueryAllAttestersRequest;
    fromProtoMsg(message: QueryAllAttestersRequestProtoMsg): QueryAllAttestersRequest;
    toProto(message: QueryAllAttestersRequest): Uint8Array;
    toProtoMsg(message: QueryAllAttestersRequest): QueryAllAttestersRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllAttestersResponse is the response type for the Query/Attesters RPC
 * method.
 * @name QueryAllAttestersResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllAttestersResponse
 */
export declare const QueryAllAttestersResponse: {
    typeUrl: "/circle.cctp.v1.QueryAllAttestersResponse";
    is(o: any): o is QueryAllAttestersResponse;
    isSDK(o: any): o is QueryAllAttestersResponseSDKType;
    encode(message: QueryAllAttestersResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllAttestersResponse;
    fromJSON(object: any): QueryAllAttestersResponse;
    toJSON(message: QueryAllAttestersResponse): JsonSafe<QueryAllAttestersResponse>;
    fromPartial(object: Partial<QueryAllAttestersResponse>): QueryAllAttestersResponse;
    fromProtoMsg(message: QueryAllAttestersResponseProtoMsg): QueryAllAttestersResponse;
    toProto(message: QueryAllAttestersResponse): Uint8Array;
    toProtoMsg(message: QueryAllAttestersResponse): QueryAllAttestersResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPerMessageBurnLimitRequest is the request type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitRequest
 */
export declare const QueryGetPerMessageBurnLimitRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetPerMessageBurnLimitRequest";
    is(o: any): o is QueryGetPerMessageBurnLimitRequest;
    isSDK(o: any): o is QueryGetPerMessageBurnLimitRequestSDKType;
    encode(message: QueryGetPerMessageBurnLimitRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetPerMessageBurnLimitRequest;
    fromJSON(object: any): QueryGetPerMessageBurnLimitRequest;
    toJSON(message: QueryGetPerMessageBurnLimitRequest): JsonSafe<QueryGetPerMessageBurnLimitRequest>;
    fromPartial(object: Partial<QueryGetPerMessageBurnLimitRequest>): QueryGetPerMessageBurnLimitRequest;
    fromProtoMsg(message: QueryGetPerMessageBurnLimitRequestProtoMsg): QueryGetPerMessageBurnLimitRequest;
    toProto(message: QueryGetPerMessageBurnLimitRequest): Uint8Array;
    toProtoMsg(message: QueryGetPerMessageBurnLimitRequest): QueryGetPerMessageBurnLimitRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPerMessageBurnLimitResponse is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryGetPerMessageBurnLimitResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetPerMessageBurnLimitResponse
 */
export declare const QueryGetPerMessageBurnLimitResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetPerMessageBurnLimitResponse";
    is(o: any): o is QueryGetPerMessageBurnLimitResponse;
    isSDK(o: any): o is QueryGetPerMessageBurnLimitResponseSDKType;
    encode(message: QueryGetPerMessageBurnLimitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetPerMessageBurnLimitResponse;
    fromJSON(object: any): QueryGetPerMessageBurnLimitResponse;
    toJSON(message: QueryGetPerMessageBurnLimitResponse): JsonSafe<QueryGetPerMessageBurnLimitResponse>;
    fromPartial(object: Partial<QueryGetPerMessageBurnLimitResponse>): QueryGetPerMessageBurnLimitResponse;
    fromProtoMsg(message: QueryGetPerMessageBurnLimitResponseProtoMsg): QueryGetPerMessageBurnLimitResponse;
    toProto(message: QueryGetPerMessageBurnLimitResponse): Uint8Array;
    toProtoMsg(message: QueryGetPerMessageBurnLimitResponse): QueryGetPerMessageBurnLimitResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest
 */
export declare const QueryAllPerMessageBurnLimitsRequest: {
    typeUrl: "/circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest";
    is(o: any): o is QueryAllPerMessageBurnLimitsRequest;
    isSDK(o: any): o is QueryAllPerMessageBurnLimitsRequestSDKType;
    encode(message: QueryAllPerMessageBurnLimitsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllPerMessageBurnLimitsRequest;
    fromJSON(object: any): QueryAllPerMessageBurnLimitsRequest;
    toJSON(message: QueryAllPerMessageBurnLimitsRequest): JsonSafe<QueryAllPerMessageBurnLimitsRequest>;
    fromPartial(object: Partial<QueryAllPerMessageBurnLimitsRequest>): QueryAllPerMessageBurnLimitsRequest;
    fromProtoMsg(message: QueryAllPerMessageBurnLimitsRequestProtoMsg): QueryAllPerMessageBurnLimitsRequest;
    toProto(message: QueryAllPerMessageBurnLimitsRequest): Uint8Array;
    toProtoMsg(message: QueryAllPerMessageBurnLimitsRequest): QueryAllPerMessageBurnLimitsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
 * @name QueryAllPerMessageBurnLimitsResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse
 */
export declare const QueryAllPerMessageBurnLimitsResponse: {
    typeUrl: "/circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse";
    is(o: any): o is QueryAllPerMessageBurnLimitsResponse;
    isSDK(o: any): o is QueryAllPerMessageBurnLimitsResponseSDKType;
    encode(message: QueryAllPerMessageBurnLimitsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllPerMessageBurnLimitsResponse;
    fromJSON(object: any): QueryAllPerMessageBurnLimitsResponse;
    toJSON(message: QueryAllPerMessageBurnLimitsResponse): JsonSafe<QueryAllPerMessageBurnLimitsResponse>;
    fromPartial(object: Partial<QueryAllPerMessageBurnLimitsResponse>): QueryAllPerMessageBurnLimitsResponse;
    fromProtoMsg(message: QueryAllPerMessageBurnLimitsResponseProtoMsg): QueryAllPerMessageBurnLimitsResponse;
    toProto(message: QueryAllPerMessageBurnLimitsResponse): Uint8Array;
    toProtoMsg(message: QueryAllPerMessageBurnLimitsResponse): QueryAllPerMessageBurnLimitsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBurningAndMintingPausedRequest is the request type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedRequest
 */
export declare const QueryGetBurningAndMintingPausedRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetBurningAndMintingPausedRequest";
    is(o: any): o is QueryGetBurningAndMintingPausedRequest;
    isSDK(o: any): o is QueryGetBurningAndMintingPausedRequestSDKType;
    encode(_: QueryGetBurningAndMintingPausedRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetBurningAndMintingPausedRequest;
    fromJSON(_: any): QueryGetBurningAndMintingPausedRequest;
    toJSON(_: QueryGetBurningAndMintingPausedRequest): JsonSafe<QueryGetBurningAndMintingPausedRequest>;
    fromPartial(_: Partial<QueryGetBurningAndMintingPausedRequest>): QueryGetBurningAndMintingPausedRequest;
    fromProtoMsg(message: QueryGetBurningAndMintingPausedRequestProtoMsg): QueryGetBurningAndMintingPausedRequest;
    toProto(message: QueryGetBurningAndMintingPausedRequest): Uint8Array;
    toProtoMsg(message: QueryGetBurningAndMintingPausedRequest): QueryGetBurningAndMintingPausedRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBurningAndMintingPausedResponse is the response type for the
 * Query/BurningAndMintingPaused RPC method.
 * @name QueryGetBurningAndMintingPausedResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetBurningAndMintingPausedResponse
 */
export declare const QueryGetBurningAndMintingPausedResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetBurningAndMintingPausedResponse";
    is(o: any): o is QueryGetBurningAndMintingPausedResponse;
    isSDK(o: any): o is QueryGetBurningAndMintingPausedResponseSDKType;
    encode(message: QueryGetBurningAndMintingPausedResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetBurningAndMintingPausedResponse;
    fromJSON(object: any): QueryGetBurningAndMintingPausedResponse;
    toJSON(message: QueryGetBurningAndMintingPausedResponse): JsonSafe<QueryGetBurningAndMintingPausedResponse>;
    fromPartial(object: Partial<QueryGetBurningAndMintingPausedResponse>): QueryGetBurningAndMintingPausedResponse;
    fromProtoMsg(message: QueryGetBurningAndMintingPausedResponseProtoMsg): QueryGetBurningAndMintingPausedResponse;
    toProto(message: QueryGetBurningAndMintingPausedResponse): Uint8Array;
    toProtoMsg(message: QueryGetBurningAndMintingPausedResponse): QueryGetBurningAndMintingPausedResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySendingAndReceivingPausedRequest is the request type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest
 */
export declare const QueryGetSendingAndReceivingMessagesPausedRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest";
    is(o: any): o is QueryGetSendingAndReceivingMessagesPausedRequest;
    isSDK(o: any): o is QueryGetSendingAndReceivingMessagesPausedRequestSDKType;
    encode(_: QueryGetSendingAndReceivingMessagesPausedRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetSendingAndReceivingMessagesPausedRequest;
    fromJSON(_: any): QueryGetSendingAndReceivingMessagesPausedRequest;
    toJSON(_: QueryGetSendingAndReceivingMessagesPausedRequest): JsonSafe<QueryGetSendingAndReceivingMessagesPausedRequest>;
    fromPartial(_: Partial<QueryGetSendingAndReceivingMessagesPausedRequest>): QueryGetSendingAndReceivingMessagesPausedRequest;
    fromProtoMsg(message: QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg): QueryGetSendingAndReceivingMessagesPausedRequest;
    toProto(message: QueryGetSendingAndReceivingMessagesPausedRequest): Uint8Array;
    toProtoMsg(message: QueryGetSendingAndReceivingMessagesPausedRequest): QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySendingAndReceivingPausedResponse is the response type for the
 * Query/SendingAndReceivingPaused RPC method.
 * @name QueryGetSendingAndReceivingMessagesPausedResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse
 */
export declare const QueryGetSendingAndReceivingMessagesPausedResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse";
    is(o: any): o is QueryGetSendingAndReceivingMessagesPausedResponse;
    isSDK(o: any): o is QueryGetSendingAndReceivingMessagesPausedResponseSDKType;
    encode(message: QueryGetSendingAndReceivingMessagesPausedResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetSendingAndReceivingMessagesPausedResponse;
    fromJSON(object: any): QueryGetSendingAndReceivingMessagesPausedResponse;
    toJSON(message: QueryGetSendingAndReceivingMessagesPausedResponse): JsonSafe<QueryGetSendingAndReceivingMessagesPausedResponse>;
    fromPartial(object: Partial<QueryGetSendingAndReceivingMessagesPausedResponse>): QueryGetSendingAndReceivingMessagesPausedResponse;
    fromProtoMsg(message: QueryGetSendingAndReceivingMessagesPausedResponseProtoMsg): QueryGetSendingAndReceivingMessagesPausedResponse;
    toProto(message: QueryGetSendingAndReceivingMessagesPausedResponse): Uint8Array;
    toProtoMsg(message: QueryGetSendingAndReceivingMessagesPausedResponse): QueryGetSendingAndReceivingMessagesPausedResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryMaxMessageBodySizeRequest is the request type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeRequest
 */
export declare const QueryGetMaxMessageBodySizeRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetMaxMessageBodySizeRequest";
    is(o: any): o is QueryGetMaxMessageBodySizeRequest;
    isSDK(o: any): o is QueryGetMaxMessageBodySizeRequestSDKType;
    encode(_: QueryGetMaxMessageBodySizeRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetMaxMessageBodySizeRequest;
    fromJSON(_: any): QueryGetMaxMessageBodySizeRequest;
    toJSON(_: QueryGetMaxMessageBodySizeRequest): JsonSafe<QueryGetMaxMessageBodySizeRequest>;
    fromPartial(_: Partial<QueryGetMaxMessageBodySizeRequest>): QueryGetMaxMessageBodySizeRequest;
    fromProtoMsg(message: QueryGetMaxMessageBodySizeRequestProtoMsg): QueryGetMaxMessageBodySizeRequest;
    toProto(message: QueryGetMaxMessageBodySizeRequest): Uint8Array;
    toProtoMsg(message: QueryGetMaxMessageBodySizeRequest): QueryGetMaxMessageBodySizeRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryMaxMessageBodySizeResponse is the response type for the
 * Query/MaxMessageBodySize RPC method.
 * @name QueryGetMaxMessageBodySizeResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetMaxMessageBodySizeResponse
 */
export declare const QueryGetMaxMessageBodySizeResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetMaxMessageBodySizeResponse";
    is(o: any): o is QueryGetMaxMessageBodySizeResponse;
    isSDK(o: any): o is QueryGetMaxMessageBodySizeResponseSDKType;
    encode(message: QueryGetMaxMessageBodySizeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetMaxMessageBodySizeResponse;
    fromJSON(object: any): QueryGetMaxMessageBodySizeResponse;
    toJSON(message: QueryGetMaxMessageBodySizeResponse): JsonSafe<QueryGetMaxMessageBodySizeResponse>;
    fromPartial(object: Partial<QueryGetMaxMessageBodySizeResponse>): QueryGetMaxMessageBodySizeResponse;
    fromProtoMsg(message: QueryGetMaxMessageBodySizeResponseProtoMsg): QueryGetMaxMessageBodySizeResponse;
    toProto(message: QueryGetMaxMessageBodySizeResponse): Uint8Array;
    toProtoMsg(message: QueryGetMaxMessageBodySizeResponse): QueryGetMaxMessageBodySizeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryGetNextAvailableNonceRequest is the request type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceRequest
 */
export declare const QueryGetNextAvailableNonceRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetNextAvailableNonceRequest";
    is(o: any): o is QueryGetNextAvailableNonceRequest;
    isSDK(o: any): o is QueryGetNextAvailableNonceRequestSDKType;
    encode(_: QueryGetNextAvailableNonceRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetNextAvailableNonceRequest;
    fromJSON(_: any): QueryGetNextAvailableNonceRequest;
    toJSON(_: QueryGetNextAvailableNonceRequest): JsonSafe<QueryGetNextAvailableNonceRequest>;
    fromPartial(_: Partial<QueryGetNextAvailableNonceRequest>): QueryGetNextAvailableNonceRequest;
    fromProtoMsg(message: QueryGetNextAvailableNonceRequestProtoMsg): QueryGetNextAvailableNonceRequest;
    toProto(message: QueryGetNextAvailableNonceRequest): Uint8Array;
    toProtoMsg(message: QueryGetNextAvailableNonceRequest): QueryGetNextAvailableNonceRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Query QueryGetNextAvailableNonceResponse is the response type for the
 * Query/NextAvailableNonce RPC method.
 * @name QueryGetNextAvailableNonceResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetNextAvailableNonceResponse
 */
export declare const QueryGetNextAvailableNonceResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetNextAvailableNonceResponse";
    is(o: any): o is QueryGetNextAvailableNonceResponse;
    isSDK(o: any): o is QueryGetNextAvailableNonceResponseSDKType;
    encode(message: QueryGetNextAvailableNonceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetNextAvailableNonceResponse;
    fromJSON(object: any): QueryGetNextAvailableNonceResponse;
    toJSON(message: QueryGetNextAvailableNonceResponse): JsonSafe<QueryGetNextAvailableNonceResponse>;
    fromPartial(object: Partial<QueryGetNextAvailableNonceResponse>): QueryGetNextAvailableNonceResponse;
    fromProtoMsg(message: QueryGetNextAvailableNonceResponseProtoMsg): QueryGetNextAvailableNonceResponse;
    toProto(message: QueryGetNextAvailableNonceResponse): Uint8Array;
    toProtoMsg(message: QueryGetNextAvailableNonceResponse): QueryGetNextAvailableNonceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySignatureThresholdRequest is the request type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdRequest
 */
export declare const QueryGetSignatureThresholdRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetSignatureThresholdRequest";
    is(o: any): o is QueryGetSignatureThresholdRequest;
    isSDK(o: any): o is QueryGetSignatureThresholdRequestSDKType;
    encode(_: QueryGetSignatureThresholdRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetSignatureThresholdRequest;
    fromJSON(_: any): QueryGetSignatureThresholdRequest;
    toJSON(_: QueryGetSignatureThresholdRequest): JsonSafe<QueryGetSignatureThresholdRequest>;
    fromPartial(_: Partial<QueryGetSignatureThresholdRequest>): QueryGetSignatureThresholdRequest;
    fromProtoMsg(message: QueryGetSignatureThresholdRequestProtoMsg): QueryGetSignatureThresholdRequest;
    toProto(message: QueryGetSignatureThresholdRequest): Uint8Array;
    toProtoMsg(message: QueryGetSignatureThresholdRequest): QueryGetSignatureThresholdRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySignatureThresholdResponse is the response type for the
 * Query/SignatureThreshold RPC method.
 * @name QueryGetSignatureThresholdResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetSignatureThresholdResponse
 */
export declare const QueryGetSignatureThresholdResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetSignatureThresholdResponse";
    is(o: any): o is QueryGetSignatureThresholdResponse;
    isSDK(o: any): o is QueryGetSignatureThresholdResponseSDKType;
    encode(message: QueryGetSignatureThresholdResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetSignatureThresholdResponse;
    fromJSON(object: any): QueryGetSignatureThresholdResponse;
    toJSON(message: QueryGetSignatureThresholdResponse): JsonSafe<QueryGetSignatureThresholdResponse>;
    fromPartial(object: Partial<QueryGetSignatureThresholdResponse>): QueryGetSignatureThresholdResponse;
    fromProtoMsg(message: QueryGetSignatureThresholdResponseProtoMsg): QueryGetSignatureThresholdResponse;
    toProto(message: QueryGetSignatureThresholdResponse): Uint8Array;
    toProtoMsg(message: QueryGetSignatureThresholdResponse): QueryGetSignatureThresholdResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryGetTokenPairRequest is the request type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairRequest
 */
export declare const QueryGetTokenPairRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetTokenPairRequest";
    is(o: any): o is QueryGetTokenPairRequest;
    isSDK(o: any): o is QueryGetTokenPairRequestSDKType;
    encode(message: QueryGetTokenPairRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetTokenPairRequest;
    fromJSON(object: any): QueryGetTokenPairRequest;
    toJSON(message: QueryGetTokenPairRequest): JsonSafe<QueryGetTokenPairRequest>;
    fromPartial(object: Partial<QueryGetTokenPairRequest>): QueryGetTokenPairRequest;
    fromProtoMsg(message: QueryGetTokenPairRequestProtoMsg): QueryGetTokenPairRequest;
    toProto(message: QueryGetTokenPairRequest): Uint8Array;
    toProtoMsg(message: QueryGetTokenPairRequest): QueryGetTokenPairRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryGetTokenPairResponse is the response type for the Query/TokenPair RPC
 * method.
 * @name QueryGetTokenPairResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetTokenPairResponse
 */
export declare const QueryGetTokenPairResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetTokenPairResponse";
    is(o: any): o is QueryGetTokenPairResponse;
    isSDK(o: any): o is QueryGetTokenPairResponseSDKType;
    encode(message: QueryGetTokenPairResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetTokenPairResponse;
    fromJSON(object: any): QueryGetTokenPairResponse;
    toJSON(message: QueryGetTokenPairResponse): JsonSafe<QueryGetTokenPairResponse>;
    fromPartial(object: Partial<QueryGetTokenPairResponse>): QueryGetTokenPairResponse;
    fromProtoMsg(message: QueryGetTokenPairResponseProtoMsg): QueryGetTokenPairResponse;
    toProto(message: QueryGetTokenPairResponse): Uint8Array;
    toProtoMsg(message: QueryGetTokenPairResponse): QueryGetTokenPairResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllTokenPairsRequest is the request type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsRequest
 */
export declare const QueryAllTokenPairsRequest: {
    typeUrl: "/circle.cctp.v1.QueryAllTokenPairsRequest";
    is(o: any): o is QueryAllTokenPairsRequest;
    isSDK(o: any): o is QueryAllTokenPairsRequestSDKType;
    encode(message: QueryAllTokenPairsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllTokenPairsRequest;
    fromJSON(object: any): QueryAllTokenPairsRequest;
    toJSON(message: QueryAllTokenPairsRequest): JsonSafe<QueryAllTokenPairsRequest>;
    fromPartial(object: Partial<QueryAllTokenPairsRequest>): QueryAllTokenPairsRequest;
    fromProtoMsg(message: QueryAllTokenPairsRequestProtoMsg): QueryAllTokenPairsRequest;
    toProto(message: QueryAllTokenPairsRequest): Uint8Array;
    toProtoMsg(message: QueryAllTokenPairsRequest): QueryAllTokenPairsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllTokenPairsResponse is the response type for the Query/TokenPairs RPC
 * method.
 * @name QueryAllTokenPairsResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllTokenPairsResponse
 */
export declare const QueryAllTokenPairsResponse: {
    typeUrl: "/circle.cctp.v1.QueryAllTokenPairsResponse";
    is(o: any): o is QueryAllTokenPairsResponse;
    isSDK(o: any): o is QueryAllTokenPairsResponseSDKType;
    encode(message: QueryAllTokenPairsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllTokenPairsResponse;
    fromJSON(object: any): QueryAllTokenPairsResponse;
    toJSON(message: QueryAllTokenPairsResponse): JsonSafe<QueryAllTokenPairsResponse>;
    fromPartial(object: Partial<QueryAllTokenPairsResponse>): QueryAllTokenPairsResponse;
    fromProtoMsg(message: QueryAllTokenPairsResponseProtoMsg): QueryAllTokenPairsResponse;
    toProto(message: QueryAllTokenPairsResponse): Uint8Array;
    toProtoMsg(message: QueryAllTokenPairsResponse): QueryAllTokenPairsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryGetUsedNonceRequest is the request type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceRequest
 */
export declare const QueryGetUsedNonceRequest: {
    typeUrl: "/circle.cctp.v1.QueryGetUsedNonceRequest";
    is(o: any): o is QueryGetUsedNonceRequest;
    isSDK(o: any): o is QueryGetUsedNonceRequestSDKType;
    encode(message: QueryGetUsedNonceRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetUsedNonceRequest;
    fromJSON(object: any): QueryGetUsedNonceRequest;
    toJSON(message: QueryGetUsedNonceRequest): JsonSafe<QueryGetUsedNonceRequest>;
    fromPartial(object: Partial<QueryGetUsedNonceRequest>): QueryGetUsedNonceRequest;
    fromProtoMsg(message: QueryGetUsedNonceRequestProtoMsg): QueryGetUsedNonceRequest;
    toProto(message: QueryGetUsedNonceRequest): Uint8Array;
    toProtoMsg(message: QueryGetUsedNonceRequest): QueryGetUsedNonceRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryGetUsedNonceResponse is the response type for the Query/UsedNonce RPC
 * method.
 * @name QueryGetUsedNonceResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryGetUsedNonceResponse
 */
export declare const QueryGetUsedNonceResponse: {
    typeUrl: "/circle.cctp.v1.QueryGetUsedNonceResponse";
    is(o: any): o is QueryGetUsedNonceResponse;
    isSDK(o: any): o is QueryGetUsedNonceResponseSDKType;
    encode(message: QueryGetUsedNonceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetUsedNonceResponse;
    fromJSON(object: any): QueryGetUsedNonceResponse;
    toJSON(message: QueryGetUsedNonceResponse): JsonSafe<QueryGetUsedNonceResponse>;
    fromPartial(object: Partial<QueryGetUsedNonceResponse>): QueryGetUsedNonceResponse;
    fromProtoMsg(message: QueryGetUsedNonceResponseProtoMsg): QueryGetUsedNonceResponse;
    toProto(message: QueryGetUsedNonceResponse): Uint8Array;
    toProtoMsg(message: QueryGetUsedNonceResponse): QueryGetUsedNonceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllUsedNonceRequest is the request type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesRequest
 */
export declare const QueryAllUsedNoncesRequest: {
    typeUrl: "/circle.cctp.v1.QueryAllUsedNoncesRequest";
    is(o: any): o is QueryAllUsedNoncesRequest;
    isSDK(o: any): o is QueryAllUsedNoncesRequestSDKType;
    encode(message: QueryAllUsedNoncesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUsedNoncesRequest;
    fromJSON(object: any): QueryAllUsedNoncesRequest;
    toJSON(message: QueryAllUsedNoncesRequest): JsonSafe<QueryAllUsedNoncesRequest>;
    fromPartial(object: Partial<QueryAllUsedNoncesRequest>): QueryAllUsedNoncesRequest;
    fromProtoMsg(message: QueryAllUsedNoncesRequestProtoMsg): QueryAllUsedNoncesRequest;
    toProto(message: QueryAllUsedNoncesRequest): Uint8Array;
    toProtoMsg(message: QueryAllUsedNoncesRequest): QueryAllUsedNoncesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllUsedNonceResponse is the response type for the Query/UsedNonces RPC
 * method.
 * @name QueryAllUsedNoncesResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryAllUsedNoncesResponse
 */
export declare const QueryAllUsedNoncesResponse: {
    typeUrl: "/circle.cctp.v1.QueryAllUsedNoncesResponse";
    is(o: any): o is QueryAllUsedNoncesResponse;
    isSDK(o: any): o is QueryAllUsedNoncesResponseSDKType;
    encode(message: QueryAllUsedNoncesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUsedNoncesResponse;
    fromJSON(object: any): QueryAllUsedNoncesResponse;
    toJSON(message: QueryAllUsedNoncesResponse): JsonSafe<QueryAllUsedNoncesResponse>;
    fromPartial(object: Partial<QueryAllUsedNoncesResponse>): QueryAllUsedNoncesResponse;
    fromProtoMsg(message: QueryAllUsedNoncesResponseProtoMsg): QueryAllUsedNoncesResponse;
    toProto(message: QueryAllUsedNoncesResponse): Uint8Array;
    toProtoMsg(message: QueryAllUsedNoncesResponse): QueryAllUsedNoncesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRemoteTokenMessengerRequest is the request type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerRequest
 */
export declare const QueryRemoteTokenMessengerRequest: {
    typeUrl: "/circle.cctp.v1.QueryRemoteTokenMessengerRequest";
    is(o: any): o is QueryRemoteTokenMessengerRequest;
    isSDK(o: any): o is QueryRemoteTokenMessengerRequestSDKType;
    encode(message: QueryRemoteTokenMessengerRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRemoteTokenMessengerRequest;
    fromJSON(object: any): QueryRemoteTokenMessengerRequest;
    toJSON(message: QueryRemoteTokenMessengerRequest): JsonSafe<QueryRemoteTokenMessengerRequest>;
    fromPartial(object: Partial<QueryRemoteTokenMessengerRequest>): QueryRemoteTokenMessengerRequest;
    fromProtoMsg(message: QueryRemoteTokenMessengerRequestProtoMsg): QueryRemoteTokenMessengerRequest;
    toProto(message: QueryRemoteTokenMessengerRequest): Uint8Array;
    toProtoMsg(message: QueryRemoteTokenMessengerRequest): QueryRemoteTokenMessengerRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRemoteTokenMessengerResponse is the response type for the
 * Query/RemoteTokenMessenger RPC method.
 * @name QueryRemoteTokenMessengerResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengerResponse
 */
export declare const QueryRemoteTokenMessengerResponse: {
    typeUrl: "/circle.cctp.v1.QueryRemoteTokenMessengerResponse";
    is(o: any): o is QueryRemoteTokenMessengerResponse;
    isSDK(o: any): o is QueryRemoteTokenMessengerResponseSDKType;
    encode(message: QueryRemoteTokenMessengerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRemoteTokenMessengerResponse;
    fromJSON(object: any): QueryRemoteTokenMessengerResponse;
    toJSON(message: QueryRemoteTokenMessengerResponse): JsonSafe<QueryRemoteTokenMessengerResponse>;
    fromPartial(object: Partial<QueryRemoteTokenMessengerResponse>): QueryRemoteTokenMessengerResponse;
    fromProtoMsg(message: QueryRemoteTokenMessengerResponseProtoMsg): QueryRemoteTokenMessengerResponse;
    toProto(message: QueryRemoteTokenMessengerResponse): Uint8Array;
    toProtoMsg(message: QueryRemoteTokenMessengerResponse): QueryRemoteTokenMessengerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRemoteTokenMessengersRequest is the request type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersRequest
 */
export declare const QueryRemoteTokenMessengersRequest: {
    typeUrl: "/circle.cctp.v1.QueryRemoteTokenMessengersRequest";
    is(o: any): o is QueryRemoteTokenMessengersRequest;
    isSDK(o: any): o is QueryRemoteTokenMessengersRequestSDKType;
    encode(message: QueryRemoteTokenMessengersRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRemoteTokenMessengersRequest;
    fromJSON(object: any): QueryRemoteTokenMessengersRequest;
    toJSON(message: QueryRemoteTokenMessengersRequest): JsonSafe<QueryRemoteTokenMessengersRequest>;
    fromPartial(object: Partial<QueryRemoteTokenMessengersRequest>): QueryRemoteTokenMessengersRequest;
    fromProtoMsg(message: QueryRemoteTokenMessengersRequestProtoMsg): QueryRemoteTokenMessengersRequest;
    toProto(message: QueryRemoteTokenMessengersRequest): Uint8Array;
    toProtoMsg(message: QueryRemoteTokenMessengersRequest): QueryRemoteTokenMessengersRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRemoteTokenMessengersResponse is the response type for the
 * Query/RemoteTokenMessengers RPC method.
 * @name QueryRemoteTokenMessengersResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryRemoteTokenMessengersResponse
 */
export declare const QueryRemoteTokenMessengersResponse: {
    typeUrl: "/circle.cctp.v1.QueryRemoteTokenMessengersResponse";
    is(o: any): o is QueryRemoteTokenMessengersResponse;
    isSDK(o: any): o is QueryRemoteTokenMessengersResponseSDKType;
    encode(message: QueryRemoteTokenMessengersResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRemoteTokenMessengersResponse;
    fromJSON(object: any): QueryRemoteTokenMessengersResponse;
    toJSON(message: QueryRemoteTokenMessengersResponse): JsonSafe<QueryRemoteTokenMessengersResponse>;
    fromPartial(object: Partial<QueryRemoteTokenMessengersResponse>): QueryRemoteTokenMessengersResponse;
    fromProtoMsg(message: QueryRemoteTokenMessengersResponseProtoMsg): QueryRemoteTokenMessengersResponse;
    toProto(message: QueryRemoteTokenMessengersResponse): Uint8Array;
    toProtoMsg(message: QueryRemoteTokenMessengersResponse): QueryRemoteTokenMessengersResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBurnMessageVersionRequest is the request type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionRequest
 */
export declare const QueryBurnMessageVersionRequest: {
    typeUrl: "/circle.cctp.v1.QueryBurnMessageVersionRequest";
    is(o: any): o is QueryBurnMessageVersionRequest;
    isSDK(o: any): o is QueryBurnMessageVersionRequestSDKType;
    encode(_: QueryBurnMessageVersionRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryBurnMessageVersionRequest;
    fromJSON(_: any): QueryBurnMessageVersionRequest;
    toJSON(_: QueryBurnMessageVersionRequest): JsonSafe<QueryBurnMessageVersionRequest>;
    fromPartial(_: Partial<QueryBurnMessageVersionRequest>): QueryBurnMessageVersionRequest;
    fromProtoMsg(message: QueryBurnMessageVersionRequestProtoMsg): QueryBurnMessageVersionRequest;
    toProto(message: QueryBurnMessageVersionRequest): Uint8Array;
    toProtoMsg(message: QueryBurnMessageVersionRequest): QueryBurnMessageVersionRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBurnMessageVersionResponse is the response type for the
 * Query/BurnMessageVersion RPC method.
 * @name QueryBurnMessageVersionResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryBurnMessageVersionResponse
 */
export declare const QueryBurnMessageVersionResponse: {
    typeUrl: "/circle.cctp.v1.QueryBurnMessageVersionResponse";
    is(o: any): o is QueryBurnMessageVersionResponse;
    isSDK(o: any): o is QueryBurnMessageVersionResponseSDKType;
    encode(message: QueryBurnMessageVersionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryBurnMessageVersionResponse;
    fromJSON(object: any): QueryBurnMessageVersionResponse;
    toJSON(message: QueryBurnMessageVersionResponse): JsonSafe<QueryBurnMessageVersionResponse>;
    fromPartial(object: Partial<QueryBurnMessageVersionResponse>): QueryBurnMessageVersionResponse;
    fromProtoMsg(message: QueryBurnMessageVersionResponseProtoMsg): QueryBurnMessageVersionResponse;
    toProto(message: QueryBurnMessageVersionResponse): Uint8Array;
    toProtoMsg(message: QueryBurnMessageVersionResponse): QueryBurnMessageVersionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryLocalMessageVersionRequest is the request type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionRequest
 */
export declare const QueryLocalMessageVersionRequest: {
    typeUrl: "/circle.cctp.v1.QueryLocalMessageVersionRequest";
    is(o: any): o is QueryLocalMessageVersionRequest;
    isSDK(o: any): o is QueryLocalMessageVersionRequestSDKType;
    encode(_: QueryLocalMessageVersionRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLocalMessageVersionRequest;
    fromJSON(_: any): QueryLocalMessageVersionRequest;
    toJSON(_: QueryLocalMessageVersionRequest): JsonSafe<QueryLocalMessageVersionRequest>;
    fromPartial(_: Partial<QueryLocalMessageVersionRequest>): QueryLocalMessageVersionRequest;
    fromProtoMsg(message: QueryLocalMessageVersionRequestProtoMsg): QueryLocalMessageVersionRequest;
    toProto(message: QueryLocalMessageVersionRequest): Uint8Array;
    toProtoMsg(message: QueryLocalMessageVersionRequest): QueryLocalMessageVersionRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryLocalMessageVersionResponse is the response type for the
 * Query/LocalMessageVersion RPC method.
 * @name QueryLocalMessageVersionResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalMessageVersionResponse
 */
export declare const QueryLocalMessageVersionResponse: {
    typeUrl: "/circle.cctp.v1.QueryLocalMessageVersionResponse";
    is(o: any): o is QueryLocalMessageVersionResponse;
    isSDK(o: any): o is QueryLocalMessageVersionResponseSDKType;
    encode(message: QueryLocalMessageVersionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLocalMessageVersionResponse;
    fromJSON(object: any): QueryLocalMessageVersionResponse;
    toJSON(message: QueryLocalMessageVersionResponse): JsonSafe<QueryLocalMessageVersionResponse>;
    fromPartial(object: Partial<QueryLocalMessageVersionResponse>): QueryLocalMessageVersionResponse;
    fromProtoMsg(message: QueryLocalMessageVersionResponseProtoMsg): QueryLocalMessageVersionResponse;
    toProto(message: QueryLocalMessageVersionResponse): Uint8Array;
    toProtoMsg(message: QueryLocalMessageVersionResponse): QueryLocalMessageVersionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryLocalDomainRequest is the request type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainRequest
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainRequest
 */
export declare const QueryLocalDomainRequest: {
    typeUrl: "/circle.cctp.v1.QueryLocalDomainRequest";
    is(o: any): o is QueryLocalDomainRequest;
    isSDK(o: any): o is QueryLocalDomainRequestSDKType;
    encode(_: QueryLocalDomainRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLocalDomainRequest;
    fromJSON(_: any): QueryLocalDomainRequest;
    toJSON(_: QueryLocalDomainRequest): JsonSafe<QueryLocalDomainRequest>;
    fromPartial(_: Partial<QueryLocalDomainRequest>): QueryLocalDomainRequest;
    fromProtoMsg(message: QueryLocalDomainRequestProtoMsg): QueryLocalDomainRequest;
    toProto(message: QueryLocalDomainRequest): Uint8Array;
    toProtoMsg(message: QueryLocalDomainRequest): QueryLocalDomainRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryLocalDomainResponse is the response type for the Query/LocalDomain RPC
 * method.
 * @name QueryLocalDomainResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.QueryLocalDomainResponse
 */
export declare const QueryLocalDomainResponse: {
    typeUrl: "/circle.cctp.v1.QueryLocalDomainResponse";
    is(o: any): o is QueryLocalDomainResponse;
    isSDK(o: any): o is QueryLocalDomainResponseSDKType;
    encode(message: QueryLocalDomainResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLocalDomainResponse;
    fromJSON(object: any): QueryLocalDomainResponse;
    toJSON(message: QueryLocalDomainResponse): JsonSafe<QueryLocalDomainResponse>;
    fromPartial(object: Partial<QueryLocalDomainResponse>): QueryLocalDomainResponse;
    fromProtoMsg(message: QueryLocalDomainResponseProtoMsg): QueryLocalDomainResponse;
    toProto(message: QueryLocalDomainResponse): Uint8Array;
    toProtoMsg(message: QueryLocalDomainResponse): QueryLocalDomainResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map