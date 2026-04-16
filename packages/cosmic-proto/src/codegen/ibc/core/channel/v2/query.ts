//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { Height, type HeightSDKType } from '../../client/v1/client.js';
import { PacketState, type PacketStateSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * QueryNextSequenceSendRequest is the request type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendRequest
 */
export interface QueryNextSequenceSendRequest {
  /**
   * client unique identifier
   */
  clientId: string;
}
export interface QueryNextSequenceSendRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendRequest';
  value: Uint8Array;
}
/**
 * QueryNextSequenceSendRequest is the request type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendRequest
 */
export interface QueryNextSequenceSendRequestSDKType {
  client_id: string;
}
/**
 * QueryNextSequenceSendResponse is the response type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendResponse
 */
export interface QueryNextSequenceSendResponse {
  /**
   * next sequence send number
   */
  nextSequenceSend: bigint;
  /**
   * merkle proof of existence
   */
  proof: Uint8Array;
  /**
   * height at which the proof was retrieved
   */
  proofHeight: Height;
}
export interface QueryNextSequenceSendResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendResponse';
  value: Uint8Array;
}
/**
 * QueryNextSequenceSendResponse is the response type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendResponse
 */
export interface QueryNextSequenceSendResponseSDKType {
  next_sequence_send: bigint;
  proof: Uint8Array;
  proof_height: HeightSDKType;
}
/**
 * QueryPacketCommitmentRequest is the request type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentRequest
 */
export interface QueryPacketCommitmentRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * packet sequence
   */
  sequence: bigint;
}
export interface QueryPacketCommitmentRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentRequest';
  value: Uint8Array;
}
/**
 * QueryPacketCommitmentRequest is the request type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentRequest
 */
export interface QueryPacketCommitmentRequestSDKType {
  client_id: string;
  sequence: bigint;
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentResponse
 */
export interface QueryPacketCommitmentResponse {
  /**
   * packet associated with the request fields
   */
  commitment: Uint8Array;
  /**
   * merkle proof of existence
   */
  proof: Uint8Array;
  /**
   * height at which the proof was retrieved
   */
  proofHeight: Height;
}
export interface QueryPacketCommitmentResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentResponse';
  value: Uint8Array;
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentResponse
 */
export interface QueryPacketCommitmentResponseSDKType {
  commitment: Uint8Array;
  proof: Uint8Array;
  proof_height: HeightSDKType;
}
/**
 * QueryPacketCommitmentsRequest is the request type for the Query/PacketCommitments RPC method.
 * @name QueryPacketCommitmentsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsRequest
 */
export interface QueryPacketCommitmentsRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * pagination request
   */
  pagination?: PageRequest;
}
export interface QueryPacketCommitmentsRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsRequest';
  value: Uint8Array;
}
/**
 * QueryPacketCommitmentsRequest is the request type for the Query/PacketCommitments RPC method.
 * @name QueryPacketCommitmentsRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsRequest
 */
export interface QueryPacketCommitmentsRequestSDKType {
  client_id: string;
  pagination?: PageRequestSDKType;
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsResponse
 */
export interface QueryPacketCommitmentsResponse {
  /**
   * collection of packet commitments for the requested channel identifier.
   */
  commitments: PacketState[];
  /**
   * pagination response.
   */
  pagination?: PageResponse;
  /**
   * query block height.
   */
  height: Height;
}
export interface QueryPacketCommitmentsResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsResponse';
  value: Uint8Array;
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentsResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsResponse
 */
export interface QueryPacketCommitmentsResponseSDKType {
  commitments: PacketStateSDKType[];
  pagination?: PageResponseSDKType;
  height: HeightSDKType;
}
/**
 * QueryPacketAcknowledgementRequest is the request type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementRequest
 */
export interface QueryPacketAcknowledgementRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * packet sequence
   */
  sequence: bigint;
}
export interface QueryPacketAcknowledgementRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementRequest';
  value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementRequest is the request type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementRequest
 */
export interface QueryPacketAcknowledgementRequestSDKType {
  client_id: string;
  sequence: bigint;
}
/**
 * QueryPacketAcknowledgementResponse is the response type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementResponse
 */
export interface QueryPacketAcknowledgementResponse {
  /**
   * acknowledgement associated with the request fields
   */
  acknowledgement: Uint8Array;
  /**
   * merkle proof of existence
   */
  proof: Uint8Array;
  /**
   * height at which the proof was retrieved
   */
  proofHeight: Height;
}
export interface QueryPacketAcknowledgementResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementResponse';
  value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementResponse is the response type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementResponse
 */
export interface QueryPacketAcknowledgementResponseSDKType {
  acknowledgement: Uint8Array;
  proof: Uint8Array;
  proof_height: HeightSDKType;
}
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsRequest
 */
export interface QueryPacketAcknowledgementsRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * pagination request
   */
  pagination?: PageRequest;
  /**
   * list of packet sequences
   */
  packetCommitmentSequences: bigint[];
}
export interface QueryPacketAcknowledgementsRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsRequest';
  value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsRequest
 */
export interface QueryPacketAcknowledgementsRequestSDKType {
  client_id: string;
  pagination?: PageRequestSDKType;
  packet_commitment_sequences: bigint[];
}
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsResponse
 */
export interface QueryPacketAcknowledgementsResponse {
  acknowledgements: PacketState[];
  /**
   * pagination response
   */
  pagination?: PageResponse;
  /**
   * query block height
   */
  height: Height;
}
export interface QueryPacketAcknowledgementsResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsResponse';
  value: Uint8Array;
}
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsResponse
 */
export interface QueryPacketAcknowledgementsResponseSDKType {
  acknowledgements: PacketStateSDKType[];
  pagination?: PageResponseSDKType;
  height: HeightSDKType;
}
/**
 * QueryPacketReceiptRequest is the request type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptRequest
 */
export interface QueryPacketReceiptRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * packet sequence
   */
  sequence: bigint;
}
export interface QueryPacketReceiptRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptRequest';
  value: Uint8Array;
}
/**
 * QueryPacketReceiptRequest is the request type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptRequest
 */
export interface QueryPacketReceiptRequestSDKType {
  client_id: string;
  sequence: bigint;
}
/**
 * QueryPacketReceiptResponse is the response type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptResponse
 */
export interface QueryPacketReceiptResponse {
  /**
   * success flag for if receipt exists
   */
  received: boolean;
  /**
   * merkle proof of existence or absence
   */
  proof: Uint8Array;
  /**
   * height at which the proof was retrieved
   */
  proofHeight: Height;
}
export interface QueryPacketReceiptResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptResponse';
  value: Uint8Array;
}
/**
 * QueryPacketReceiptResponse is the response type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptResponse
 */
export interface QueryPacketReceiptResponseSDKType {
  received: boolean;
  proof: Uint8Array;
  proof_height: HeightSDKType;
}
/**
 * QueryUnreceivedPacketsRequest is the request type for the Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsRequest
 */
export interface QueryUnreceivedPacketsRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * list of packet sequences
   */
  sequences: bigint[];
}
export interface QueryUnreceivedPacketsRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsRequest';
  value: Uint8Array;
}
/**
 * QueryUnreceivedPacketsRequest is the request type for the Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsRequest
 */
export interface QueryUnreceivedPacketsRequestSDKType {
  client_id: string;
  sequences: bigint[];
}
/**
 * QueryUnreceivedPacketsResponse is the response type for the Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsResponse
 */
export interface QueryUnreceivedPacketsResponse {
  /**
   * list of unreceived packet sequences
   */
  sequences: bigint[];
  /**
   * query block height
   */
  height: Height;
}
export interface QueryUnreceivedPacketsResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsResponse';
  value: Uint8Array;
}
/**
 * QueryUnreceivedPacketsResponse is the response type for the Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsResponse
 */
export interface QueryUnreceivedPacketsResponseSDKType {
  sequences: bigint[];
  height: HeightSDKType;
}
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksRequest
 */
export interface QueryUnreceivedAcksRequest {
  /**
   * client unique identifier
   */
  clientId: string;
  /**
   * list of acknowledgement sequences
   */
  packetAckSequences: bigint[];
}
export interface QueryUnreceivedAcksRequestProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksRequest';
  value: Uint8Array;
}
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequestSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksRequest
 */
export interface QueryUnreceivedAcksRequestSDKType {
  client_id: string;
  packet_ack_sequences: bigint[];
}
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksResponse
 */
export interface QueryUnreceivedAcksResponse {
  /**
   * list of unreceived acknowledgement sequences
   */
  sequences: bigint[];
  /**
   * query block height
   */
  height: Height;
}
export interface QueryUnreceivedAcksResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksResponse';
  value: Uint8Array;
}
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksResponse
 */
export interface QueryUnreceivedAcksResponseSDKType {
  sequences: bigint[];
  height: HeightSDKType;
}
function createBaseQueryNextSequenceSendRequest(): QueryNextSequenceSendRequest {
  return {
    clientId: '',
  };
}
/**
 * QueryNextSequenceSendRequest is the request type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendRequest
 */
export const QueryNextSequenceSendRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendRequest' as const,
  aminoType: 'cosmos-sdk/QueryNextSequenceSendRequest' as const,
  is(o: any): o is QueryNextSequenceSendRequest {
    return (
      o &&
      (o.$typeUrl === QueryNextSequenceSendRequest.typeUrl ||
        typeof o.clientId === 'string')
    );
  },
  isSDK(o: any): o is QueryNextSequenceSendRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryNextSequenceSendRequest.typeUrl ||
        typeof o.client_id === 'string')
    );
  },
  encode(
    message: QueryNextSequenceSendRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryNextSequenceSendRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryNextSequenceSendRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryNextSequenceSendRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
    };
  },
  toJSON(
    message: QueryNextSequenceSendRequest,
  ): JsonSafe<QueryNextSequenceSendRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    return obj;
  },
  fromPartial(
    object: Partial<QueryNextSequenceSendRequest>,
  ): QueryNextSequenceSendRequest {
    const message = createBaseQueryNextSequenceSendRequest();
    message.clientId = object.clientId ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryNextSequenceSendRequestProtoMsg,
  ): QueryNextSequenceSendRequest {
    return QueryNextSequenceSendRequest.decode(message.value);
  },
  toProto(message: QueryNextSequenceSendRequest): Uint8Array {
    return QueryNextSequenceSendRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryNextSequenceSendRequest,
  ): QueryNextSequenceSendRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendRequest',
      value: QueryNextSequenceSendRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryNextSequenceSendResponse(): QueryNextSequenceSendResponse {
  return {
    nextSequenceSend: BigInt(0),
    proof: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
  };
}
/**
 * QueryNextSequenceSendResponse is the response type for the Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryNextSequenceSendResponse
 */
export const QueryNextSequenceSendResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendResponse' as const,
  aminoType: 'cosmos-sdk/QueryNextSequenceSendResponse' as const,
  is(o: any): o is QueryNextSequenceSendResponse {
    return (
      o &&
      (o.$typeUrl === QueryNextSequenceSendResponse.typeUrl ||
        (typeof o.nextSequenceSend === 'bigint' &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.is(o.proofHeight)))
    );
  },
  isSDK(o: any): o is QueryNextSequenceSendResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryNextSequenceSendResponse.typeUrl ||
        (typeof o.next_sequence_send === 'bigint' &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.isSDK(o.proof_height)))
    );
  },
  encode(
    message: QueryNextSequenceSendResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nextSequenceSend !== BigInt(0)) {
      writer.uint32(8).uint64(message.nextSequenceSend);
    }
    if (message.proof.length !== 0) {
      writer.uint32(18).bytes(message.proof);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryNextSequenceSendResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryNextSequenceSendResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nextSequenceSend = reader.uint64();
          break;
        case 2:
          message.proof = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryNextSequenceSendResponse {
    return {
      nextSequenceSend: isSet(object.nextSequenceSend)
        ? BigInt(object.nextSequenceSend.toString())
        : BigInt(0),
      proof: isSet(object.proof)
        ? bytesFromBase64(object.proof)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
    };
  },
  toJSON(
    message: QueryNextSequenceSendResponse,
  ): JsonSafe<QueryNextSequenceSendResponse> {
    const obj: any = {};
    message.nextSequenceSend !== undefined &&
      (obj.nextSequenceSend = (
        message.nextSequenceSend || BigInt(0)
      ).toString());
    message.proof !== undefined &&
      (obj.proof = base64FromBytes(
        message.proof !== undefined ? message.proof : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryNextSequenceSendResponse>,
  ): QueryNextSequenceSendResponse {
    const message = createBaseQueryNextSequenceSendResponse();
    message.nextSequenceSend =
      object.nextSequenceSend !== undefined && object.nextSequenceSend !== null
        ? BigInt(object.nextSequenceSend.toString())
        : BigInt(0);
    message.proof = object.proof ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryNextSequenceSendResponseProtoMsg,
  ): QueryNextSequenceSendResponse {
    return QueryNextSequenceSendResponse.decode(message.value);
  },
  toProto(message: QueryNextSequenceSendResponse): Uint8Array {
    return QueryNextSequenceSendResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryNextSequenceSendResponse,
  ): QueryNextSequenceSendResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryNextSequenceSendResponse',
      value: QueryNextSequenceSendResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketCommitmentRequest(): QueryPacketCommitmentRequest {
  return {
    clientId: '',
    sequence: BigInt(0),
  };
}
/**
 * QueryPacketCommitmentRequest is the request type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentRequest
 */
export const QueryPacketCommitmentRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentRequest' as const,
  aminoType: 'cosmos-sdk/QueryPacketCommitmentRequest' as const,
  is(o: any): o is QueryPacketCommitmentRequest {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentRequest.typeUrl ||
        (typeof o.clientId === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  isSDK(o: any): o is QueryPacketCommitmentRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentRequest.typeUrl ||
        (typeof o.client_id === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  encode(
    message: QueryPacketCommitmentRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.sequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.sequence);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketCommitmentRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketCommitmentRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.sequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketCommitmentRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryPacketCommitmentRequest,
  ): JsonSafe<QueryPacketCommitmentRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketCommitmentRequest>,
  ): QueryPacketCommitmentRequest {
    const message = createBaseQueryPacketCommitmentRequest();
    message.clientId = object.clientId ?? '';
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryPacketCommitmentRequestProtoMsg,
  ): QueryPacketCommitmentRequest {
    return QueryPacketCommitmentRequest.decode(message.value);
  },
  toProto(message: QueryPacketCommitmentRequest): Uint8Array {
    return QueryPacketCommitmentRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketCommitmentRequest,
  ): QueryPacketCommitmentRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentRequest',
      value: QueryPacketCommitmentRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketCommitmentResponse(): QueryPacketCommitmentResponse {
  return {
    commitment: new Uint8Array(),
    proof: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
  };
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentResponse
 */
export const QueryPacketCommitmentResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentResponse' as const,
  aminoType: 'cosmos-sdk/QueryPacketCommitmentResponse' as const,
  is(o: any): o is QueryPacketCommitmentResponse {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentResponse.typeUrl ||
        ((o.commitment instanceof Uint8Array ||
          typeof o.commitment === 'string') &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.is(o.proofHeight)))
    );
  },
  isSDK(o: any): o is QueryPacketCommitmentResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentResponse.typeUrl ||
        ((o.commitment instanceof Uint8Array ||
          typeof o.commitment === 'string') &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.isSDK(o.proof_height)))
    );
  },
  encode(
    message: QueryPacketCommitmentResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.commitment.length !== 0) {
      writer.uint32(10).bytes(message.commitment);
    }
    if (message.proof.length !== 0) {
      writer.uint32(18).bytes(message.proof);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketCommitmentResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketCommitmentResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commitment = reader.bytes();
          break;
        case 2:
          message.proof = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketCommitmentResponse {
    return {
      commitment: isSet(object.commitment)
        ? bytesFromBase64(object.commitment)
        : new Uint8Array(),
      proof: isSet(object.proof)
        ? bytesFromBase64(object.proof)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
    };
  },
  toJSON(
    message: QueryPacketCommitmentResponse,
  ): JsonSafe<QueryPacketCommitmentResponse> {
    const obj: any = {};
    message.commitment !== undefined &&
      (obj.commitment = base64FromBytes(
        message.commitment !== undefined
          ? message.commitment
          : new Uint8Array(),
      ));
    message.proof !== undefined &&
      (obj.proof = base64FromBytes(
        message.proof !== undefined ? message.proof : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketCommitmentResponse>,
  ): QueryPacketCommitmentResponse {
    const message = createBaseQueryPacketCommitmentResponse();
    message.commitment = object.commitment ?? new Uint8Array();
    message.proof = object.proof ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketCommitmentResponseProtoMsg,
  ): QueryPacketCommitmentResponse {
    return QueryPacketCommitmentResponse.decode(message.value);
  },
  toProto(message: QueryPacketCommitmentResponse): Uint8Array {
    return QueryPacketCommitmentResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketCommitmentResponse,
  ): QueryPacketCommitmentResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentResponse',
      value: QueryPacketCommitmentResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketCommitmentsRequest(): QueryPacketCommitmentsRequest {
  return {
    clientId: '',
    pagination: undefined,
  };
}
/**
 * QueryPacketCommitmentsRequest is the request type for the Query/PacketCommitments RPC method.
 * @name QueryPacketCommitmentsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsRequest
 */
export const QueryPacketCommitmentsRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsRequest' as const,
  aminoType: 'cosmos-sdk/QueryPacketCommitmentsRequest' as const,
  is(o: any): o is QueryPacketCommitmentsRequest {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentsRequest.typeUrl ||
        typeof o.clientId === 'string')
    );
  },
  isSDK(o: any): o is QueryPacketCommitmentsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentsRequest.typeUrl ||
        typeof o.client_id === 'string')
    );
  },
  encode(
    message: QueryPacketCommitmentsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketCommitmentsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketCommitmentsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketCommitmentsRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryPacketCommitmentsRequest,
  ): JsonSafe<QueryPacketCommitmentsRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketCommitmentsRequest>,
  ): QueryPacketCommitmentsRequest {
    const message = createBaseQueryPacketCommitmentsRequest();
    message.clientId = object.clientId ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketCommitmentsRequestProtoMsg,
  ): QueryPacketCommitmentsRequest {
    return QueryPacketCommitmentsRequest.decode(message.value);
  },
  toProto(message: QueryPacketCommitmentsRequest): Uint8Array {
    return QueryPacketCommitmentsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketCommitmentsRequest,
  ): QueryPacketCommitmentsRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsRequest',
      value: QueryPacketCommitmentsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketCommitmentsResponse(): QueryPacketCommitmentsResponse {
  return {
    commitments: [],
    pagination: undefined,
    height: Height.fromPartial({}),
  };
}
/**
 * QueryPacketCommitmentResponse is the response type for the Query/PacketCommitment RPC method.
 * @name QueryPacketCommitmentsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketCommitmentsResponse
 */
export const QueryPacketCommitmentsResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsResponse' as const,
  aminoType: 'cosmos-sdk/QueryPacketCommitmentsResponse' as const,
  is(o: any): o is QueryPacketCommitmentsResponse {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentsResponse.typeUrl ||
        (Array.isArray(o.commitments) &&
          (!o.commitments.length || PacketState.is(o.commitments[0])) &&
          Height.is(o.height)))
    );
  },
  isSDK(o: any): o is QueryPacketCommitmentsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketCommitmentsResponse.typeUrl ||
        (Array.isArray(o.commitments) &&
          (!o.commitments.length || PacketState.isSDK(o.commitments[0])) &&
          Height.isSDK(o.height)))
    );
  },
  encode(
    message: QueryPacketCommitmentsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.commitments) {
      PacketState.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.height !== undefined) {
      Height.encode(message.height, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketCommitmentsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketCommitmentsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commitments.push(PacketState.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        case 3:
          message.height = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketCommitmentsResponse {
    return {
      commitments: Array.isArray(object?.commitments)
        ? object.commitments.map((e: any) => PacketState.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
      height: isSet(object.height) ? Height.fromJSON(object.height) : undefined,
    };
  },
  toJSON(
    message: QueryPacketCommitmentsResponse,
  ): JsonSafe<QueryPacketCommitmentsResponse> {
    const obj: any = {};
    if (message.commitments) {
      obj.commitments = message.commitments.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.commitments = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    message.height !== undefined &&
      (obj.height = message.height ? Height.toJSON(message.height) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketCommitmentsResponse>,
  ): QueryPacketCommitmentsResponse {
    const message = createBaseQueryPacketCommitmentsResponse();
    message.commitments =
      object.commitments?.map(e => PacketState.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    message.height =
      object.height !== undefined && object.height !== null
        ? Height.fromPartial(object.height)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketCommitmentsResponseProtoMsg,
  ): QueryPacketCommitmentsResponse {
    return QueryPacketCommitmentsResponse.decode(message.value);
  },
  toProto(message: QueryPacketCommitmentsResponse): Uint8Array {
    return QueryPacketCommitmentsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketCommitmentsResponse,
  ): QueryPacketCommitmentsResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketCommitmentsResponse',
      value: QueryPacketCommitmentsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketAcknowledgementRequest(): QueryPacketAcknowledgementRequest {
  return {
    clientId: '',
    sequence: BigInt(0),
  };
}
/**
 * QueryPacketAcknowledgementRequest is the request type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementRequest
 */
export const QueryPacketAcknowledgementRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementRequest' as const,
  aminoType: 'cosmos-sdk/QueryPacketAcknowledgementRequest' as const,
  is(o: any): o is QueryPacketAcknowledgementRequest {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementRequest.typeUrl ||
        (typeof o.clientId === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  isSDK(o: any): o is QueryPacketAcknowledgementRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementRequest.typeUrl ||
        (typeof o.client_id === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  encode(
    message: QueryPacketAcknowledgementRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.sequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.sequence);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketAcknowledgementRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketAcknowledgementRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.sequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketAcknowledgementRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryPacketAcknowledgementRequest,
  ): JsonSafe<QueryPacketAcknowledgementRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketAcknowledgementRequest>,
  ): QueryPacketAcknowledgementRequest {
    const message = createBaseQueryPacketAcknowledgementRequest();
    message.clientId = object.clientId ?? '';
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryPacketAcknowledgementRequestProtoMsg,
  ): QueryPacketAcknowledgementRequest {
    return QueryPacketAcknowledgementRequest.decode(message.value);
  },
  toProto(message: QueryPacketAcknowledgementRequest): Uint8Array {
    return QueryPacketAcknowledgementRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketAcknowledgementRequest,
  ): QueryPacketAcknowledgementRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementRequest',
      value: QueryPacketAcknowledgementRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketAcknowledgementResponse(): QueryPacketAcknowledgementResponse {
  return {
    acknowledgement: new Uint8Array(),
    proof: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
  };
}
/**
 * QueryPacketAcknowledgementResponse is the response type for the Query/PacketAcknowledgement RPC method.
 * @name QueryPacketAcknowledgementResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementResponse
 */
export const QueryPacketAcknowledgementResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementResponse' as const,
  aminoType: 'cosmos-sdk/QueryPacketAcknowledgementResponse' as const,
  is(o: any): o is QueryPacketAcknowledgementResponse {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementResponse.typeUrl ||
        ((o.acknowledgement instanceof Uint8Array ||
          typeof o.acknowledgement === 'string') &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.is(o.proofHeight)))
    );
  },
  isSDK(o: any): o is QueryPacketAcknowledgementResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementResponse.typeUrl ||
        ((o.acknowledgement instanceof Uint8Array ||
          typeof o.acknowledgement === 'string') &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.isSDK(o.proof_height)))
    );
  },
  encode(
    message: QueryPacketAcknowledgementResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.acknowledgement.length !== 0) {
      writer.uint32(10).bytes(message.acknowledgement);
    }
    if (message.proof.length !== 0) {
      writer.uint32(18).bytes(message.proof);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketAcknowledgementResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketAcknowledgementResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.acknowledgement = reader.bytes();
          break;
        case 2:
          message.proof = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketAcknowledgementResponse {
    return {
      acknowledgement: isSet(object.acknowledgement)
        ? bytesFromBase64(object.acknowledgement)
        : new Uint8Array(),
      proof: isSet(object.proof)
        ? bytesFromBase64(object.proof)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
    };
  },
  toJSON(
    message: QueryPacketAcknowledgementResponse,
  ): JsonSafe<QueryPacketAcknowledgementResponse> {
    const obj: any = {};
    message.acknowledgement !== undefined &&
      (obj.acknowledgement = base64FromBytes(
        message.acknowledgement !== undefined
          ? message.acknowledgement
          : new Uint8Array(),
      ));
    message.proof !== undefined &&
      (obj.proof = base64FromBytes(
        message.proof !== undefined ? message.proof : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketAcknowledgementResponse>,
  ): QueryPacketAcknowledgementResponse {
    const message = createBaseQueryPacketAcknowledgementResponse();
    message.acknowledgement = object.acknowledgement ?? new Uint8Array();
    message.proof = object.proof ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketAcknowledgementResponseProtoMsg,
  ): QueryPacketAcknowledgementResponse {
    return QueryPacketAcknowledgementResponse.decode(message.value);
  },
  toProto(message: QueryPacketAcknowledgementResponse): Uint8Array {
    return QueryPacketAcknowledgementResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketAcknowledgementResponse,
  ): QueryPacketAcknowledgementResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementResponse',
      value: QueryPacketAcknowledgementResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketAcknowledgementsRequest(): QueryPacketAcknowledgementsRequest {
  return {
    clientId: '',
    pagination: undefined,
    packetCommitmentSequences: [],
  };
}
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsRequest
 */
export const QueryPacketAcknowledgementsRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsRequest' as const,
  aminoType: 'cosmos-sdk/QueryPacketAcknowledgementsRequest' as const,
  is(o: any): o is QueryPacketAcknowledgementsRequest {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementsRequest.typeUrl ||
        (typeof o.clientId === 'string' &&
          Array.isArray(o.packetCommitmentSequences) &&
          (!o.packetCommitmentSequences.length ||
            typeof o.packetCommitmentSequences[0] === 'bigint')))
    );
  },
  isSDK(o: any): o is QueryPacketAcknowledgementsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementsRequest.typeUrl ||
        (typeof o.client_id === 'string' &&
          Array.isArray(o.packet_commitment_sequences) &&
          (!o.packet_commitment_sequences.length ||
            typeof o.packet_commitment_sequences[0] === 'bigint')))
    );
  },
  encode(
    message: QueryPacketAcknowledgementsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    writer.uint32(26).fork();
    for (const v of message.packetCommitmentSequences) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketAcknowledgementsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketAcknowledgementsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        case 3:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.packetCommitmentSequences.push(reader.uint64());
            }
          } else {
            message.packetCommitmentSequences.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketAcknowledgementsRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
      packetCommitmentSequences: Array.isArray(
        object?.packetCommitmentSequences,
      )
        ? object.packetCommitmentSequences.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: QueryPacketAcknowledgementsRequest,
  ): JsonSafe<QueryPacketAcknowledgementsRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    if (message.packetCommitmentSequences) {
      obj.packetCommitmentSequences = message.packetCommitmentSequences.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.packetCommitmentSequences = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketAcknowledgementsRequest>,
  ): QueryPacketAcknowledgementsRequest {
    const message = createBaseQueryPacketAcknowledgementsRequest();
    message.clientId = object.clientId ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    message.packetCommitmentSequences =
      object.packetCommitmentSequences?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryPacketAcknowledgementsRequestProtoMsg,
  ): QueryPacketAcknowledgementsRequest {
    return QueryPacketAcknowledgementsRequest.decode(message.value);
  },
  toProto(message: QueryPacketAcknowledgementsRequest): Uint8Array {
    return QueryPacketAcknowledgementsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketAcknowledgementsRequest,
  ): QueryPacketAcknowledgementsRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsRequest',
      value: QueryPacketAcknowledgementsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketAcknowledgementsResponse(): QueryPacketAcknowledgementsResponse {
  return {
    acknowledgements: [],
    pagination: undefined,
    height: Height.fromPartial({}),
  };
}
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketAcknowledgementsResponse
 */
export const QueryPacketAcknowledgementsResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsResponse' as const,
  aminoType: 'cosmos-sdk/QueryPacketAcknowledgementsResponse' as const,
  is(o: any): o is QueryPacketAcknowledgementsResponse {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementsResponse.typeUrl ||
        (Array.isArray(o.acknowledgements) &&
          (!o.acknowledgements.length ||
            PacketState.is(o.acknowledgements[0])) &&
          Height.is(o.height)))
    );
  },
  isSDK(o: any): o is QueryPacketAcknowledgementsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketAcknowledgementsResponse.typeUrl ||
        (Array.isArray(o.acknowledgements) &&
          (!o.acknowledgements.length ||
            PacketState.isSDK(o.acknowledgements[0])) &&
          Height.isSDK(o.height)))
    );
  },
  encode(
    message: QueryPacketAcknowledgementsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.acknowledgements) {
      PacketState.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.height !== undefined) {
      Height.encode(message.height, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketAcknowledgementsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketAcknowledgementsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.acknowledgements.push(
            PacketState.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        case 3:
          message.height = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketAcknowledgementsResponse {
    return {
      acknowledgements: Array.isArray(object?.acknowledgements)
        ? object.acknowledgements.map((e: any) => PacketState.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
      height: isSet(object.height) ? Height.fromJSON(object.height) : undefined,
    };
  },
  toJSON(
    message: QueryPacketAcknowledgementsResponse,
  ): JsonSafe<QueryPacketAcknowledgementsResponse> {
    const obj: any = {};
    if (message.acknowledgements) {
      obj.acknowledgements = message.acknowledgements.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.acknowledgements = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    message.height !== undefined &&
      (obj.height = message.height ? Height.toJSON(message.height) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketAcknowledgementsResponse>,
  ): QueryPacketAcknowledgementsResponse {
    const message = createBaseQueryPacketAcknowledgementsResponse();
    message.acknowledgements =
      object.acknowledgements?.map(e => PacketState.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    message.height =
      object.height !== undefined && object.height !== null
        ? Height.fromPartial(object.height)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketAcknowledgementsResponseProtoMsg,
  ): QueryPacketAcknowledgementsResponse {
    return QueryPacketAcknowledgementsResponse.decode(message.value);
  },
  toProto(message: QueryPacketAcknowledgementsResponse): Uint8Array {
    return QueryPacketAcknowledgementsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketAcknowledgementsResponse,
  ): QueryPacketAcknowledgementsResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketAcknowledgementsResponse',
      value: QueryPacketAcknowledgementsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketReceiptRequest(): QueryPacketReceiptRequest {
  return {
    clientId: '',
    sequence: BigInt(0),
  };
}
/**
 * QueryPacketReceiptRequest is the request type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptRequest
 */
export const QueryPacketReceiptRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptRequest' as const,
  aminoType: 'cosmos-sdk/QueryPacketReceiptRequest' as const,
  is(o: any): o is QueryPacketReceiptRequest {
    return (
      o &&
      (o.$typeUrl === QueryPacketReceiptRequest.typeUrl ||
        (typeof o.clientId === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  isSDK(o: any): o is QueryPacketReceiptRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketReceiptRequest.typeUrl ||
        (typeof o.client_id === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  encode(
    message: QueryPacketReceiptRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.sequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.sequence);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketReceiptRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketReceiptRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.sequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketReceiptRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryPacketReceiptRequest,
  ): JsonSafe<QueryPacketReceiptRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketReceiptRequest>,
  ): QueryPacketReceiptRequest {
    const message = createBaseQueryPacketReceiptRequest();
    message.clientId = object.clientId ?? '';
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryPacketReceiptRequestProtoMsg,
  ): QueryPacketReceiptRequest {
    return QueryPacketReceiptRequest.decode(message.value);
  },
  toProto(message: QueryPacketReceiptRequest): Uint8Array {
    return QueryPacketReceiptRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketReceiptRequest,
  ): QueryPacketReceiptRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptRequest',
      value: QueryPacketReceiptRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryPacketReceiptResponse(): QueryPacketReceiptResponse {
  return {
    received: false,
    proof: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
  };
}
/**
 * QueryPacketReceiptResponse is the response type for the Query/PacketReceipt RPC method.
 * @name QueryPacketReceiptResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryPacketReceiptResponse
 */
export const QueryPacketReceiptResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptResponse' as const,
  aminoType: 'cosmos-sdk/QueryPacketReceiptResponse' as const,
  is(o: any): o is QueryPacketReceiptResponse {
    return (
      o &&
      (o.$typeUrl === QueryPacketReceiptResponse.typeUrl ||
        (typeof o.received === 'boolean' &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.is(o.proofHeight)))
    );
  },
  isSDK(o: any): o is QueryPacketReceiptResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryPacketReceiptResponse.typeUrl ||
        (typeof o.received === 'boolean' &&
          (o.proof instanceof Uint8Array || typeof o.proof === 'string') &&
          Height.isSDK(o.proof_height)))
    );
  },
  encode(
    message: QueryPacketReceiptResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.received === true) {
      writer.uint32(16).bool(message.received);
    }
    if (message.proof.length !== 0) {
      writer.uint32(26).bytes(message.proof);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryPacketReceiptResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryPacketReceiptResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.received = reader.bool();
          break;
        case 3:
          message.proof = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryPacketReceiptResponse {
    return {
      received: isSet(object.received) ? Boolean(object.received) : false,
      proof: isSet(object.proof)
        ? bytesFromBase64(object.proof)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
    };
  },
  toJSON(
    message: QueryPacketReceiptResponse,
  ): JsonSafe<QueryPacketReceiptResponse> {
    const obj: any = {};
    message.received !== undefined && (obj.received = message.received);
    message.proof !== undefined &&
      (obj.proof = base64FromBytes(
        message.proof !== undefined ? message.proof : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryPacketReceiptResponse>,
  ): QueryPacketReceiptResponse {
    const message = createBaseQueryPacketReceiptResponse();
    message.received = object.received ?? false;
    message.proof = object.proof ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryPacketReceiptResponseProtoMsg,
  ): QueryPacketReceiptResponse {
    return QueryPacketReceiptResponse.decode(message.value);
  },
  toProto(message: QueryPacketReceiptResponse): Uint8Array {
    return QueryPacketReceiptResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryPacketReceiptResponse,
  ): QueryPacketReceiptResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryPacketReceiptResponse',
      value: QueryPacketReceiptResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryUnreceivedPacketsRequest(): QueryUnreceivedPacketsRequest {
  return {
    clientId: '',
    sequences: [],
  };
}
/**
 * QueryUnreceivedPacketsRequest is the request type for the Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsRequest
 */
export const QueryUnreceivedPacketsRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsRequest' as const,
  aminoType: 'cosmos-sdk/QueryUnreceivedPacketsRequest' as const,
  is(o: any): o is QueryUnreceivedPacketsRequest {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedPacketsRequest.typeUrl ||
        (typeof o.clientId === 'string' &&
          Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint')))
    );
  },
  isSDK(o: any): o is QueryUnreceivedPacketsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedPacketsRequest.typeUrl ||
        (typeof o.client_id === 'string' &&
          Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint')))
    );
  },
  encode(
    message: QueryUnreceivedPacketsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    writer.uint32(18).fork();
    for (const v of message.sequences) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnreceivedPacketsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnreceivedPacketsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.sequences.push(reader.uint64());
            }
          } else {
            message.sequences.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUnreceivedPacketsRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequences: Array.isArray(object?.sequences)
        ? object.sequences.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: QueryUnreceivedPacketsRequest,
  ): JsonSafe<QueryUnreceivedPacketsRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    if (message.sequences) {
      obj.sequences = message.sequences.map(e => (e || BigInt(0)).toString());
    } else {
      obj.sequences = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryUnreceivedPacketsRequest>,
  ): QueryUnreceivedPacketsRequest {
    const message = createBaseQueryUnreceivedPacketsRequest();
    message.clientId = object.clientId ?? '';
    message.sequences = object.sequences?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryUnreceivedPacketsRequestProtoMsg,
  ): QueryUnreceivedPacketsRequest {
    return QueryUnreceivedPacketsRequest.decode(message.value);
  },
  toProto(message: QueryUnreceivedPacketsRequest): Uint8Array {
    return QueryUnreceivedPacketsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnreceivedPacketsRequest,
  ): QueryUnreceivedPacketsRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsRequest',
      value: QueryUnreceivedPacketsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryUnreceivedPacketsResponse(): QueryUnreceivedPacketsResponse {
  return {
    sequences: [],
    height: Height.fromPartial({}),
  };
}
/**
 * QueryUnreceivedPacketsResponse is the response type for the Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedPacketsResponse
 */
export const QueryUnreceivedPacketsResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsResponse' as const,
  aminoType: 'cosmos-sdk/QueryUnreceivedPacketsResponse' as const,
  is(o: any): o is QueryUnreceivedPacketsResponse {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedPacketsResponse.typeUrl ||
        (Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint') &&
          Height.is(o.height)))
    );
  },
  isSDK(o: any): o is QueryUnreceivedPacketsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedPacketsResponse.typeUrl ||
        (Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint') &&
          Height.isSDK(o.height)))
    );
  },
  encode(
    message: QueryUnreceivedPacketsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.sequences) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.height !== undefined) {
      Height.encode(message.height, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnreceivedPacketsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnreceivedPacketsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.sequences.push(reader.uint64());
            }
          } else {
            message.sequences.push(reader.uint64());
          }
          break;
        case 2:
          message.height = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUnreceivedPacketsResponse {
    return {
      sequences: Array.isArray(object?.sequences)
        ? object.sequences.map((e: any) => BigInt(e.toString()))
        : [],
      height: isSet(object.height) ? Height.fromJSON(object.height) : undefined,
    };
  },
  toJSON(
    message: QueryUnreceivedPacketsResponse,
  ): JsonSafe<QueryUnreceivedPacketsResponse> {
    const obj: any = {};
    if (message.sequences) {
      obj.sequences = message.sequences.map(e => (e || BigInt(0)).toString());
    } else {
      obj.sequences = [];
    }
    message.height !== undefined &&
      (obj.height = message.height ? Height.toJSON(message.height) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryUnreceivedPacketsResponse>,
  ): QueryUnreceivedPacketsResponse {
    const message = createBaseQueryUnreceivedPacketsResponse();
    message.sequences = object.sequences?.map(e => BigInt(e.toString())) || [];
    message.height =
      object.height !== undefined && object.height !== null
        ? Height.fromPartial(object.height)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryUnreceivedPacketsResponseProtoMsg,
  ): QueryUnreceivedPacketsResponse {
    return QueryUnreceivedPacketsResponse.decode(message.value);
  },
  toProto(message: QueryUnreceivedPacketsResponse): Uint8Array {
    return QueryUnreceivedPacketsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnreceivedPacketsResponse,
  ): QueryUnreceivedPacketsResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryUnreceivedPacketsResponse',
      value: QueryUnreceivedPacketsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryUnreceivedAcksRequest(): QueryUnreceivedAcksRequest {
  return {
    clientId: '',
    packetAckSequences: [],
  };
}
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequest
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksRequest
 */
export const QueryUnreceivedAcksRequest = {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksRequest' as const,
  aminoType: 'cosmos-sdk/QueryUnreceivedAcksRequest' as const,
  is(o: any): o is QueryUnreceivedAcksRequest {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedAcksRequest.typeUrl ||
        (typeof o.clientId === 'string' &&
          Array.isArray(o.packetAckSequences) &&
          (!o.packetAckSequences.length ||
            typeof o.packetAckSequences[0] === 'bigint')))
    );
  },
  isSDK(o: any): o is QueryUnreceivedAcksRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedAcksRequest.typeUrl ||
        (typeof o.client_id === 'string' &&
          Array.isArray(o.packet_ack_sequences) &&
          (!o.packet_ack_sequences.length ||
            typeof o.packet_ack_sequences[0] === 'bigint')))
    );
  },
  encode(
    message: QueryUnreceivedAcksRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    writer.uint32(18).fork();
    for (const v of message.packetAckSequences) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnreceivedAcksRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnreceivedAcksRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.packetAckSequences.push(reader.uint64());
            }
          } else {
            message.packetAckSequences.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUnreceivedAcksRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      packetAckSequences: Array.isArray(object?.packetAckSequences)
        ? object.packetAckSequences.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: QueryUnreceivedAcksRequest,
  ): JsonSafe<QueryUnreceivedAcksRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    if (message.packetAckSequences) {
      obj.packetAckSequences = message.packetAckSequences.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.packetAckSequences = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryUnreceivedAcksRequest>,
  ): QueryUnreceivedAcksRequest {
    const message = createBaseQueryUnreceivedAcksRequest();
    message.clientId = object.clientId ?? '';
    message.packetAckSequences =
      object.packetAckSequences?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryUnreceivedAcksRequestProtoMsg,
  ): QueryUnreceivedAcksRequest {
    return QueryUnreceivedAcksRequest.decode(message.value);
  },
  toProto(message: QueryUnreceivedAcksRequest): Uint8Array {
    return QueryUnreceivedAcksRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnreceivedAcksRequest,
  ): QueryUnreceivedAcksRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksRequest',
      value: QueryUnreceivedAcksRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryUnreceivedAcksResponse(): QueryUnreceivedAcksResponse {
  return {
    sequences: [],
    height: Height.fromPartial({}),
  };
}
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.QueryUnreceivedAcksResponse
 */
export const QueryUnreceivedAcksResponse = {
  typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksResponse' as const,
  aminoType: 'cosmos-sdk/QueryUnreceivedAcksResponse' as const,
  is(o: any): o is QueryUnreceivedAcksResponse {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedAcksResponse.typeUrl ||
        (Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint') &&
          Height.is(o.height)))
    );
  },
  isSDK(o: any): o is QueryUnreceivedAcksResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryUnreceivedAcksResponse.typeUrl ||
        (Array.isArray(o.sequences) &&
          (!o.sequences.length || typeof o.sequences[0] === 'bigint') &&
          Height.isSDK(o.height)))
    );
  },
  encode(
    message: QueryUnreceivedAcksResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.sequences) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.height !== undefined) {
      Height.encode(message.height, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnreceivedAcksResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnreceivedAcksResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.sequences.push(reader.uint64());
            }
          } else {
            message.sequences.push(reader.uint64());
          }
          break;
        case 2:
          message.height = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUnreceivedAcksResponse {
    return {
      sequences: Array.isArray(object?.sequences)
        ? object.sequences.map((e: any) => BigInt(e.toString()))
        : [],
      height: isSet(object.height) ? Height.fromJSON(object.height) : undefined,
    };
  },
  toJSON(
    message: QueryUnreceivedAcksResponse,
  ): JsonSafe<QueryUnreceivedAcksResponse> {
    const obj: any = {};
    if (message.sequences) {
      obj.sequences = message.sequences.map(e => (e || BigInt(0)).toString());
    } else {
      obj.sequences = [];
    }
    message.height !== undefined &&
      (obj.height = message.height ? Height.toJSON(message.height) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryUnreceivedAcksResponse>,
  ): QueryUnreceivedAcksResponse {
    const message = createBaseQueryUnreceivedAcksResponse();
    message.sequences = object.sequences?.map(e => BigInt(e.toString())) || [];
    message.height =
      object.height !== undefined && object.height !== null
        ? Height.fromPartial(object.height)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryUnreceivedAcksResponseProtoMsg,
  ): QueryUnreceivedAcksResponse {
    return QueryUnreceivedAcksResponse.decode(message.value);
  },
  toProto(message: QueryUnreceivedAcksResponse): Uint8Array {
    return QueryUnreceivedAcksResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnreceivedAcksResponse,
  ): QueryUnreceivedAcksResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.QueryUnreceivedAcksResponse',
      value: QueryUnreceivedAcksResponse.encode(message).finish(),
    };
  },
};
