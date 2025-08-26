//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../../cosmos/base/query/v1beta1/pagination.js';
import { Attester, type AttesterSDKType } from './attester.js';
import {
  PerMessageBurnLimit,
  type PerMessageBurnLimitSDKType,
} from './per_message_burn_limit.js';
import {
  BurningAndMintingPaused,
  type BurningAndMintingPausedSDKType,
} from './burning_and_minting_paused.js';
import {
  SendingAndReceivingMessagesPaused,
  type SendingAndReceivingMessagesPausedSDKType,
} from './sending_and_receiving_messages_paused.js';
import {
  MaxMessageBodySize,
  type MaxMessageBodySizeSDKType,
} from './max_message_body_size.js';
import { Nonce, type NonceSDKType } from './nonce.js';
import {
  SignatureThreshold,
  type SignatureThresholdSDKType,
} from './signature_threshold.js';
import { TokenPair, type TokenPairSDKType } from './token_pair.js';
import {
  RemoteTokenMessenger,
  type RemoteTokenMessengerSDKType,
} from './remote_token_messenger.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** QueryRolesRequest is the request type for the Query/Roles RPC method. */
export interface QueryRolesRequest {}
export interface QueryRolesRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryRolesRequest';
  value: Uint8Array;
}
/** QueryRolesRequest is the request type for the Query/Roles RPC method. */
export interface QueryRolesRequestSDKType {}
/** QueryRolesResponse is the response type for the Query/Roles RPC method. */
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
/** QueryRolesResponse is the response type for the Query/Roles RPC method. */
export interface QueryRolesResponseSDKType {
  owner: string;
  attester_manager: string;
  pauser: string;
  token_controller: string;
}
/** QueryAttestersRequest is the request type for the Query/Attester RPC method. */
export interface QueryGetAttesterRequest {
  attester: string;
}
export interface QueryGetAttesterRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetAttesterRequest';
  value: Uint8Array;
}
/** QueryAttestersRequest is the request type for the Query/Attester RPC method. */
export interface QueryGetAttesterRequestSDKType {
  attester: string;
}
/**
 * QueryAttestersResponse is the response type for the Query/Attester RPC
 * method.
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
 */
export interface QueryGetAttesterResponseSDKType {
  attester: AttesterSDKType;
}
/**
 * QueryAllAttestersRequest is the request type for the Query/Attesters RPC
 * method.
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
 */
export interface QueryAllAttestersRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryAllAttestersResponse is the response type for the Query/Attesters RPC
 * method.
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
 */
export interface QueryAllAttestersResponseSDKType {
  attesters: AttesterSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryPerMessageBurnLimitRequest is the request type for the
 * Query/PerMessageBurnLimit RPC method.
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
 */
export interface QueryGetPerMessageBurnLimitRequestSDKType {
  denom: string;
}
/**
 * QueryPerMessageBurnLimitResponse is the response type for the
 * Query/PerMessageBurnLimit RPC method.
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
 */
export interface QueryGetPerMessageBurnLimitResponseSDKType {
  burn_limit: PerMessageBurnLimitSDKType;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
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
 */
export interface QueryAllPerMessageBurnLimitsRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryAllPerMessageBurnLimitsRequest is the response type for the
 * Query/PerMessageBurnLimit RPC method.
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
 */
export interface QueryAllPerMessageBurnLimitsResponseSDKType {
  burn_limits: PerMessageBurnLimitSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryBurningAndMintingPausedRequest is the request type for the
 * Query/BurningAndMintingPaused RPC method.
 */
export interface QueryGetBurningAndMintingPausedRequest {}
export interface QueryGetBurningAndMintingPausedRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedRequest';
  value: Uint8Array;
}
/**
 * QueryBurningAndMintingPausedRequest is the request type for the
 * Query/BurningAndMintingPaused RPC method.
 */
export interface QueryGetBurningAndMintingPausedRequestSDKType {}
/**
 * QueryBurningAndMintingPausedResponse is the response type for the
 * Query/BurningAndMintingPaused RPC method.
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
 */
export interface QueryGetBurningAndMintingPausedResponseSDKType {
  paused: BurningAndMintingPausedSDKType;
}
/**
 * QuerySendingAndReceivingPausedRequest is the request type for the
 * Query/SendingAndReceivingPaused RPC method.
 */
export interface QueryGetSendingAndReceivingMessagesPausedRequest {}
export interface QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest';
  value: Uint8Array;
}
/**
 * QuerySendingAndReceivingPausedRequest is the request type for the
 * Query/SendingAndReceivingPaused RPC method.
 */
export interface QueryGetSendingAndReceivingMessagesPausedRequestSDKType {}
/**
 * QuerySendingAndReceivingPausedResponse is the response type for the
 * Query/SendingAndReceivingPaused RPC method.
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
 */
export interface QueryGetSendingAndReceivingMessagesPausedResponseSDKType {
  paused: SendingAndReceivingMessagesPausedSDKType;
}
/**
 * QueryMaxMessageBodySizeRequest is the request type for the
 * Query/MaxMessageBodySize RPC method.
 */
export interface QueryGetMaxMessageBodySizeRequest {}
export interface QueryGetMaxMessageBodySizeRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeRequest';
  value: Uint8Array;
}
/**
 * QueryMaxMessageBodySizeRequest is the request type for the
 * Query/MaxMessageBodySize RPC method.
 */
export interface QueryGetMaxMessageBodySizeRequestSDKType {}
/**
 * QueryMaxMessageBodySizeResponse is the response type for the
 * Query/MaxMessageBodySize RPC method.
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
 */
export interface QueryGetMaxMessageBodySizeResponseSDKType {
  amount: MaxMessageBodySizeSDKType;
}
/**
 * QueryGetNextAvailableNonceRequest is the request type for the
 * Query/NextAvailableNonce RPC method.
 */
export interface QueryGetNextAvailableNonceRequest {}
export interface QueryGetNextAvailableNonceRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceRequest';
  value: Uint8Array;
}
/**
 * QueryGetNextAvailableNonceRequest is the request type for the
 * Query/NextAvailableNonce RPC method.
 */
export interface QueryGetNextAvailableNonceRequestSDKType {}
/**
 * Query QueryGetNextAvailableNonceResponse is the response type for the
 * Query/NextAvailableNonce RPC method.
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
 */
export interface QueryGetNextAvailableNonceResponseSDKType {
  nonce: NonceSDKType;
}
/**
 * QuerySignatureThresholdRequest is the request type for the
 * Query/SignatureThreshold RPC method.
 */
export interface QueryGetSignatureThresholdRequest {}
export interface QueryGetSignatureThresholdRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdRequest';
  value: Uint8Array;
}
/**
 * QuerySignatureThresholdRequest is the request type for the
 * Query/SignatureThreshold RPC method.
 */
export interface QueryGetSignatureThresholdRequestSDKType {}
/**
 * QuerySignatureThresholdResponse is the response type for the
 * Query/SignatureThreshold RPC method.
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
 */
export interface QueryGetSignatureThresholdResponseSDKType {
  amount: SignatureThresholdSDKType;
}
/**
 * QueryGetTokenPairRequest is the request type for the Query/TokenPair RPC
 * method.
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
 */
export interface QueryGetTokenPairRequestSDKType {
  remote_domain: number;
  remote_token: string;
}
/**
 * QueryGetTokenPairResponse is the response type for the Query/TokenPair RPC
 * method.
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
 */
export interface QueryGetTokenPairResponseSDKType {
  pair: TokenPairSDKType;
}
/**
 * QueryAllTokenPairsRequest is the request type for the Query/TokenPairs RPC
 * method.
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
 */
export interface QueryAllTokenPairsRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryAllTokenPairsResponse is the response type for the Query/TokenPairs RPC
 * method.
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
 */
export interface QueryAllTokenPairsResponseSDKType {
  token_pairs: TokenPairSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryGetUsedNonceRequest is the request type for the Query/UsedNonce RPC
 * method.
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
 */
export interface QueryGetUsedNonceRequestSDKType {
  source_domain: number;
  nonce: bigint;
}
/**
 * QueryGetUsedNonceResponse is the response type for the Query/UsedNonce RPC
 * method.
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
 */
export interface QueryGetUsedNonceResponseSDKType {
  nonce: NonceSDKType;
}
/**
 * QueryAllUsedNonceRequest is the request type for the Query/UsedNonces RPC
 * method.
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
 */
export interface QueryAllUsedNoncesRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryAllUsedNonceResponse is the response type for the Query/UsedNonces RPC
 * method.
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
 */
export interface QueryAllUsedNoncesResponseSDKType {
  used_nonces: NonceSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryRemoteTokenMessengerRequest is the request type for the
 * Query/RemoteTokenMessenger RPC method.
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
 */
export interface QueryRemoteTokenMessengerRequestSDKType {
  domain_id: number;
}
/**
 * QueryRemoteTokenMessengerResponse is the response type for the
 * Query/RemoteTokenMessenger RPC method.
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
 */
export interface QueryRemoteTokenMessengerResponseSDKType {
  remote_token_messenger: RemoteTokenMessengerSDKType;
}
/**
 * QueryRemoteTokenMessengersRequest is the request type for the
 * Query/RemoteTokenMessengers RPC method.
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
 */
export interface QueryRemoteTokenMessengersRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryRemoteTokenMessengersResponse is the response type for the
 * Query/RemoteTokenMessengers RPC method.
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
 */
export interface QueryRemoteTokenMessengersResponseSDKType {
  remote_token_messengers: RemoteTokenMessengerSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryBurnMessageVersionRequest is the request type for the
 * Query/BurnMessageVersion RPC method.
 */
export interface QueryBurnMessageVersionRequest {}
export interface QueryBurnMessageVersionRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionRequest';
  value: Uint8Array;
}
/**
 * QueryBurnMessageVersionRequest is the request type for the
 * Query/BurnMessageVersion RPC method.
 */
export interface QueryBurnMessageVersionRequestSDKType {}
/**
 * QueryBurnMessageVersionResponse is the response type for the
 * Query/BurnMessageVersion RPC method.
 */
export interface QueryBurnMessageVersionResponse {
  /** version is the burn message version of the local domain. */
  version: number;
}
export interface QueryBurnMessageVersionResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionResponse';
  value: Uint8Array;
}
/**
 * QueryBurnMessageVersionResponse is the response type for the
 * Query/BurnMessageVersion RPC method.
 */
export interface QueryBurnMessageVersionResponseSDKType {
  version: number;
}
/**
 * QueryLocalMessageVersionRequest is the request type for the
 * Query/LocalMessageVersion RPC method.
 */
export interface QueryLocalMessageVersionRequest {}
export interface QueryLocalMessageVersionRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionRequest';
  value: Uint8Array;
}
/**
 * QueryLocalMessageVersionRequest is the request type for the
 * Query/LocalMessageVersion RPC method.
 */
export interface QueryLocalMessageVersionRequestSDKType {}
/**
 * QueryLocalMessageVersionResponse is the response type for the
 * Query/LocalMessageVersion RPC method.
 */
export interface QueryLocalMessageVersionResponse {
  /** version is the message version of the local domain. */
  version: number;
}
export interface QueryLocalMessageVersionResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionResponse';
  value: Uint8Array;
}
/**
 * QueryLocalMessageVersionResponse is the response type for the
 * Query/LocalMessageVersion RPC method.
 */
export interface QueryLocalMessageVersionResponseSDKType {
  version: number;
}
/**
 * QueryLocalDomainRequest is the request type for the Query/LocalDomain RPC
 * method.
 */
export interface QueryLocalDomainRequest {}
export interface QueryLocalDomainRequestProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryLocalDomainRequest';
  value: Uint8Array;
}
/**
 * QueryLocalDomainRequest is the request type for the Query/LocalDomain RPC
 * method.
 */
export interface QueryLocalDomainRequestSDKType {}
/**
 * QueryLocalDomainResponse is the response type for the Query/LocalDomain RPC
 * method.
 */
export interface QueryLocalDomainResponse {
  /** domain_id is the id of the local domain. */
  domainId: number;
}
export interface QueryLocalDomainResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.QueryLocalDomainResponse';
  value: Uint8Array;
}
/**
 * QueryLocalDomainResponse is the response type for the Query/LocalDomain RPC
 * method.
 */
export interface QueryLocalDomainResponseSDKType {
  domain_id: number;
}
function createBaseQueryRolesRequest(): QueryRolesRequest {
  return {};
}
export const QueryRolesRequest = {
  typeUrl: '/circle.cctp.v1.QueryRolesRequest' as const,
  encode(
    _: QueryRolesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryRolesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRolesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryRolesRequest {
    return {};
  },
  toJSON(_: QueryRolesRequest): JsonSafe<QueryRolesRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryRolesRequest>): QueryRolesRequest {
    const message = createBaseQueryRolesRequest();
    return message;
  },
  fromProtoMsg(message: QueryRolesRequestProtoMsg): QueryRolesRequest {
    return QueryRolesRequest.decode(message.value);
  },
  toProto(message: QueryRolesRequest): Uint8Array {
    return QueryRolesRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryRolesRequest): QueryRolesRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRolesRequest',
      value: QueryRolesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryRolesResponse(): QueryRolesResponse {
  return {
    owner: '',
    attesterManager: '',
    pauser: '',
    tokenController: '',
  };
}
export const QueryRolesResponse = {
  typeUrl: '/circle.cctp.v1.QueryRolesResponse' as const,
  encode(
    message: QueryRolesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.attesterManager !== '') {
      writer.uint32(18).string(message.attesterManager);
    }
    if (message.pauser !== '') {
      writer.uint32(26).string(message.pauser);
    }
    if (message.tokenController !== '') {
      writer.uint32(34).string(message.tokenController);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryRolesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRolesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.attesterManager = reader.string();
          break;
        case 3:
          message.pauser = reader.string();
          break;
        case 4:
          message.tokenController = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryRolesResponse {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      attesterManager: isSet(object.attesterManager)
        ? String(object.attesterManager)
        : '',
      pauser: isSet(object.pauser) ? String(object.pauser) : '',
      tokenController: isSet(object.tokenController)
        ? String(object.tokenController)
        : '',
    };
  },
  toJSON(message: QueryRolesResponse): JsonSafe<QueryRolesResponse> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.attesterManager !== undefined &&
      (obj.attesterManager = message.attesterManager);
    message.pauser !== undefined && (obj.pauser = message.pauser);
    message.tokenController !== undefined &&
      (obj.tokenController = message.tokenController);
    return obj;
  },
  fromPartial(object: Partial<QueryRolesResponse>): QueryRolesResponse {
    const message = createBaseQueryRolesResponse();
    message.owner = object.owner ?? '';
    message.attesterManager = object.attesterManager ?? '';
    message.pauser = object.pauser ?? '';
    message.tokenController = object.tokenController ?? '';
    return message;
  },
  fromProtoMsg(message: QueryRolesResponseProtoMsg): QueryRolesResponse {
    return QueryRolesResponse.decode(message.value);
  },
  toProto(message: QueryRolesResponse): Uint8Array {
    return QueryRolesResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryRolesResponse): QueryRolesResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRolesResponse',
      value: QueryRolesResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetAttesterRequest(): QueryGetAttesterRequest {
  return {
    attester: '',
  };
}
export const QueryGetAttesterRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetAttesterRequest' as const,
  encode(
    message: QueryGetAttesterRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.attester !== '') {
      writer.uint32(10).string(message.attester);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetAttesterRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetAttesterRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetAttesterRequest {
    return {
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: QueryGetAttesterRequest): JsonSafe<QueryGetAttesterRequest> {
    const obj: any = {};
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetAttesterRequest>,
  ): QueryGetAttesterRequest {
    const message = createBaseQueryGetAttesterRequest();
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGetAttesterRequestProtoMsg,
  ): QueryGetAttesterRequest {
    return QueryGetAttesterRequest.decode(message.value);
  },
  toProto(message: QueryGetAttesterRequest): Uint8Array {
    return QueryGetAttesterRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetAttesterRequest,
  ): QueryGetAttesterRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetAttesterRequest',
      value: QueryGetAttesterRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetAttesterResponse(): QueryGetAttesterResponse {
  return {
    attester: Attester.fromPartial({}),
  };
}
export const QueryGetAttesterResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetAttesterResponse' as const,
  encode(
    message: QueryGetAttesterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.attester !== undefined) {
      Attester.encode(message.attester, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetAttesterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetAttesterResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attester = Attester.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetAttesterResponse {
    return {
      attester: isSet(object.attester)
        ? Attester.fromJSON(object.attester)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetAttesterResponse,
  ): JsonSafe<QueryGetAttesterResponse> {
    const obj: any = {};
    message.attester !== undefined &&
      (obj.attester = message.attester
        ? Attester.toJSON(message.attester)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetAttesterResponse>,
  ): QueryGetAttesterResponse {
    const message = createBaseQueryGetAttesterResponse();
    message.attester =
      object.attester !== undefined && object.attester !== null
        ? Attester.fromPartial(object.attester)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetAttesterResponseProtoMsg,
  ): QueryGetAttesterResponse {
    return QueryGetAttesterResponse.decode(message.value);
  },
  toProto(message: QueryGetAttesterResponse): Uint8Array {
    return QueryGetAttesterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetAttesterResponse,
  ): QueryGetAttesterResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetAttesterResponse',
      value: QueryGetAttesterResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllAttestersRequest(): QueryAllAttestersRequest {
  return {
    pagination: undefined,
  };
}
export const QueryAllAttestersRequest = {
  typeUrl: '/circle.cctp.v1.QueryAllAttestersRequest' as const,
  encode(
    message: QueryAllAttestersRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllAttestersRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllAttestersRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllAttestersRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllAttestersRequest,
  ): JsonSafe<QueryAllAttestersRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllAttestersRequest>,
  ): QueryAllAttestersRequest {
    const message = createBaseQueryAllAttestersRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllAttestersRequestProtoMsg,
  ): QueryAllAttestersRequest {
    return QueryAllAttestersRequest.decode(message.value);
  },
  toProto(message: QueryAllAttestersRequest): Uint8Array {
    return QueryAllAttestersRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllAttestersRequest,
  ): QueryAllAttestersRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllAttestersRequest',
      value: QueryAllAttestersRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllAttestersResponse(): QueryAllAttestersResponse {
  return {
    attesters: [],
    pagination: undefined,
  };
}
export const QueryAllAttestersResponse = {
  typeUrl: '/circle.cctp.v1.QueryAllAttestersResponse' as const,
  encode(
    message: QueryAllAttestersResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.attesters) {
      Attester.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllAttestersResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllAttestersResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attesters.push(Attester.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllAttestersResponse {
    return {
      attesters: Array.isArray(object?.attesters)
        ? object.attesters.map((e: any) => Attester.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllAttestersResponse,
  ): JsonSafe<QueryAllAttestersResponse> {
    const obj: any = {};
    if (message.attesters) {
      obj.attesters = message.attesters.map(e =>
        e ? Attester.toJSON(e) : undefined,
      );
    } else {
      obj.attesters = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllAttestersResponse>,
  ): QueryAllAttestersResponse {
    const message = createBaseQueryAllAttestersResponse();
    message.attesters =
      object.attesters?.map(e => Attester.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllAttestersResponseProtoMsg,
  ): QueryAllAttestersResponse {
    return QueryAllAttestersResponse.decode(message.value);
  },
  toProto(message: QueryAllAttestersResponse): Uint8Array {
    return QueryAllAttestersResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllAttestersResponse,
  ): QueryAllAttestersResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllAttestersResponse',
      value: QueryAllAttestersResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetPerMessageBurnLimitRequest(): QueryGetPerMessageBurnLimitRequest {
  return {
    denom: '',
  };
}
export const QueryGetPerMessageBurnLimitRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitRequest' as const,
  encode(
    message: QueryGetPerMessageBurnLimitRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetPerMessageBurnLimitRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetPerMessageBurnLimitRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetPerMessageBurnLimitRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryGetPerMessageBurnLimitRequest,
  ): JsonSafe<QueryGetPerMessageBurnLimitRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetPerMessageBurnLimitRequest>,
  ): QueryGetPerMessageBurnLimitRequest {
    const message = createBaseQueryGetPerMessageBurnLimitRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGetPerMessageBurnLimitRequestProtoMsg,
  ): QueryGetPerMessageBurnLimitRequest {
    return QueryGetPerMessageBurnLimitRequest.decode(message.value);
  },
  toProto(message: QueryGetPerMessageBurnLimitRequest): Uint8Array {
    return QueryGetPerMessageBurnLimitRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetPerMessageBurnLimitRequest,
  ): QueryGetPerMessageBurnLimitRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitRequest',
      value: QueryGetPerMessageBurnLimitRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetPerMessageBurnLimitResponse(): QueryGetPerMessageBurnLimitResponse {
  return {
    burnLimit: PerMessageBurnLimit.fromPartial({}),
  };
}
export const QueryGetPerMessageBurnLimitResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitResponse' as const,
  encode(
    message: QueryGetPerMessageBurnLimitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.burnLimit !== undefined) {
      PerMessageBurnLimit.encode(
        message.burnLimit,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetPerMessageBurnLimitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetPerMessageBurnLimitResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.burnLimit = PerMessageBurnLimit.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetPerMessageBurnLimitResponse {
    return {
      burnLimit: isSet(object.burnLimit)
        ? PerMessageBurnLimit.fromJSON(object.burnLimit)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetPerMessageBurnLimitResponse,
  ): JsonSafe<QueryGetPerMessageBurnLimitResponse> {
    const obj: any = {};
    message.burnLimit !== undefined &&
      (obj.burnLimit = message.burnLimit
        ? PerMessageBurnLimit.toJSON(message.burnLimit)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetPerMessageBurnLimitResponse>,
  ): QueryGetPerMessageBurnLimitResponse {
    const message = createBaseQueryGetPerMessageBurnLimitResponse();
    message.burnLimit =
      object.burnLimit !== undefined && object.burnLimit !== null
        ? PerMessageBurnLimit.fromPartial(object.burnLimit)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetPerMessageBurnLimitResponseProtoMsg,
  ): QueryGetPerMessageBurnLimitResponse {
    return QueryGetPerMessageBurnLimitResponse.decode(message.value);
  },
  toProto(message: QueryGetPerMessageBurnLimitResponse): Uint8Array {
    return QueryGetPerMessageBurnLimitResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetPerMessageBurnLimitResponse,
  ): QueryGetPerMessageBurnLimitResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetPerMessageBurnLimitResponse',
      value: QueryGetPerMessageBurnLimitResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllPerMessageBurnLimitsRequest(): QueryAllPerMessageBurnLimitsRequest {
  return {
    pagination: undefined,
  };
}
export const QueryAllPerMessageBurnLimitsRequest = {
  typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest' as const,
  encode(
    message: QueryAllPerMessageBurnLimitsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllPerMessageBurnLimitsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllPerMessageBurnLimitsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllPerMessageBurnLimitsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllPerMessageBurnLimitsRequest,
  ): JsonSafe<QueryAllPerMessageBurnLimitsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllPerMessageBurnLimitsRequest>,
  ): QueryAllPerMessageBurnLimitsRequest {
    const message = createBaseQueryAllPerMessageBurnLimitsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllPerMessageBurnLimitsRequestProtoMsg,
  ): QueryAllPerMessageBurnLimitsRequest {
    return QueryAllPerMessageBurnLimitsRequest.decode(message.value);
  },
  toProto(message: QueryAllPerMessageBurnLimitsRequest): Uint8Array {
    return QueryAllPerMessageBurnLimitsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllPerMessageBurnLimitsRequest,
  ): QueryAllPerMessageBurnLimitsRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsRequest',
      value: QueryAllPerMessageBurnLimitsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllPerMessageBurnLimitsResponse(): QueryAllPerMessageBurnLimitsResponse {
  return {
    burnLimits: [],
    pagination: undefined,
  };
}
export const QueryAllPerMessageBurnLimitsResponse = {
  typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse' as const,
  encode(
    message: QueryAllPerMessageBurnLimitsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.burnLimits) {
      PerMessageBurnLimit.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllPerMessageBurnLimitsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllPerMessageBurnLimitsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.burnLimits.push(
            PerMessageBurnLimit.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllPerMessageBurnLimitsResponse {
    return {
      burnLimits: Array.isArray(object?.burnLimits)
        ? object.burnLimits.map((e: any) => PerMessageBurnLimit.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllPerMessageBurnLimitsResponse,
  ): JsonSafe<QueryAllPerMessageBurnLimitsResponse> {
    const obj: any = {};
    if (message.burnLimits) {
      obj.burnLimits = message.burnLimits.map(e =>
        e ? PerMessageBurnLimit.toJSON(e) : undefined,
      );
    } else {
      obj.burnLimits = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllPerMessageBurnLimitsResponse>,
  ): QueryAllPerMessageBurnLimitsResponse {
    const message = createBaseQueryAllPerMessageBurnLimitsResponse();
    message.burnLimits =
      object.burnLimits?.map(e => PerMessageBurnLimit.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllPerMessageBurnLimitsResponseProtoMsg,
  ): QueryAllPerMessageBurnLimitsResponse {
    return QueryAllPerMessageBurnLimitsResponse.decode(message.value);
  },
  toProto(message: QueryAllPerMessageBurnLimitsResponse): Uint8Array {
    return QueryAllPerMessageBurnLimitsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllPerMessageBurnLimitsResponse,
  ): QueryAllPerMessageBurnLimitsResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllPerMessageBurnLimitsResponse',
      value: QueryAllPerMessageBurnLimitsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetBurningAndMintingPausedRequest(): QueryGetBurningAndMintingPausedRequest {
  return {};
}
export const QueryGetBurningAndMintingPausedRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedRequest' as const,
  encode(
    _: QueryGetBurningAndMintingPausedRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetBurningAndMintingPausedRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetBurningAndMintingPausedRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryGetBurningAndMintingPausedRequest {
    return {};
  },
  toJSON(
    _: QueryGetBurningAndMintingPausedRequest,
  ): JsonSafe<QueryGetBurningAndMintingPausedRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetBurningAndMintingPausedRequest>,
  ): QueryGetBurningAndMintingPausedRequest {
    const message = createBaseQueryGetBurningAndMintingPausedRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetBurningAndMintingPausedRequestProtoMsg,
  ): QueryGetBurningAndMintingPausedRequest {
    return QueryGetBurningAndMintingPausedRequest.decode(message.value);
  },
  toProto(message: QueryGetBurningAndMintingPausedRequest): Uint8Array {
    return QueryGetBurningAndMintingPausedRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetBurningAndMintingPausedRequest,
  ): QueryGetBurningAndMintingPausedRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedRequest',
      value: QueryGetBurningAndMintingPausedRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetBurningAndMintingPausedResponse(): QueryGetBurningAndMintingPausedResponse {
  return {
    paused: BurningAndMintingPaused.fromPartial({}),
  };
}
export const QueryGetBurningAndMintingPausedResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedResponse' as const,
  encode(
    message: QueryGetBurningAndMintingPausedResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.paused !== undefined) {
      BurningAndMintingPaused.encode(
        message.paused,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetBurningAndMintingPausedResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetBurningAndMintingPausedResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.paused = BurningAndMintingPaused.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetBurningAndMintingPausedResponse {
    return {
      paused: isSet(object.paused)
        ? BurningAndMintingPaused.fromJSON(object.paused)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetBurningAndMintingPausedResponse,
  ): JsonSafe<QueryGetBurningAndMintingPausedResponse> {
    const obj: any = {};
    message.paused !== undefined &&
      (obj.paused = message.paused
        ? BurningAndMintingPaused.toJSON(message.paused)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetBurningAndMintingPausedResponse>,
  ): QueryGetBurningAndMintingPausedResponse {
    const message = createBaseQueryGetBurningAndMintingPausedResponse();
    message.paused =
      object.paused !== undefined && object.paused !== null
        ? BurningAndMintingPaused.fromPartial(object.paused)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetBurningAndMintingPausedResponseProtoMsg,
  ): QueryGetBurningAndMintingPausedResponse {
    return QueryGetBurningAndMintingPausedResponse.decode(message.value);
  },
  toProto(message: QueryGetBurningAndMintingPausedResponse): Uint8Array {
    return QueryGetBurningAndMintingPausedResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetBurningAndMintingPausedResponse,
  ): QueryGetBurningAndMintingPausedResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetBurningAndMintingPausedResponse',
      value: QueryGetBurningAndMintingPausedResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetSendingAndReceivingMessagesPausedRequest(): QueryGetSendingAndReceivingMessagesPausedRequest {
  return {};
}
export const QueryGetSendingAndReceivingMessagesPausedRequest = {
  typeUrl:
    '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest' as const,
  encode(
    _: QueryGetSendingAndReceivingMessagesPausedRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetSendingAndReceivingMessagesPausedRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseQueryGetSendingAndReceivingMessagesPausedRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryGetSendingAndReceivingMessagesPausedRequest {
    return {};
  },
  toJSON(
    _: QueryGetSendingAndReceivingMessagesPausedRequest,
  ): JsonSafe<QueryGetSendingAndReceivingMessagesPausedRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetSendingAndReceivingMessagesPausedRequest>,
  ): QueryGetSendingAndReceivingMessagesPausedRequest {
    const message =
      createBaseQueryGetSendingAndReceivingMessagesPausedRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg,
  ): QueryGetSendingAndReceivingMessagesPausedRequest {
    return QueryGetSendingAndReceivingMessagesPausedRequest.decode(
      message.value,
    );
  },
  toProto(
    message: QueryGetSendingAndReceivingMessagesPausedRequest,
  ): Uint8Array {
    return QueryGetSendingAndReceivingMessagesPausedRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: QueryGetSendingAndReceivingMessagesPausedRequest,
  ): QueryGetSendingAndReceivingMessagesPausedRequestProtoMsg {
    return {
      typeUrl:
        '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedRequest',
      value:
        QueryGetSendingAndReceivingMessagesPausedRequest.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseQueryGetSendingAndReceivingMessagesPausedResponse(): QueryGetSendingAndReceivingMessagesPausedResponse {
  return {
    paused: SendingAndReceivingMessagesPaused.fromPartial({}),
  };
}
export const QueryGetSendingAndReceivingMessagesPausedResponse = {
  typeUrl:
    '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse' as const,
  encode(
    message: QueryGetSendingAndReceivingMessagesPausedResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.paused !== undefined) {
      SendingAndReceivingMessagesPaused.encode(
        message.paused,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetSendingAndReceivingMessagesPausedResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseQueryGetSendingAndReceivingMessagesPausedResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.paused = SendingAndReceivingMessagesPaused.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetSendingAndReceivingMessagesPausedResponse {
    return {
      paused: isSet(object.paused)
        ? SendingAndReceivingMessagesPaused.fromJSON(object.paused)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetSendingAndReceivingMessagesPausedResponse,
  ): JsonSafe<QueryGetSendingAndReceivingMessagesPausedResponse> {
    const obj: any = {};
    message.paused !== undefined &&
      (obj.paused = message.paused
        ? SendingAndReceivingMessagesPaused.toJSON(message.paused)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetSendingAndReceivingMessagesPausedResponse>,
  ): QueryGetSendingAndReceivingMessagesPausedResponse {
    const message =
      createBaseQueryGetSendingAndReceivingMessagesPausedResponse();
    message.paused =
      object.paused !== undefined && object.paused !== null
        ? SendingAndReceivingMessagesPaused.fromPartial(object.paused)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetSendingAndReceivingMessagesPausedResponseProtoMsg,
  ): QueryGetSendingAndReceivingMessagesPausedResponse {
    return QueryGetSendingAndReceivingMessagesPausedResponse.decode(
      message.value,
    );
  },
  toProto(
    message: QueryGetSendingAndReceivingMessagesPausedResponse,
  ): Uint8Array {
    return QueryGetSendingAndReceivingMessagesPausedResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: QueryGetSendingAndReceivingMessagesPausedResponse,
  ): QueryGetSendingAndReceivingMessagesPausedResponseProtoMsg {
    return {
      typeUrl:
        '/circle.cctp.v1.QueryGetSendingAndReceivingMessagesPausedResponse',
      value:
        QueryGetSendingAndReceivingMessagesPausedResponse.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseQueryGetMaxMessageBodySizeRequest(): QueryGetMaxMessageBodySizeRequest {
  return {};
}
export const QueryGetMaxMessageBodySizeRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeRequest' as const,
  encode(
    _: QueryGetMaxMessageBodySizeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetMaxMessageBodySizeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetMaxMessageBodySizeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryGetMaxMessageBodySizeRequest {
    return {};
  },
  toJSON(
    _: QueryGetMaxMessageBodySizeRequest,
  ): JsonSafe<QueryGetMaxMessageBodySizeRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetMaxMessageBodySizeRequest>,
  ): QueryGetMaxMessageBodySizeRequest {
    const message = createBaseQueryGetMaxMessageBodySizeRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetMaxMessageBodySizeRequestProtoMsg,
  ): QueryGetMaxMessageBodySizeRequest {
    return QueryGetMaxMessageBodySizeRequest.decode(message.value);
  },
  toProto(message: QueryGetMaxMessageBodySizeRequest): Uint8Array {
    return QueryGetMaxMessageBodySizeRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetMaxMessageBodySizeRequest,
  ): QueryGetMaxMessageBodySizeRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeRequest',
      value: QueryGetMaxMessageBodySizeRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetMaxMessageBodySizeResponse(): QueryGetMaxMessageBodySizeResponse {
  return {
    amount: MaxMessageBodySize.fromPartial({}),
  };
}
export const QueryGetMaxMessageBodySizeResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeResponse' as const,
  encode(
    message: QueryGetMaxMessageBodySizeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== undefined) {
      MaxMessageBodySize.encode(
        message.amount,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetMaxMessageBodySizeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetMaxMessageBodySizeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = MaxMessageBodySize.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetMaxMessageBodySizeResponse {
    return {
      amount: isSet(object.amount)
        ? MaxMessageBodySize.fromJSON(object.amount)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetMaxMessageBodySizeResponse,
  ): JsonSafe<QueryGetMaxMessageBodySizeResponse> {
    const obj: any = {};
    message.amount !== undefined &&
      (obj.amount = message.amount
        ? MaxMessageBodySize.toJSON(message.amount)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetMaxMessageBodySizeResponse>,
  ): QueryGetMaxMessageBodySizeResponse {
    const message = createBaseQueryGetMaxMessageBodySizeResponse();
    message.amount =
      object.amount !== undefined && object.amount !== null
        ? MaxMessageBodySize.fromPartial(object.amount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetMaxMessageBodySizeResponseProtoMsg,
  ): QueryGetMaxMessageBodySizeResponse {
    return QueryGetMaxMessageBodySizeResponse.decode(message.value);
  },
  toProto(message: QueryGetMaxMessageBodySizeResponse): Uint8Array {
    return QueryGetMaxMessageBodySizeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetMaxMessageBodySizeResponse,
  ): QueryGetMaxMessageBodySizeResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetMaxMessageBodySizeResponse',
      value: QueryGetMaxMessageBodySizeResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetNextAvailableNonceRequest(): QueryGetNextAvailableNonceRequest {
  return {};
}
export const QueryGetNextAvailableNonceRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceRequest' as const,
  encode(
    _: QueryGetNextAvailableNonceRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetNextAvailableNonceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetNextAvailableNonceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryGetNextAvailableNonceRequest {
    return {};
  },
  toJSON(
    _: QueryGetNextAvailableNonceRequest,
  ): JsonSafe<QueryGetNextAvailableNonceRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetNextAvailableNonceRequest>,
  ): QueryGetNextAvailableNonceRequest {
    const message = createBaseQueryGetNextAvailableNonceRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetNextAvailableNonceRequestProtoMsg,
  ): QueryGetNextAvailableNonceRequest {
    return QueryGetNextAvailableNonceRequest.decode(message.value);
  },
  toProto(message: QueryGetNextAvailableNonceRequest): Uint8Array {
    return QueryGetNextAvailableNonceRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetNextAvailableNonceRequest,
  ): QueryGetNextAvailableNonceRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceRequest',
      value: QueryGetNextAvailableNonceRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetNextAvailableNonceResponse(): QueryGetNextAvailableNonceResponse {
  return {
    nonce: Nonce.fromPartial({}),
  };
}
export const QueryGetNextAvailableNonceResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceResponse' as const,
  encode(
    message: QueryGetNextAvailableNonceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== undefined) {
      Nonce.encode(message.nonce, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetNextAvailableNonceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetNextAvailableNonceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = Nonce.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetNextAvailableNonceResponse {
    return {
      nonce: isSet(object.nonce) ? Nonce.fromJSON(object.nonce) : undefined,
    };
  },
  toJSON(
    message: QueryGetNextAvailableNonceResponse,
  ): JsonSafe<QueryGetNextAvailableNonceResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = message.nonce ? Nonce.toJSON(message.nonce) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetNextAvailableNonceResponse>,
  ): QueryGetNextAvailableNonceResponse {
    const message = createBaseQueryGetNextAvailableNonceResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? Nonce.fromPartial(object.nonce)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetNextAvailableNonceResponseProtoMsg,
  ): QueryGetNextAvailableNonceResponse {
    return QueryGetNextAvailableNonceResponse.decode(message.value);
  },
  toProto(message: QueryGetNextAvailableNonceResponse): Uint8Array {
    return QueryGetNextAvailableNonceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetNextAvailableNonceResponse,
  ): QueryGetNextAvailableNonceResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetNextAvailableNonceResponse',
      value: QueryGetNextAvailableNonceResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetSignatureThresholdRequest(): QueryGetSignatureThresholdRequest {
  return {};
}
export const QueryGetSignatureThresholdRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdRequest' as const,
  encode(
    _: QueryGetSignatureThresholdRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetSignatureThresholdRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetSignatureThresholdRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryGetSignatureThresholdRequest {
    return {};
  },
  toJSON(
    _: QueryGetSignatureThresholdRequest,
  ): JsonSafe<QueryGetSignatureThresholdRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetSignatureThresholdRequest>,
  ): QueryGetSignatureThresholdRequest {
    const message = createBaseQueryGetSignatureThresholdRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetSignatureThresholdRequestProtoMsg,
  ): QueryGetSignatureThresholdRequest {
    return QueryGetSignatureThresholdRequest.decode(message.value);
  },
  toProto(message: QueryGetSignatureThresholdRequest): Uint8Array {
    return QueryGetSignatureThresholdRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetSignatureThresholdRequest,
  ): QueryGetSignatureThresholdRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdRequest',
      value: QueryGetSignatureThresholdRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetSignatureThresholdResponse(): QueryGetSignatureThresholdResponse {
  return {
    amount: SignatureThreshold.fromPartial({}),
  };
}
export const QueryGetSignatureThresholdResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdResponse' as const,
  encode(
    message: QueryGetSignatureThresholdResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== undefined) {
      SignatureThreshold.encode(
        message.amount,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetSignatureThresholdResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetSignatureThresholdResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = SignatureThreshold.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetSignatureThresholdResponse {
    return {
      amount: isSet(object.amount)
        ? SignatureThreshold.fromJSON(object.amount)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetSignatureThresholdResponse,
  ): JsonSafe<QueryGetSignatureThresholdResponse> {
    const obj: any = {};
    message.amount !== undefined &&
      (obj.amount = message.amount
        ? SignatureThreshold.toJSON(message.amount)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetSignatureThresholdResponse>,
  ): QueryGetSignatureThresholdResponse {
    const message = createBaseQueryGetSignatureThresholdResponse();
    message.amount =
      object.amount !== undefined && object.amount !== null
        ? SignatureThreshold.fromPartial(object.amount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetSignatureThresholdResponseProtoMsg,
  ): QueryGetSignatureThresholdResponse {
    return QueryGetSignatureThresholdResponse.decode(message.value);
  },
  toProto(message: QueryGetSignatureThresholdResponse): Uint8Array {
    return QueryGetSignatureThresholdResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetSignatureThresholdResponse,
  ): QueryGetSignatureThresholdResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetSignatureThresholdResponse',
      value: QueryGetSignatureThresholdResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetTokenPairRequest(): QueryGetTokenPairRequest {
  return {
    remoteDomain: 0,
    remoteToken: '',
  };
}
export const QueryGetTokenPairRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetTokenPairRequest' as const,
  encode(
    message: QueryGetTokenPairRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.remoteDomain !== 0) {
      writer.uint32(8).uint32(message.remoteDomain);
    }
    if (message.remoteToken !== '') {
      writer.uint32(18).string(message.remoteToken);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetTokenPairRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetTokenPairRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.remoteDomain = reader.uint32();
          break;
        case 2:
          message.remoteToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetTokenPairRequest {
    return {
      remoteDomain: isSet(object.remoteDomain)
        ? Number(object.remoteDomain)
        : 0,
      remoteToken: isSet(object.remoteToken) ? String(object.remoteToken) : '',
    };
  },
  toJSON(
    message: QueryGetTokenPairRequest,
  ): JsonSafe<QueryGetTokenPairRequest> {
    const obj: any = {};
    message.remoteDomain !== undefined &&
      (obj.remoteDomain = Math.round(message.remoteDomain));
    message.remoteToken !== undefined &&
      (obj.remoteToken = message.remoteToken);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetTokenPairRequest>,
  ): QueryGetTokenPairRequest {
    const message = createBaseQueryGetTokenPairRequest();
    message.remoteDomain = object.remoteDomain ?? 0;
    message.remoteToken = object.remoteToken ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGetTokenPairRequestProtoMsg,
  ): QueryGetTokenPairRequest {
    return QueryGetTokenPairRequest.decode(message.value);
  },
  toProto(message: QueryGetTokenPairRequest): Uint8Array {
    return QueryGetTokenPairRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetTokenPairRequest,
  ): QueryGetTokenPairRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetTokenPairRequest',
      value: QueryGetTokenPairRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetTokenPairResponse(): QueryGetTokenPairResponse {
  return {
    pair: TokenPair.fromPartial({}),
  };
}
export const QueryGetTokenPairResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetTokenPairResponse' as const,
  encode(
    message: QueryGetTokenPairResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pair !== undefined) {
      TokenPair.encode(message.pair, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetTokenPairResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetTokenPairResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pair = TokenPair.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetTokenPairResponse {
    return {
      pair: isSet(object.pair) ? TokenPair.fromJSON(object.pair) : undefined,
    };
  },
  toJSON(
    message: QueryGetTokenPairResponse,
  ): JsonSafe<QueryGetTokenPairResponse> {
    const obj: any = {};
    message.pair !== undefined &&
      (obj.pair = message.pair ? TokenPair.toJSON(message.pair) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetTokenPairResponse>,
  ): QueryGetTokenPairResponse {
    const message = createBaseQueryGetTokenPairResponse();
    message.pair =
      object.pair !== undefined && object.pair !== null
        ? TokenPair.fromPartial(object.pair)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetTokenPairResponseProtoMsg,
  ): QueryGetTokenPairResponse {
    return QueryGetTokenPairResponse.decode(message.value);
  },
  toProto(message: QueryGetTokenPairResponse): Uint8Array {
    return QueryGetTokenPairResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetTokenPairResponse,
  ): QueryGetTokenPairResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetTokenPairResponse',
      value: QueryGetTokenPairResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllTokenPairsRequest(): QueryAllTokenPairsRequest {
  return {
    pagination: undefined,
  };
}
export const QueryAllTokenPairsRequest = {
  typeUrl: '/circle.cctp.v1.QueryAllTokenPairsRequest' as const,
  encode(
    message: QueryAllTokenPairsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllTokenPairsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllTokenPairsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllTokenPairsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllTokenPairsRequest,
  ): JsonSafe<QueryAllTokenPairsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllTokenPairsRequest>,
  ): QueryAllTokenPairsRequest {
    const message = createBaseQueryAllTokenPairsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllTokenPairsRequestProtoMsg,
  ): QueryAllTokenPairsRequest {
    return QueryAllTokenPairsRequest.decode(message.value);
  },
  toProto(message: QueryAllTokenPairsRequest): Uint8Array {
    return QueryAllTokenPairsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllTokenPairsRequest,
  ): QueryAllTokenPairsRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllTokenPairsRequest',
      value: QueryAllTokenPairsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllTokenPairsResponse(): QueryAllTokenPairsResponse {
  return {
    tokenPairs: [],
    pagination: undefined,
  };
}
export const QueryAllTokenPairsResponse = {
  typeUrl: '/circle.cctp.v1.QueryAllTokenPairsResponse' as const,
  encode(
    message: QueryAllTokenPairsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.tokenPairs) {
      TokenPair.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllTokenPairsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllTokenPairsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tokenPairs.push(TokenPair.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllTokenPairsResponse {
    return {
      tokenPairs: Array.isArray(object?.tokenPairs)
        ? object.tokenPairs.map((e: any) => TokenPair.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllTokenPairsResponse,
  ): JsonSafe<QueryAllTokenPairsResponse> {
    const obj: any = {};
    if (message.tokenPairs) {
      obj.tokenPairs = message.tokenPairs.map(e =>
        e ? TokenPair.toJSON(e) : undefined,
      );
    } else {
      obj.tokenPairs = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllTokenPairsResponse>,
  ): QueryAllTokenPairsResponse {
    const message = createBaseQueryAllTokenPairsResponse();
    message.tokenPairs =
      object.tokenPairs?.map(e => TokenPair.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllTokenPairsResponseProtoMsg,
  ): QueryAllTokenPairsResponse {
    return QueryAllTokenPairsResponse.decode(message.value);
  },
  toProto(message: QueryAllTokenPairsResponse): Uint8Array {
    return QueryAllTokenPairsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllTokenPairsResponse,
  ): QueryAllTokenPairsResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllTokenPairsResponse',
      value: QueryAllTokenPairsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetUsedNonceRequest(): QueryGetUsedNonceRequest {
  return {
    sourceDomain: 0,
    nonce: BigInt(0),
  };
}
export const QueryGetUsedNonceRequest = {
  typeUrl: '/circle.cctp.v1.QueryGetUsedNonceRequest' as const,
  encode(
    message: QueryGetUsedNonceRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sourceDomain !== 0) {
      writer.uint32(8).uint32(message.sourceDomain);
    }
    if (message.nonce !== BigInt(0)) {
      writer.uint32(16).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetUsedNonceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetUsedNonceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sourceDomain = reader.uint32();
          break;
        case 2:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetUsedNonceRequest {
    return {
      sourceDomain: isSet(object.sourceDomain)
        ? Number(object.sourceDomain)
        : 0,
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: QueryGetUsedNonceRequest,
  ): JsonSafe<QueryGetUsedNonceRequest> {
    const obj: any = {};
    message.sourceDomain !== undefined &&
      (obj.sourceDomain = Math.round(message.sourceDomain));
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetUsedNonceRequest>,
  ): QueryGetUsedNonceRequest {
    const message = createBaseQueryGetUsedNonceRequest();
    message.sourceDomain = object.sourceDomain ?? 0;
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryGetUsedNonceRequestProtoMsg,
  ): QueryGetUsedNonceRequest {
    return QueryGetUsedNonceRequest.decode(message.value);
  },
  toProto(message: QueryGetUsedNonceRequest): Uint8Array {
    return QueryGetUsedNonceRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetUsedNonceRequest,
  ): QueryGetUsedNonceRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetUsedNonceRequest',
      value: QueryGetUsedNonceRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetUsedNonceResponse(): QueryGetUsedNonceResponse {
  return {
    nonce: Nonce.fromPartial({}),
  };
}
export const QueryGetUsedNonceResponse = {
  typeUrl: '/circle.cctp.v1.QueryGetUsedNonceResponse' as const,
  encode(
    message: QueryGetUsedNonceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== undefined) {
      Nonce.encode(message.nonce, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetUsedNonceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetUsedNonceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = Nonce.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetUsedNonceResponse {
    return {
      nonce: isSet(object.nonce) ? Nonce.fromJSON(object.nonce) : undefined,
    };
  },
  toJSON(
    message: QueryGetUsedNonceResponse,
  ): JsonSafe<QueryGetUsedNonceResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = message.nonce ? Nonce.toJSON(message.nonce) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetUsedNonceResponse>,
  ): QueryGetUsedNonceResponse {
    const message = createBaseQueryGetUsedNonceResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? Nonce.fromPartial(object.nonce)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetUsedNonceResponseProtoMsg,
  ): QueryGetUsedNonceResponse {
    return QueryGetUsedNonceResponse.decode(message.value);
  },
  toProto(message: QueryGetUsedNonceResponse): Uint8Array {
    return QueryGetUsedNonceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetUsedNonceResponse,
  ): QueryGetUsedNonceResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryGetUsedNonceResponse',
      value: QueryGetUsedNonceResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryAllUsedNoncesRequest(): QueryAllUsedNoncesRequest {
  return {
    pagination: undefined,
  };
}
export const QueryAllUsedNoncesRequest = {
  typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesRequest' as const,
  encode(
    message: QueryAllUsedNoncesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllUsedNoncesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllUsedNoncesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllUsedNoncesRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllUsedNoncesRequest,
  ): JsonSafe<QueryAllUsedNoncesRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllUsedNoncesRequest>,
  ): QueryAllUsedNoncesRequest {
    const message = createBaseQueryAllUsedNoncesRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllUsedNoncesRequestProtoMsg,
  ): QueryAllUsedNoncesRequest {
    return QueryAllUsedNoncesRequest.decode(message.value);
  },
  toProto(message: QueryAllUsedNoncesRequest): Uint8Array {
    return QueryAllUsedNoncesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllUsedNoncesRequest,
  ): QueryAllUsedNoncesRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesRequest',
      value: QueryAllUsedNoncesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryAllUsedNoncesResponse(): QueryAllUsedNoncesResponse {
  return {
    usedNonces: [],
    pagination: undefined,
  };
}
export const QueryAllUsedNoncesResponse = {
  typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesResponse' as const,
  encode(
    message: QueryAllUsedNoncesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.usedNonces) {
      Nonce.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryAllUsedNoncesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryAllUsedNoncesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.usedNonces.push(Nonce.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryAllUsedNoncesResponse {
    return {
      usedNonces: Array.isArray(object?.usedNonces)
        ? object.usedNonces.map((e: any) => Nonce.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryAllUsedNoncesResponse,
  ): JsonSafe<QueryAllUsedNoncesResponse> {
    const obj: any = {};
    if (message.usedNonces) {
      obj.usedNonces = message.usedNonces.map(e =>
        e ? Nonce.toJSON(e) : undefined,
      );
    } else {
      obj.usedNonces = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryAllUsedNoncesResponse>,
  ): QueryAllUsedNoncesResponse {
    const message = createBaseQueryAllUsedNoncesResponse();
    message.usedNonces =
      object.usedNonces?.map(e => Nonce.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryAllUsedNoncesResponseProtoMsg,
  ): QueryAllUsedNoncesResponse {
    return QueryAllUsedNoncesResponse.decode(message.value);
  },
  toProto(message: QueryAllUsedNoncesResponse): Uint8Array {
    return QueryAllUsedNoncesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryAllUsedNoncesResponse,
  ): QueryAllUsedNoncesResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryAllUsedNoncesResponse',
      value: QueryAllUsedNoncesResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryRemoteTokenMessengerRequest(): QueryRemoteTokenMessengerRequest {
  return {
    domainId: 0,
  };
}
export const QueryRemoteTokenMessengerRequest = {
  typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerRequest' as const,
  encode(
    message: QueryRemoteTokenMessengerRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.domainId !== 0) {
      writer.uint32(8).uint32(message.domainId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryRemoteTokenMessengerRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRemoteTokenMessengerRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.domainId = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryRemoteTokenMessengerRequest {
    return {
      domainId: isSet(object.domainId) ? Number(object.domainId) : 0,
    };
  },
  toJSON(
    message: QueryRemoteTokenMessengerRequest,
  ): JsonSafe<QueryRemoteTokenMessengerRequest> {
    const obj: any = {};
    message.domainId !== undefined &&
      (obj.domainId = Math.round(message.domainId));
    return obj;
  },
  fromPartial(
    object: Partial<QueryRemoteTokenMessengerRequest>,
  ): QueryRemoteTokenMessengerRequest {
    const message = createBaseQueryRemoteTokenMessengerRequest();
    message.domainId = object.domainId ?? 0;
    return message;
  },
  fromProtoMsg(
    message: QueryRemoteTokenMessengerRequestProtoMsg,
  ): QueryRemoteTokenMessengerRequest {
    return QueryRemoteTokenMessengerRequest.decode(message.value);
  },
  toProto(message: QueryRemoteTokenMessengerRequest): Uint8Array {
    return QueryRemoteTokenMessengerRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryRemoteTokenMessengerRequest,
  ): QueryRemoteTokenMessengerRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerRequest',
      value: QueryRemoteTokenMessengerRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryRemoteTokenMessengerResponse(): QueryRemoteTokenMessengerResponse {
  return {
    remoteTokenMessenger: RemoteTokenMessenger.fromPartial({}),
  };
}
export const QueryRemoteTokenMessengerResponse = {
  typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerResponse' as const,
  encode(
    message: QueryRemoteTokenMessengerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.remoteTokenMessenger !== undefined) {
      RemoteTokenMessenger.encode(
        message.remoteTokenMessenger,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryRemoteTokenMessengerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRemoteTokenMessengerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.remoteTokenMessenger = RemoteTokenMessenger.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryRemoteTokenMessengerResponse {
    return {
      remoteTokenMessenger: isSet(object.remoteTokenMessenger)
        ? RemoteTokenMessenger.fromJSON(object.remoteTokenMessenger)
        : undefined,
    };
  },
  toJSON(
    message: QueryRemoteTokenMessengerResponse,
  ): JsonSafe<QueryRemoteTokenMessengerResponse> {
    const obj: any = {};
    message.remoteTokenMessenger !== undefined &&
      (obj.remoteTokenMessenger = message.remoteTokenMessenger
        ? RemoteTokenMessenger.toJSON(message.remoteTokenMessenger)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryRemoteTokenMessengerResponse>,
  ): QueryRemoteTokenMessengerResponse {
    const message = createBaseQueryRemoteTokenMessengerResponse();
    message.remoteTokenMessenger =
      object.remoteTokenMessenger !== undefined &&
      object.remoteTokenMessenger !== null
        ? RemoteTokenMessenger.fromPartial(object.remoteTokenMessenger)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryRemoteTokenMessengerResponseProtoMsg,
  ): QueryRemoteTokenMessengerResponse {
    return QueryRemoteTokenMessengerResponse.decode(message.value);
  },
  toProto(message: QueryRemoteTokenMessengerResponse): Uint8Array {
    return QueryRemoteTokenMessengerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryRemoteTokenMessengerResponse,
  ): QueryRemoteTokenMessengerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengerResponse',
      value: QueryRemoteTokenMessengerResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryRemoteTokenMessengersRequest(): QueryRemoteTokenMessengersRequest {
  return {
    pagination: undefined,
  };
}
export const QueryRemoteTokenMessengersRequest = {
  typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersRequest' as const,
  encode(
    message: QueryRemoteTokenMessengersRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryRemoteTokenMessengersRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRemoteTokenMessengersRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryRemoteTokenMessengersRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryRemoteTokenMessengersRequest,
  ): JsonSafe<QueryRemoteTokenMessengersRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryRemoteTokenMessengersRequest>,
  ): QueryRemoteTokenMessengersRequest {
    const message = createBaseQueryRemoteTokenMessengersRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryRemoteTokenMessengersRequestProtoMsg,
  ): QueryRemoteTokenMessengersRequest {
    return QueryRemoteTokenMessengersRequest.decode(message.value);
  },
  toProto(message: QueryRemoteTokenMessengersRequest): Uint8Array {
    return QueryRemoteTokenMessengersRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryRemoteTokenMessengersRequest,
  ): QueryRemoteTokenMessengersRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersRequest',
      value: QueryRemoteTokenMessengersRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryRemoteTokenMessengersResponse(): QueryRemoteTokenMessengersResponse {
  return {
    remoteTokenMessengers: [],
    pagination: undefined,
  };
}
export const QueryRemoteTokenMessengersResponse = {
  typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersResponse' as const,
  encode(
    message: QueryRemoteTokenMessengersResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.remoteTokenMessengers) {
      RemoteTokenMessenger.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryRemoteTokenMessengersResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryRemoteTokenMessengersResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.remoteTokenMessengers.push(
            RemoteTokenMessenger.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryRemoteTokenMessengersResponse {
    return {
      remoteTokenMessengers: Array.isArray(object?.remoteTokenMessengers)
        ? object.remoteTokenMessengers.map((e: any) =>
            RemoteTokenMessenger.fromJSON(e),
          )
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryRemoteTokenMessengersResponse,
  ): JsonSafe<QueryRemoteTokenMessengersResponse> {
    const obj: any = {};
    if (message.remoteTokenMessengers) {
      obj.remoteTokenMessengers = message.remoteTokenMessengers.map(e =>
        e ? RemoteTokenMessenger.toJSON(e) : undefined,
      );
    } else {
      obj.remoteTokenMessengers = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryRemoteTokenMessengersResponse>,
  ): QueryRemoteTokenMessengersResponse {
    const message = createBaseQueryRemoteTokenMessengersResponse();
    message.remoteTokenMessengers =
      object.remoteTokenMessengers?.map(e =>
        RemoteTokenMessenger.fromPartial(e),
      ) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryRemoteTokenMessengersResponseProtoMsg,
  ): QueryRemoteTokenMessengersResponse {
    return QueryRemoteTokenMessengersResponse.decode(message.value);
  },
  toProto(message: QueryRemoteTokenMessengersResponse): Uint8Array {
    return QueryRemoteTokenMessengersResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryRemoteTokenMessengersResponse,
  ): QueryRemoteTokenMessengersResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryRemoteTokenMessengersResponse',
      value: QueryRemoteTokenMessengersResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryBurnMessageVersionRequest(): QueryBurnMessageVersionRequest {
  return {};
}
export const QueryBurnMessageVersionRequest = {
  typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionRequest' as const,
  encode(
    _: QueryBurnMessageVersionRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryBurnMessageVersionRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryBurnMessageVersionRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryBurnMessageVersionRequest {
    return {};
  },
  toJSON(
    _: QueryBurnMessageVersionRequest,
  ): JsonSafe<QueryBurnMessageVersionRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryBurnMessageVersionRequest>,
  ): QueryBurnMessageVersionRequest {
    const message = createBaseQueryBurnMessageVersionRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryBurnMessageVersionRequestProtoMsg,
  ): QueryBurnMessageVersionRequest {
    return QueryBurnMessageVersionRequest.decode(message.value);
  },
  toProto(message: QueryBurnMessageVersionRequest): Uint8Array {
    return QueryBurnMessageVersionRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryBurnMessageVersionRequest,
  ): QueryBurnMessageVersionRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionRequest',
      value: QueryBurnMessageVersionRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryBurnMessageVersionResponse(): QueryBurnMessageVersionResponse {
  return {
    version: 0,
  };
}
export const QueryBurnMessageVersionResponse = {
  typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionResponse' as const,
  encode(
    message: QueryBurnMessageVersionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== 0) {
      writer.uint32(8).uint32(message.version);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryBurnMessageVersionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryBurnMessageVersionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryBurnMessageVersionResponse {
    return {
      version: isSet(object.version) ? Number(object.version) : 0,
    };
  },
  toJSON(
    message: QueryBurnMessageVersionResponse,
  ): JsonSafe<QueryBurnMessageVersionResponse> {
    const obj: any = {};
    message.version !== undefined &&
      (obj.version = Math.round(message.version));
    return obj;
  },
  fromPartial(
    object: Partial<QueryBurnMessageVersionResponse>,
  ): QueryBurnMessageVersionResponse {
    const message = createBaseQueryBurnMessageVersionResponse();
    message.version = object.version ?? 0;
    return message;
  },
  fromProtoMsg(
    message: QueryBurnMessageVersionResponseProtoMsg,
  ): QueryBurnMessageVersionResponse {
    return QueryBurnMessageVersionResponse.decode(message.value);
  },
  toProto(message: QueryBurnMessageVersionResponse): Uint8Array {
    return QueryBurnMessageVersionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryBurnMessageVersionResponse,
  ): QueryBurnMessageVersionResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryBurnMessageVersionResponse',
      value: QueryBurnMessageVersionResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryLocalMessageVersionRequest(): QueryLocalMessageVersionRequest {
  return {};
}
export const QueryLocalMessageVersionRequest = {
  typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionRequest' as const,
  encode(
    _: QueryLocalMessageVersionRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLocalMessageVersionRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLocalMessageVersionRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryLocalMessageVersionRequest {
    return {};
  },
  toJSON(
    _: QueryLocalMessageVersionRequest,
  ): JsonSafe<QueryLocalMessageVersionRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryLocalMessageVersionRequest>,
  ): QueryLocalMessageVersionRequest {
    const message = createBaseQueryLocalMessageVersionRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryLocalMessageVersionRequestProtoMsg,
  ): QueryLocalMessageVersionRequest {
    return QueryLocalMessageVersionRequest.decode(message.value);
  },
  toProto(message: QueryLocalMessageVersionRequest): Uint8Array {
    return QueryLocalMessageVersionRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLocalMessageVersionRequest,
  ): QueryLocalMessageVersionRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionRequest',
      value: QueryLocalMessageVersionRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryLocalMessageVersionResponse(): QueryLocalMessageVersionResponse {
  return {
    version: 0,
  };
}
export const QueryLocalMessageVersionResponse = {
  typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionResponse' as const,
  encode(
    message: QueryLocalMessageVersionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== 0) {
      writer.uint32(8).uint32(message.version);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLocalMessageVersionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLocalMessageVersionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryLocalMessageVersionResponse {
    return {
      version: isSet(object.version) ? Number(object.version) : 0,
    };
  },
  toJSON(
    message: QueryLocalMessageVersionResponse,
  ): JsonSafe<QueryLocalMessageVersionResponse> {
    const obj: any = {};
    message.version !== undefined &&
      (obj.version = Math.round(message.version));
    return obj;
  },
  fromPartial(
    object: Partial<QueryLocalMessageVersionResponse>,
  ): QueryLocalMessageVersionResponse {
    const message = createBaseQueryLocalMessageVersionResponse();
    message.version = object.version ?? 0;
    return message;
  },
  fromProtoMsg(
    message: QueryLocalMessageVersionResponseProtoMsg,
  ): QueryLocalMessageVersionResponse {
    return QueryLocalMessageVersionResponse.decode(message.value);
  },
  toProto(message: QueryLocalMessageVersionResponse): Uint8Array {
    return QueryLocalMessageVersionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLocalMessageVersionResponse,
  ): QueryLocalMessageVersionResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryLocalMessageVersionResponse',
      value: QueryLocalMessageVersionResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryLocalDomainRequest(): QueryLocalDomainRequest {
  return {};
}
export const QueryLocalDomainRequest = {
  typeUrl: '/circle.cctp.v1.QueryLocalDomainRequest' as const,
  encode(
    _: QueryLocalDomainRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLocalDomainRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLocalDomainRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryLocalDomainRequest {
    return {};
  },
  toJSON(_: QueryLocalDomainRequest): JsonSafe<QueryLocalDomainRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryLocalDomainRequest>): QueryLocalDomainRequest {
    const message = createBaseQueryLocalDomainRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryLocalDomainRequestProtoMsg,
  ): QueryLocalDomainRequest {
    return QueryLocalDomainRequest.decode(message.value);
  },
  toProto(message: QueryLocalDomainRequest): Uint8Array {
    return QueryLocalDomainRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLocalDomainRequest,
  ): QueryLocalDomainRequestProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryLocalDomainRequest',
      value: QueryLocalDomainRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryLocalDomainResponse(): QueryLocalDomainResponse {
  return {
    domainId: 0,
  };
}
export const QueryLocalDomainResponse = {
  typeUrl: '/circle.cctp.v1.QueryLocalDomainResponse' as const,
  encode(
    message: QueryLocalDomainResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.domainId !== 0) {
      writer.uint32(8).uint32(message.domainId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryLocalDomainResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryLocalDomainResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.domainId = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryLocalDomainResponse {
    return {
      domainId: isSet(object.domainId) ? Number(object.domainId) : 0,
    };
  },
  toJSON(
    message: QueryLocalDomainResponse,
  ): JsonSafe<QueryLocalDomainResponse> {
    const obj: any = {};
    message.domainId !== undefined &&
      (obj.domainId = Math.round(message.domainId));
    return obj;
  },
  fromPartial(
    object: Partial<QueryLocalDomainResponse>,
  ): QueryLocalDomainResponse {
    const message = createBaseQueryLocalDomainResponse();
    message.domainId = object.domainId ?? 0;
    return message;
  },
  fromProtoMsg(
    message: QueryLocalDomainResponseProtoMsg,
  ): QueryLocalDomainResponse {
    return QueryLocalDomainResponse.decode(message.value);
  },
  toProto(message: QueryLocalDomainResponse): Uint8Array {
    return QueryLocalDomainResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryLocalDomainResponse,
  ): QueryLocalDomainResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.QueryLocalDomainResponse',
      value: QueryLocalDomainResponse.encode(message).finish(),
    };
  },
};
