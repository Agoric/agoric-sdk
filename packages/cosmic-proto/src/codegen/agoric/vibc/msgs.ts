//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../json-safe.js';
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacket
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export interface MsgSendPacket {
  packet: Packet;
  sender: Uint8Array;
}
export interface MsgSendPacketProtoMsg {
  typeUrl: '/agoric.vibc.MsgSendPacket';
  value: Uint8Array;
}
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacketSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export interface MsgSendPacketSDKType {
  packet: PacketSDKType;
  sender: Uint8Array;
}
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponse
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export interface MsgSendPacketResponse {}
export interface MsgSendPacketResponseProtoMsg {
  typeUrl: '/agoric.vibc.MsgSendPacketResponse';
  value: Uint8Array;
}
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponseSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export interface MsgSendPacketResponseSDKType {}
/**
 * Packet defines a type that carries data across different chains through IBC.
 * The fields in the Packet correspond to the fields in the IBC packet
 * definition in ibc/core/channel/v1/channel.proto, but with amino and gogoproto
 * options to ensure compatibility with the Cosmos SDK's Protobuf code
 * generation and JSON encoding.  See ibc/core/channel/v1/channel.proto for more
 * details on the semantics of each field in the Packet.
 * @name Packet
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Packet
 */
export interface Packet {
  /**
   * number corresponds to the order of sends and receives, where a Packet
   * with an earlier sequence number must be sent and received before a Packet
   * with a later sequence number.
   */
  sequence: bigint;
  /**
   * identifies the port on the sending chain.
   */
  sourcePort: string;
  /**
   * identifies the channel end on the sending chain.
   */
  sourceChannel: string;
  /**
   * identifies the port on the receiving chain.
   */
  destinationPort: string;
  /**
   * identifies the channel end on the receiving chain.
   */
  destinationChannel: string;
  /**
   * actual opaque bytes transferred directly to the application module
   */
  data: Uint8Array;
  /**
   * block height after which the packet times out
   */
  timeoutHeight: Height;
  /**
   * block timestamp (in nanoseconds) after which the packet times out
   */
  timeoutTimestamp: bigint;
}
export interface PacketProtoMsg {
  typeUrl: '/agoric.vibc.Packet';
  value: Uint8Array;
}
/**
 * Packet defines a type that carries data across different chains through IBC.
 * The fields in the Packet correspond to the fields in the IBC packet
 * definition in ibc/core/channel/v1/channel.proto, but with amino and gogoproto
 * options to ensure compatibility with the Cosmos SDK's Protobuf code
 * generation and JSON encoding.  See ibc/core/channel/v1/channel.proto for more
 * details on the semantics of each field in the Packet.
 * @name PacketSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Packet
 */
export interface PacketSDKType {
  sequence: bigint;
  source_port: string;
  source_channel: string;
  destination_port: string;
  destination_channel: string;
  data: Uint8Array;
  timeout_height: HeightSDKType;
  timeout_timestamp: bigint;
}
/**
 * Height is a local type that enforces amino and gogoproto compatibility for
 * the Height type used in IBC.  See ibc/core/client/v1/client.proto for more
 * details on the Height type.
 * @name Height
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Height
 */
export interface Height {
  /**
   * the revision that the client is currently on
   */
  revisionNumber: bigint;
  /**
   * the height within the given revision
   */
  revisionHeight: bigint;
}
export interface HeightProtoMsg {
  typeUrl: '/agoric.vibc.Height';
  value: Uint8Array;
}
/**
 * Height is a local type that enforces amino and gogoproto compatibility for
 * the Height type used in IBC.  See ibc/core/client/v1/client.proto for more
 * details on the Height type.
 * @name HeightSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Height
 */
export interface HeightSDKType {
  revision_number: bigint;
  revision_height: bigint;
}
function createBaseMsgSendPacket(): MsgSendPacket {
  return {
    packet: Packet.fromPartial({}),
    sender: new Uint8Array(),
  };
}
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacket
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export const MsgSendPacket = {
  typeUrl: '/agoric.vibc.MsgSendPacket' as const,
  aminoType: 'vibc/SendPacket' as const,
  is(o: any): o is MsgSendPacket {
    return (
      o &&
      (o.$typeUrl === MsgSendPacket.typeUrl ||
        (Packet.is(o.packet) &&
          (o.sender instanceof Uint8Array || typeof o.sender === 'string')))
    );
  },
  isSDK(o: any): o is MsgSendPacketSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSendPacket.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.sender instanceof Uint8Array || typeof o.sender === 'string')))
    );
  },
  encode(
    message: MsgSendPacket,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.sender.length !== 0) {
      writer.uint32(18).bytes(message.sender);
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
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.sender = reader.bytes();
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
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      sender: isSet(object.sender)
        ? bytesFromBase64(object.sender)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgSendPacket): JsonSafe<MsgSendPacket> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.sender !== undefined &&
      (obj.sender = base64FromBytes(
        message.sender !== undefined ? message.sender : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgSendPacket>): MsgSendPacket {
    const message = createBaseMsgSendPacket();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.sender = object.sender ?? new Uint8Array();
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
      typeUrl: '/agoric.vibc.MsgSendPacket',
      value: MsgSendPacket.encode(message).finish(),
    };
  },
};
function createBaseMsgSendPacketResponse(): MsgSendPacketResponse {
  return {};
}
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponse
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export const MsgSendPacketResponse = {
  typeUrl: '/agoric.vibc.MsgSendPacketResponse' as const,
  is(o: any): o is MsgSendPacketResponse {
    return o && o.$typeUrl === MsgSendPacketResponse.typeUrl;
  },
  isSDK(o: any): o is MsgSendPacketResponseSDKType {
    return o && o.$typeUrl === MsgSendPacketResponse.typeUrl;
  },
  encode(
    _: MsgSendPacketResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
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
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgSendPacketResponse {
    return {};
  },
  toJSON(_: MsgSendPacketResponse): JsonSafe<MsgSendPacketResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgSendPacketResponse>): MsgSendPacketResponse {
    const message = createBaseMsgSendPacketResponse();
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
      typeUrl: '/agoric.vibc.MsgSendPacketResponse',
      value: MsgSendPacketResponse.encode(message).finish(),
    };
  },
};
function createBasePacket(): Packet {
  return {
    sequence: BigInt(0),
    sourcePort: '',
    sourceChannel: '',
    destinationPort: '',
    destinationChannel: '',
    data: new Uint8Array(),
    timeoutHeight: Height.fromPartial({}),
    timeoutTimestamp: BigInt(0),
  };
}
/**
 * Packet defines a type that carries data across different chains through IBC.
 * The fields in the Packet correspond to the fields in the IBC packet
 * definition in ibc/core/channel/v1/channel.proto, but with amino and gogoproto
 * options to ensure compatibility with the Cosmos SDK's Protobuf code
 * generation and JSON encoding.  See ibc/core/channel/v1/channel.proto for more
 * details on the semantics of each field in the Packet.
 * @name Packet
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Packet
 */
export const Packet = {
  typeUrl: '/agoric.vibc.Packet' as const,
  is(o: any): o is Packet {
    return (
      o &&
      (o.$typeUrl === Packet.typeUrl ||
        (typeof o.sequence === 'bigint' &&
          typeof o.sourcePort === 'string' &&
          typeof o.sourceChannel === 'string' &&
          typeof o.destinationPort === 'string' &&
          typeof o.destinationChannel === 'string' &&
          (o.data instanceof Uint8Array || typeof o.data === 'string') &&
          Height.is(o.timeoutHeight) &&
          typeof o.timeoutTimestamp === 'bigint'))
    );
  },
  isSDK(o: any): o is PacketSDKType {
    return (
      o &&
      (o.$typeUrl === Packet.typeUrl ||
        (typeof o.sequence === 'bigint' &&
          typeof o.source_port === 'string' &&
          typeof o.source_channel === 'string' &&
          typeof o.destination_port === 'string' &&
          typeof o.destination_channel === 'string' &&
          (o.data instanceof Uint8Array || typeof o.data === 'string') &&
          Height.isSDK(o.timeout_height) &&
          typeof o.timeout_timestamp === 'bigint'))
    );
  },
  encode(
    message: Packet,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sequence !== BigInt(0)) {
      writer.uint32(8).uint64(message.sequence);
    }
    if (message.sourcePort !== '') {
      writer.uint32(18).string(message.sourcePort);
    }
    if (message.sourceChannel !== '') {
      writer.uint32(26).string(message.sourceChannel);
    }
    if (message.destinationPort !== '') {
      writer.uint32(34).string(message.destinationPort);
    }
    if (message.destinationChannel !== '') {
      writer.uint32(42).string(message.destinationChannel);
    }
    if (message.data.length !== 0) {
      writer.uint32(50).bytes(message.data);
    }
    if (message.timeoutHeight !== undefined) {
      Height.encode(message.timeoutHeight, writer.uint32(58).fork()).ldelim();
    }
    if (message.timeoutTimestamp !== BigInt(0)) {
      writer.uint32(64).uint64(message.timeoutTimestamp);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Packet {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePacket();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sequence = reader.uint64();
          break;
        case 2:
          message.sourcePort = reader.string();
          break;
        case 3:
          message.sourceChannel = reader.string();
          break;
        case 4:
          message.destinationPort = reader.string();
          break;
        case 5:
          message.destinationChannel = reader.string();
          break;
        case 6:
          message.data = reader.bytes();
          break;
        case 7:
          message.timeoutHeight = Height.decode(reader, reader.uint32());
          break;
        case 8:
          message.timeoutTimestamp = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Packet {
    return {
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
      sourcePort: isSet(object.sourcePort) ? String(object.sourcePort) : '',
      sourceChannel: isSet(object.sourceChannel)
        ? String(object.sourceChannel)
        : '',
      destinationPort: isSet(object.destinationPort)
        ? String(object.destinationPort)
        : '',
      destinationChannel: isSet(object.destinationChannel)
        ? String(object.destinationChannel)
        : '',
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      timeoutHeight: isSet(object.timeoutHeight)
        ? Height.fromJSON(object.timeoutHeight)
        : undefined,
      timeoutTimestamp: isSet(object.timeoutTimestamp)
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Packet): JsonSafe<Packet> {
    const obj: any = {};
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    message.sourcePort !== undefined && (obj.sourcePort = message.sourcePort);
    message.sourceChannel !== undefined &&
      (obj.sourceChannel = message.sourceChannel);
    message.destinationPort !== undefined &&
      (obj.destinationPort = message.destinationPort);
    message.destinationChannel !== undefined &&
      (obj.destinationChannel = message.destinationChannel);
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.timeoutHeight !== undefined &&
      (obj.timeoutHeight = message.timeoutHeight
        ? Height.toJSON(message.timeoutHeight)
        : undefined);
    message.timeoutTimestamp !== undefined &&
      (obj.timeoutTimestamp = (
        message.timeoutTimestamp || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Packet>): Packet {
    const message = createBasePacket();
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    message.sourcePort = object.sourcePort ?? '';
    message.sourceChannel = object.sourceChannel ?? '';
    message.destinationPort = object.destinationPort ?? '';
    message.destinationChannel = object.destinationChannel ?? '';
    message.data = object.data ?? new Uint8Array();
    message.timeoutHeight =
      object.timeoutHeight !== undefined && object.timeoutHeight !== null
        ? Height.fromPartial(object.timeoutHeight)
        : undefined;
    message.timeoutTimestamp =
      object.timeoutTimestamp !== undefined && object.timeoutTimestamp !== null
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: PacketProtoMsg): Packet {
    return Packet.decode(message.value);
  },
  toProto(message: Packet): Uint8Array {
    return Packet.encode(message).finish();
  },
  toProtoMsg(message: Packet): PacketProtoMsg {
    return {
      typeUrl: '/agoric.vibc.Packet',
      value: Packet.encode(message).finish(),
    };
  },
};
function createBaseHeight(): Height {
  return {
    revisionNumber: BigInt(0),
    revisionHeight: BigInt(0),
  };
}
/**
 * Height is a local type that enforces amino and gogoproto compatibility for
 * the Height type used in IBC.  See ibc/core/client/v1/client.proto for more
 * details on the Height type.
 * @name Height
 * @package agoric.vibc
 * @see proto type: agoric.vibc.Height
 */
export const Height = {
  typeUrl: '/agoric.vibc.Height' as const,
  is(o: any): o is Height {
    return (
      o &&
      (o.$typeUrl === Height.typeUrl ||
        (typeof o.revisionNumber === 'bigint' &&
          typeof o.revisionHeight === 'bigint'))
    );
  },
  isSDK(o: any): o is HeightSDKType {
    return (
      o &&
      (o.$typeUrl === Height.typeUrl ||
        (typeof o.revision_number === 'bigint' &&
          typeof o.revision_height === 'bigint'))
    );
  },
  encode(
    message: Height,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.revisionNumber !== BigInt(0)) {
      writer.uint32(8).uint64(message.revisionNumber);
    }
    if (message.revisionHeight !== BigInt(0)) {
      writer.uint32(16).uint64(message.revisionHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Height {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHeight();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.revisionNumber = reader.uint64();
          break;
        case 2:
          message.revisionHeight = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Height {
    return {
      revisionNumber: isSet(object.revisionNumber)
        ? BigInt(object.revisionNumber.toString())
        : BigInt(0),
      revisionHeight: isSet(object.revisionHeight)
        ? BigInt(object.revisionHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Height): JsonSafe<Height> {
    const obj: any = {};
    message.revisionNumber !== undefined &&
      (obj.revisionNumber = (message.revisionNumber || BigInt(0)).toString());
    message.revisionHeight !== undefined &&
      (obj.revisionHeight = (message.revisionHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<Height>): Height {
    const message = createBaseHeight();
    message.revisionNumber =
      object.revisionNumber !== undefined && object.revisionNumber !== null
        ? BigInt(object.revisionNumber.toString())
        : BigInt(0);
    message.revisionHeight =
      object.revisionHeight !== undefined && object.revisionHeight !== null
        ? BigInt(object.revisionHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: HeightProtoMsg): Height {
    return Height.decode(message.value);
  },
  toProto(message: Height): Uint8Array {
    return Height.encode(message).finish();
  },
  toProtoMsg(message: Height): HeightProtoMsg {
    return {
      typeUrl: '/agoric.vibc.Height',
      value: Height.encode(message).finish(),
    };
  },
};
