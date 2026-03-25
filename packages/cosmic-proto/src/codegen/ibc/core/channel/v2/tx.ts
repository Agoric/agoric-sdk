//@ts-nocheck
import {
  Payload,
  type PayloadSDKType,
  Packet,
  type PacketSDKType,
  Acknowledgement,
  type AcknowledgementSDKType,
} from './packet.js';
import { Height, type HeightSDKType } from '../../client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** ResponseResultType defines the possible outcomes of the execution of a message */
export enum ResponseResultType {
  /** RESPONSE_RESULT_TYPE_UNSPECIFIED - Default zero value enumeration */
  RESPONSE_RESULT_TYPE_UNSPECIFIED = 0,
  /** RESPONSE_RESULT_TYPE_NOOP - The message did not call the IBC application callbacks (because, for example, the packet had already been relayed) */
  RESPONSE_RESULT_TYPE_NOOP = 1,
  /** RESPONSE_RESULT_TYPE_SUCCESS - The message was executed successfully */
  RESPONSE_RESULT_TYPE_SUCCESS = 2,
  /** RESPONSE_RESULT_TYPE_FAILURE - The message was executed unsuccessfully */
  RESPONSE_RESULT_TYPE_FAILURE = 3,
  UNRECOGNIZED = -1,
}
export const ResponseResultTypeSDKType = ResponseResultType;
export function responseResultTypeFromJSON(object: any): ResponseResultType {
  switch (object) {
    case 0:
    case 'RESPONSE_RESULT_TYPE_UNSPECIFIED':
      return ResponseResultType.RESPONSE_RESULT_TYPE_UNSPECIFIED;
    case 1:
    case 'RESPONSE_RESULT_TYPE_NOOP':
      return ResponseResultType.RESPONSE_RESULT_TYPE_NOOP;
    case 2:
    case 'RESPONSE_RESULT_TYPE_SUCCESS':
      return ResponseResultType.RESPONSE_RESULT_TYPE_SUCCESS;
    case 3:
    case 'RESPONSE_RESULT_TYPE_FAILURE':
      return ResponseResultType.RESPONSE_RESULT_TYPE_FAILURE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseResultType.UNRECOGNIZED;
  }
}
export function responseResultTypeToJSON(object: ResponseResultType): string {
  switch (object) {
    case ResponseResultType.RESPONSE_RESULT_TYPE_UNSPECIFIED:
      return 'RESPONSE_RESULT_TYPE_UNSPECIFIED';
    case ResponseResultType.RESPONSE_RESULT_TYPE_NOOP:
      return 'RESPONSE_RESULT_TYPE_NOOP';
    case ResponseResultType.RESPONSE_RESULT_TYPE_SUCCESS:
      return 'RESPONSE_RESULT_TYPE_SUCCESS';
    case ResponseResultType.RESPONSE_RESULT_TYPE_FAILURE:
      return 'RESPONSE_RESULT_TYPE_FAILURE';
    case ResponseResultType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * MsgSendPacket sends an outgoing IBC packet.
 * @name MsgSendPacket
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacket
 */
export interface MsgSendPacket {
  sourceClient: string;
  timeoutTimestamp: bigint;
  payloads: Payload[];
  signer: string;
}
export interface MsgSendPacketProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgSendPacket';
  value: Uint8Array;
}
/**
 * MsgSendPacket sends an outgoing IBC packet.
 * @name MsgSendPacketSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacket
 */
export interface MsgSendPacketSDKType {
  source_client: string;
  timeout_timestamp: bigint;
  payloads: PayloadSDKType[];
  signer: string;
}
/**
 * MsgSendPacketResponse defines the Msg/SendPacket response type.
 * @name MsgSendPacketResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacketResponse
 */
export interface MsgSendPacketResponse {
  sequence: bigint;
}
export interface MsgSendPacketResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgSendPacketResponse';
  value: Uint8Array;
}
/**
 * MsgSendPacketResponse defines the Msg/SendPacket response type.
 * @name MsgSendPacketResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacketResponse
 */
export interface MsgSendPacketResponseSDKType {
  sequence: bigint;
}
/**
 * MsgRecvPacket receives an incoming IBC packet.
 * @name MsgRecvPacket
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacket
 */
export interface MsgRecvPacket {
  packet: Packet;
  proofCommitment: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgRecvPacketProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgRecvPacket';
  value: Uint8Array;
}
/**
 * MsgRecvPacket receives an incoming IBC packet.
 * @name MsgRecvPacketSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacket
 */
export interface MsgRecvPacketSDKType {
  packet: PacketSDKType;
  proof_commitment: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacketResponse
 */
export interface MsgRecvPacketResponse {
  result: ResponseResultType;
}
export interface MsgRecvPacketResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgRecvPacketResponse';
  value: Uint8Array;
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacketResponse
 */
export interface MsgRecvPacketResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeout
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeout
 */
export interface MsgTimeout {
  packet: Packet;
  proofUnreceived: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgTimeoutProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgTimeout';
  value: Uint8Array;
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeoutSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeout
 */
export interface MsgTimeoutSDKType {
  packet: PacketSDKType;
  proof_unreceived: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeoutResponse
 */
export interface MsgTimeoutResponse {
  result: ResponseResultType;
}
export interface MsgTimeoutResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgTimeoutResponse';
  value: Uint8Array;
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeoutResponse
 */
export interface MsgTimeoutResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement.
 * @name MsgAcknowledgement
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgement
 */
export interface MsgAcknowledgement {
  packet: Packet;
  acknowledgement: Acknowledgement;
  proofAcked: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgAcknowledgementProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgAcknowledgement';
  value: Uint8Array;
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement.
 * @name MsgAcknowledgementSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgement
 */
export interface MsgAcknowledgementSDKType {
  packet: PacketSDKType;
  acknowledgement: AcknowledgementSDKType;
  proof_acked: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgementResponse
 */
export interface MsgAcknowledgementResponse {
  result: ResponseResultType;
}
export interface MsgAcknowledgementResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v2.MsgAcknowledgementResponse';
  value: Uint8Array;
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponseSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgementResponse
 */
export interface MsgAcknowledgementResponseSDKType {
  result: ResponseResultType;
}
function createBaseMsgSendPacket(): MsgSendPacket {
  return {
    sourceClient: '',
    timeoutTimestamp: BigInt(0),
    payloads: [],
    signer: '',
  };
}
/**
 * MsgSendPacket sends an outgoing IBC packet.
 * @name MsgSendPacket
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacket
 */
export const MsgSendPacket = {
  typeUrl: '/ibc.core.channel.v2.MsgSendPacket' as const,
  aminoType: 'cosmos-sdk/MsgSendPacket' as const,
  is(o: any): o is MsgSendPacket {
    return (
      o &&
      (o.$typeUrl === MsgSendPacket.typeUrl ||
        (typeof o.sourceClient === 'string' &&
          typeof o.timeoutTimestamp === 'bigint' &&
          Array.isArray(o.payloads) &&
          (!o.payloads.length || Payload.is(o.payloads[0])) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgSendPacketSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSendPacket.typeUrl ||
        (typeof o.source_client === 'string' &&
          typeof o.timeout_timestamp === 'bigint' &&
          Array.isArray(o.payloads) &&
          (!o.payloads.length || Payload.isSDK(o.payloads[0])) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgSendPacket,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sourceClient !== '') {
      writer.uint32(10).string(message.sourceClient);
    }
    if (message.timeoutTimestamp !== BigInt(0)) {
      writer.uint32(16).uint64(message.timeoutTimestamp);
    }
    for (const v of message.payloads) {
      Payload.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSendPacket {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendPacket();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sourceClient = reader.string();
          break;
        case 2:
          message.timeoutTimestamp = reader.uint64();
          break;
        case 3:
          message.payloads.push(Payload.decode(reader, reader.uint32()));
          break;
        case 4:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendPacket {
    return {
      sourceClient: isSet(object.sourceClient)
        ? String(object.sourceClient)
        : '',
      timeoutTimestamp: isSet(object.timeoutTimestamp)
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0),
      payloads: Array.isArray(object?.payloads)
        ? object.payloads.map((e: any) => Payload.fromJSON(e))
        : [],
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgSendPacket): JsonSafe<MsgSendPacket> {
    const obj: any = {};
    message.sourceClient !== undefined &&
      (obj.sourceClient = message.sourceClient);
    message.timeoutTimestamp !== undefined &&
      (obj.timeoutTimestamp = (
        message.timeoutTimestamp || BigInt(0)
      ).toString());
    if (message.payloads) {
      obj.payloads = message.payloads.map(e =>
        e ? Payload.toJSON(e) : undefined,
      );
    } else {
      obj.payloads = [];
    }
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgSendPacket>): MsgSendPacket {
    const message = createBaseMsgSendPacket();
    message.sourceClient = object.sourceClient ?? '';
    message.timeoutTimestamp =
      object.timeoutTimestamp !== undefined && object.timeoutTimestamp !== null
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0);
    message.payloads = object.payloads?.map(e => Payload.fromPartial(e)) || [];
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSendPacketProtoMsg): MsgSendPacket {
    return MsgSendPacket.decode(message.value);
  },
  toProto(message: MsgSendPacket): Uint8Array {
    return MsgSendPacket.encode(message).finish();
  },
  toProtoMsg(message: MsgSendPacket): MsgSendPacketProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgSendPacket',
      value: MsgSendPacket.encode(message).finish(),
    };
  },
};
function createBaseMsgSendPacketResponse(): MsgSendPacketResponse {
  return {
    sequence: BigInt(0),
  };
}
/**
 * MsgSendPacketResponse defines the Msg/SendPacket response type.
 * @name MsgSendPacketResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgSendPacketResponse
 */
export const MsgSendPacketResponse = {
  typeUrl: '/ibc.core.channel.v2.MsgSendPacketResponse' as const,
  aminoType: 'cosmos-sdk/MsgSendPacketResponse' as const,
  is(o: any): o is MsgSendPacketResponse {
    return (
      o &&
      (o.$typeUrl === MsgSendPacketResponse.typeUrl ||
        typeof o.sequence === 'bigint')
    );
  },
  isSDK(o: any): o is MsgSendPacketResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSendPacketResponse.typeUrl ||
        typeof o.sequence === 'bigint')
    );
  },
  encode(
    message: MsgSendPacketResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sequence !== BigInt(0)) {
      writer.uint32(8).uint64(message.sequence);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSendPacketResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendPacketResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendPacketResponse {
    return {
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgSendPacketResponse): JsonSafe<MsgSendPacketResponse> {
    const obj: any = {};
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgSendPacketResponse>): MsgSendPacketResponse {
    const message = createBaseMsgSendPacketResponse();
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MsgSendPacketResponseProtoMsg): MsgSendPacketResponse {
    return MsgSendPacketResponse.decode(message.value);
  },
  toProto(message: MsgSendPacketResponse): Uint8Array {
    return MsgSendPacketResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSendPacketResponse): MsgSendPacketResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgSendPacketResponse',
      value: MsgSendPacketResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRecvPacket(): MsgRecvPacket {
  return {
    packet: Packet.fromPartial({}),
    proofCommitment: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgRecvPacket receives an incoming IBC packet.
 * @name MsgRecvPacket
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacket
 */
export const MsgRecvPacket = {
  typeUrl: '/ibc.core.channel.v2.MsgRecvPacket' as const,
  aminoType: 'cosmos-sdk/MsgRecvPacket' as const,
  is(o: any): o is MsgRecvPacket {
    return (
      o &&
      (o.$typeUrl === MsgRecvPacket.typeUrl ||
        (Packet.is(o.packet) &&
          (o.proofCommitment instanceof Uint8Array ||
            typeof o.proofCommitment === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgRecvPacketSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRecvPacket.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.proof_commitment instanceof Uint8Array ||
            typeof o.proof_commitment === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgRecvPacket,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.proofCommitment.length !== 0) {
      writer.uint32(18).bytes(message.proofCommitment);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRecvPacket {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRecvPacket();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.proofCommitment = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 4:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRecvPacket {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      proofCommitment: isSet(object.proofCommitment)
        ? bytesFromBase64(object.proofCommitment)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgRecvPacket): JsonSafe<MsgRecvPacket> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.proofCommitment !== undefined &&
      (obj.proofCommitment = base64FromBytes(
        message.proofCommitment !== undefined
          ? message.proofCommitment
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgRecvPacket>): MsgRecvPacket {
    const message = createBaseMsgRecvPacket();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.proofCommitment = object.proofCommitment ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRecvPacketProtoMsg): MsgRecvPacket {
    return MsgRecvPacket.decode(message.value);
  },
  toProto(message: MsgRecvPacket): Uint8Array {
    return MsgRecvPacket.encode(message).finish();
  },
  toProtoMsg(message: MsgRecvPacket): MsgRecvPacketProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgRecvPacket',
      value: MsgRecvPacket.encode(message).finish(),
    };
  },
};
function createBaseMsgRecvPacketResponse(): MsgRecvPacketResponse {
  return {
    result: 0,
  };
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgRecvPacketResponse
 */
export const MsgRecvPacketResponse = {
  typeUrl: '/ibc.core.channel.v2.MsgRecvPacketResponse' as const,
  aminoType: 'cosmos-sdk/MsgRecvPacketResponse' as const,
  is(o: any): o is MsgRecvPacketResponse {
    return (
      o && (o.$typeUrl === MsgRecvPacketResponse.typeUrl || isSet(o.result))
    );
  },
  isSDK(o: any): o is MsgRecvPacketResponseSDKType {
    return (
      o && (o.$typeUrl === MsgRecvPacketResponse.typeUrl || isSet(o.result))
    );
  },
  encode(
    message: MsgRecvPacketResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRecvPacketResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRecvPacketResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRecvPacketResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: MsgRecvPacketResponse): JsonSafe<MsgRecvPacketResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<MsgRecvPacketResponse>): MsgRecvPacketResponse {
    const message = createBaseMsgRecvPacketResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgRecvPacketResponseProtoMsg): MsgRecvPacketResponse {
    return MsgRecvPacketResponse.decode(message.value);
  },
  toProto(message: MsgRecvPacketResponse): Uint8Array {
    return MsgRecvPacketResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgRecvPacketResponse): MsgRecvPacketResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgRecvPacketResponse',
      value: MsgRecvPacketResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeout(): MsgTimeout {
  return {
    packet: Packet.fromPartial({}),
    proofUnreceived: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeout
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeout
 */
export const MsgTimeout = {
  typeUrl: '/ibc.core.channel.v2.MsgTimeout' as const,
  aminoType: 'cosmos-sdk/MsgTimeout' as const,
  is(o: any): o is MsgTimeout {
    return (
      o &&
      (o.$typeUrl === MsgTimeout.typeUrl ||
        (Packet.is(o.packet) &&
          (o.proofUnreceived instanceof Uint8Array ||
            typeof o.proofUnreceived === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgTimeoutSDKType {
    return (
      o &&
      (o.$typeUrl === MsgTimeout.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.proof_unreceived instanceof Uint8Array ||
            typeof o.proof_unreceived === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgTimeout,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.proofUnreceived.length !== 0) {
      writer.uint32(18).bytes(message.proofUnreceived);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeout {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeout();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.proofUnreceived = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 5:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTimeout {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      proofUnreceived: isSet(object.proofUnreceived)
        ? bytesFromBase64(object.proofUnreceived)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgTimeout): JsonSafe<MsgTimeout> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.proofUnreceived !== undefined &&
      (obj.proofUnreceived = base64FromBytes(
        message.proofUnreceived !== undefined
          ? message.proofUnreceived
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgTimeout>): MsgTimeout {
    const message = createBaseMsgTimeout();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.proofUnreceived = object.proofUnreceived ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgTimeoutProtoMsg): MsgTimeout {
    return MsgTimeout.decode(message.value);
  },
  toProto(message: MsgTimeout): Uint8Array {
    return MsgTimeout.encode(message).finish();
  },
  toProtoMsg(message: MsgTimeout): MsgTimeoutProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgTimeout',
      value: MsgTimeout.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeoutResponse(): MsgTimeoutResponse {
  return {
    result: 0,
  };
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgTimeoutResponse
 */
export const MsgTimeoutResponse = {
  typeUrl: '/ibc.core.channel.v2.MsgTimeoutResponse' as const,
  aminoType: 'cosmos-sdk/MsgTimeoutResponse' as const,
  is(o: any): o is MsgTimeoutResponse {
    return o && (o.$typeUrl === MsgTimeoutResponse.typeUrl || isSet(o.result));
  },
  isSDK(o: any): o is MsgTimeoutResponseSDKType {
    return o && (o.$typeUrl === MsgTimeoutResponse.typeUrl || isSet(o.result));
  },
  encode(
    message: MsgTimeoutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgTimeoutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeoutResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTimeoutResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: MsgTimeoutResponse): JsonSafe<MsgTimeoutResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<MsgTimeoutResponse>): MsgTimeoutResponse {
    const message = createBaseMsgTimeoutResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgTimeoutResponseProtoMsg): MsgTimeoutResponse {
    return MsgTimeoutResponse.decode(message.value);
  },
  toProto(message: MsgTimeoutResponse): Uint8Array {
    return MsgTimeoutResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgTimeoutResponse): MsgTimeoutResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgTimeoutResponse',
      value: MsgTimeoutResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgAcknowledgement(): MsgAcknowledgement {
  return {
    packet: Packet.fromPartial({}),
    acknowledgement: Acknowledgement.fromPartial({}),
    proofAcked: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement.
 * @name MsgAcknowledgement
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgement
 */
export const MsgAcknowledgement = {
  typeUrl: '/ibc.core.channel.v2.MsgAcknowledgement' as const,
  aminoType: 'cosmos-sdk/MsgAcknowledgement' as const,
  is(o: any): o is MsgAcknowledgement {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgement.typeUrl ||
        (Packet.is(o.packet) &&
          Acknowledgement.is(o.acknowledgement) &&
          (o.proofAcked instanceof Uint8Array ||
            typeof o.proofAcked === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgAcknowledgementSDKType {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgement.typeUrl ||
        (Packet.isSDK(o.packet) &&
          Acknowledgement.isSDK(o.acknowledgement) &&
          (o.proof_acked instanceof Uint8Array ||
            typeof o.proof_acked === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgAcknowledgement,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.acknowledgement !== undefined) {
      Acknowledgement.encode(
        message.acknowledgement,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.proofAcked.length !== 0) {
      writer.uint32(26).bytes(message.proofAcked);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAcknowledgement {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcknowledgement();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.acknowledgement = Acknowledgement.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 3:
          message.proofAcked = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 5:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAcknowledgement {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      acknowledgement: isSet(object.acknowledgement)
        ? Acknowledgement.fromJSON(object.acknowledgement)
        : undefined,
      proofAcked: isSet(object.proofAcked)
        ? bytesFromBase64(object.proofAcked)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgAcknowledgement): JsonSafe<MsgAcknowledgement> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.acknowledgement !== undefined &&
      (obj.acknowledgement = message.acknowledgement
        ? Acknowledgement.toJSON(message.acknowledgement)
        : undefined);
    message.proofAcked !== undefined &&
      (obj.proofAcked = base64FromBytes(
        message.proofAcked !== undefined
          ? message.proofAcked
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgAcknowledgement>): MsgAcknowledgement {
    const message = createBaseMsgAcknowledgement();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.acknowledgement =
      object.acknowledgement !== undefined && object.acknowledgement !== null
        ? Acknowledgement.fromPartial(object.acknowledgement)
        : undefined;
    message.proofAcked = object.proofAcked ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgAcknowledgementProtoMsg): MsgAcknowledgement {
    return MsgAcknowledgement.decode(message.value);
  },
  toProto(message: MsgAcknowledgement): Uint8Array {
    return MsgAcknowledgement.encode(message).finish();
  },
  toProtoMsg(message: MsgAcknowledgement): MsgAcknowledgementProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgAcknowledgement',
      value: MsgAcknowledgement.encode(message).finish(),
    };
  },
};
function createBaseMsgAcknowledgementResponse(): MsgAcknowledgementResponse {
  return {
    result: 0,
  };
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponse
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.MsgAcknowledgementResponse
 */
export const MsgAcknowledgementResponse = {
  typeUrl: '/ibc.core.channel.v2.MsgAcknowledgementResponse' as const,
  aminoType: 'cosmos-sdk/MsgAcknowledgementResponse' as const,
  is(o: any): o is MsgAcknowledgementResponse {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgementResponse.typeUrl || isSet(o.result))
    );
  },
  isSDK(o: any): o is MsgAcknowledgementResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgementResponse.typeUrl || isSet(o.result))
    );
  },
  encode(
    message: MsgAcknowledgementResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAcknowledgementResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcknowledgementResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAcknowledgementResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgAcknowledgementResponse,
  ): JsonSafe<MsgAcknowledgementResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgAcknowledgementResponse>,
  ): MsgAcknowledgementResponse {
    const message = createBaseMsgAcknowledgementResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgAcknowledgementResponseProtoMsg,
  ): MsgAcknowledgementResponse {
    return MsgAcknowledgementResponse.decode(message.value);
  },
  toProto(message: MsgAcknowledgementResponse): Uint8Array {
    return MsgAcknowledgementResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAcknowledgementResponse,
  ): MsgAcknowledgementResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.MsgAcknowledgementResponse',
      value: MsgAcknowledgementResponse.encode(message).finish(),
    };
  },
};
