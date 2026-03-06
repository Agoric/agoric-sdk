//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** PacketStatus specifies the status of a RecvPacketResult. */
export enum PacketStatus {
  /** PACKET_STATUS_UNSPECIFIED - PACKET_STATUS_UNSPECIFIED indicates an unknown packet status. */
  PACKET_STATUS_UNSPECIFIED = 0,
  /** PACKET_STATUS_SUCCESS - PACKET_STATUS_SUCCESS indicates a successful packet receipt. */
  PACKET_STATUS_SUCCESS = 1,
  /** PACKET_STATUS_FAILURE - PACKET_STATUS_FAILURE indicates a failed packet receipt. */
  PACKET_STATUS_FAILURE = 2,
  /** PACKET_STATUS_ASYNC - PACKET_STATUS_ASYNC indicates an async packet receipt. */
  PACKET_STATUS_ASYNC = 3,
  UNRECOGNIZED = -1,
}
export const PacketStatusSDKType = PacketStatus;
export function packetStatusFromJSON(object: any): PacketStatus {
  switch (object) {
    case 0:
    case 'PACKET_STATUS_UNSPECIFIED':
      return PacketStatus.PACKET_STATUS_UNSPECIFIED;
    case 1:
    case 'PACKET_STATUS_SUCCESS':
      return PacketStatus.PACKET_STATUS_SUCCESS;
    case 2:
    case 'PACKET_STATUS_FAILURE':
      return PacketStatus.PACKET_STATUS_FAILURE;
    case 3:
    case 'PACKET_STATUS_ASYNC':
      return PacketStatus.PACKET_STATUS_ASYNC;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return PacketStatus.UNRECOGNIZED;
  }
}
export function packetStatusToJSON(object: PacketStatus): string {
  switch (object) {
    case PacketStatus.PACKET_STATUS_UNSPECIFIED:
      return 'PACKET_STATUS_UNSPECIFIED';
    case PacketStatus.PACKET_STATUS_SUCCESS:
      return 'PACKET_STATUS_SUCCESS';
    case PacketStatus.PACKET_STATUS_FAILURE:
      return 'PACKET_STATUS_FAILURE';
    case PacketStatus.PACKET_STATUS_ASYNC:
      return 'PACKET_STATUS_ASYNC';
    case PacketStatus.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name Packet
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Packet
 */
export interface Packet {
  /**
   * number corresponds to the order of sends and receives, where a Packet
   * with an earlier sequence number must be sent and received before a Packet
   * with a later sequence number.
   */
  sequence: bigint;
  /**
   * identifies the sending client on the sending chain.
   */
  sourceClient: string;
  /**
   * identifies the receiving client on the receiving chain.
   */
  destinationClient: string;
  /**
   * timeout timestamp in seconds after which the packet times out.
   */
  timeoutTimestamp: bigint;
  /**
   * a list of payloads, each one for a specific application.
   */
  payloads: Payload[];
}
export interface PacketProtoMsg {
  typeUrl: '/ibc.core.channel.v2.Packet';
  value: Uint8Array;
}
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name PacketSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Packet
 */
export interface PacketSDKType {
  sequence: bigint;
  source_client: string;
  destination_client: string;
  timeout_timestamp: bigint;
  payloads: PayloadSDKType[];
}
/**
 * Payload contains the source and destination ports and payload for the application (version, encoding, raw bytes)
 * @name Payload
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Payload
 */
export interface Payload {
  /**
   * specifies the source port of the packet.
   */
  sourcePort: string;
  /**
   * specifies the destination port of the packet.
   */
  destinationPort: string;
  /**
   * version of the specified application.
   */
  version: string;
  /**
   * the encoding used for the provided value.
   */
  encoding: string;
  /**
   * the raw bytes for the payload.
   */
  value: Uint8Array;
}
export interface PayloadProtoMsg {
  typeUrl: '/ibc.core.channel.v2.Payload';
  value: Uint8Array;
}
/**
 * Payload contains the source and destination ports and payload for the application (version, encoding, raw bytes)
 * @name PayloadSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Payload
 */
export interface PayloadSDKType {
  source_port: string;
  destination_port: string;
  version: string;
  encoding: string;
  value: Uint8Array;
}
/**
 * Acknowledgement contains a list of all ack results associated with a single packet.
 * In the case of a successful receive, the acknowledgement will contain an app acknowledgement
 * for each application that received a payload in the same order that the payloads were sent
 * in the packet.
 * If the receive is not successful, the acknowledgement will contain a single app acknowledgment
 * which will be a constant error acknowledgment as defined by the IBC v2 protocol.
 * @name Acknowledgement
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Acknowledgement
 */
export interface Acknowledgement {
  appAcknowledgements: Uint8Array[];
}
export interface AcknowledgementProtoMsg {
  typeUrl: '/ibc.core.channel.v2.Acknowledgement';
  value: Uint8Array;
}
/**
 * Acknowledgement contains a list of all ack results associated with a single packet.
 * In the case of a successful receive, the acknowledgement will contain an app acknowledgement
 * for each application that received a payload in the same order that the payloads were sent
 * in the packet.
 * If the receive is not successful, the acknowledgement will contain a single app acknowledgment
 * which will be a constant error acknowledgment as defined by the IBC v2 protocol.
 * @name AcknowledgementSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Acknowledgement
 */
export interface AcknowledgementSDKType {
  app_acknowledgements: Uint8Array[];
}
/**
 * RecvPacketResult speecifies the status of a packet as well as the acknowledgement bytes.
 * @name RecvPacketResult
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.RecvPacketResult
 */
export interface RecvPacketResult {
  /**
   * status of the packet
   */
  status: PacketStatus;
  /**
   * acknowledgement of the packet
   */
  acknowledgement: Uint8Array;
}
export interface RecvPacketResultProtoMsg {
  typeUrl: '/ibc.core.channel.v2.RecvPacketResult';
  value: Uint8Array;
}
/**
 * RecvPacketResult speecifies the status of a packet as well as the acknowledgement bytes.
 * @name RecvPacketResultSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.RecvPacketResult
 */
export interface RecvPacketResultSDKType {
  status: PacketStatus;
  acknowledgement: Uint8Array;
}
function createBasePacket(): Packet {
  return {
    sequence: BigInt(0),
    sourceClient: '',
    destinationClient: '',
    timeoutTimestamp: BigInt(0),
    payloads: [],
  };
}
/**
 * Packet defines a type that carries data across different chains through IBC
 * @name Packet
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Packet
 */
export const Packet = {
  typeUrl: '/ibc.core.channel.v2.Packet' as const,
  aminoType: 'cosmos-sdk/Packet' as const,
  is(o: any): o is Packet {
    return (
      o &&
      (o.$typeUrl === Packet.typeUrl ||
        (typeof o.sequence === 'bigint' &&
          typeof o.sourceClient === 'string' &&
          typeof o.destinationClient === 'string' &&
          typeof o.timeoutTimestamp === 'bigint' &&
          Array.isArray(o.payloads) &&
          (!o.payloads.length || Payload.is(o.payloads[0]))))
    );
  },
  isSDK(o: any): o is PacketSDKType {
    return (
      o &&
      (o.$typeUrl === Packet.typeUrl ||
        (typeof o.sequence === 'bigint' &&
          typeof o.source_client === 'string' &&
          typeof o.destination_client === 'string' &&
          typeof o.timeout_timestamp === 'bigint' &&
          Array.isArray(o.payloads) &&
          (!o.payloads.length || Payload.isSDK(o.payloads[0]))))
    );
  },
  encode(
    message: Packet,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sequence !== BigInt(0)) {
      writer.uint32(8).uint64(message.sequence);
    }
    if (message.sourceClient !== '') {
      writer.uint32(18).string(message.sourceClient);
    }
    if (message.destinationClient !== '') {
      writer.uint32(26).string(message.destinationClient);
    }
    if (message.timeoutTimestamp !== BigInt(0)) {
      writer.uint32(32).uint64(message.timeoutTimestamp);
    }
    for (const v of message.payloads) {
      Payload.encode(v!, writer.uint32(42).fork()).ldelim();
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
          message.sourceClient = reader.string();
          break;
        case 3:
          message.destinationClient = reader.string();
          break;
        case 4:
          message.timeoutTimestamp = reader.uint64();
          break;
        case 5:
          message.payloads.push(Payload.decode(reader, reader.uint32()));
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
      sourceClient: isSet(object.sourceClient)
        ? String(object.sourceClient)
        : '',
      destinationClient: isSet(object.destinationClient)
        ? String(object.destinationClient)
        : '',
      timeoutTimestamp: isSet(object.timeoutTimestamp)
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0),
      payloads: Array.isArray(object?.payloads)
        ? object.payloads.map((e: any) => Payload.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Packet): JsonSafe<Packet> {
    const obj: any = {};
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    message.sourceClient !== undefined &&
      (obj.sourceClient = message.sourceClient);
    message.destinationClient !== undefined &&
      (obj.destinationClient = message.destinationClient);
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
    return obj;
  },
  fromPartial(object: Partial<Packet>): Packet {
    const message = createBasePacket();
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    message.sourceClient = object.sourceClient ?? '';
    message.destinationClient = object.destinationClient ?? '';
    message.timeoutTimestamp =
      object.timeoutTimestamp !== undefined && object.timeoutTimestamp !== null
        ? BigInt(object.timeoutTimestamp.toString())
        : BigInt(0);
    message.payloads = object.payloads?.map(e => Payload.fromPartial(e)) || [];
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
      typeUrl: '/ibc.core.channel.v2.Packet',
      value: Packet.encode(message).finish(),
    };
  },
};
function createBasePayload(): Payload {
  return {
    sourcePort: '',
    destinationPort: '',
    version: '',
    encoding: '',
    value: new Uint8Array(),
  };
}
/**
 * Payload contains the source and destination ports and payload for the application (version, encoding, raw bytes)
 * @name Payload
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Payload
 */
export const Payload = {
  typeUrl: '/ibc.core.channel.v2.Payload' as const,
  aminoType: 'cosmos-sdk/Payload' as const,
  is(o: any): o is Payload {
    return (
      o &&
      (o.$typeUrl === Payload.typeUrl ||
        (typeof o.sourcePort === 'string' &&
          typeof o.destinationPort === 'string' &&
          typeof o.version === 'string' &&
          typeof o.encoding === 'string' &&
          (o.value instanceof Uint8Array || typeof o.value === 'string')))
    );
  },
  isSDK(o: any): o is PayloadSDKType {
    return (
      o &&
      (o.$typeUrl === Payload.typeUrl ||
        (typeof o.source_port === 'string' &&
          typeof o.destination_port === 'string' &&
          typeof o.version === 'string' &&
          typeof o.encoding === 'string' &&
          (o.value instanceof Uint8Array || typeof o.value === 'string')))
    );
  },
  encode(
    message: Payload,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sourcePort !== '') {
      writer.uint32(10).string(message.sourcePort);
    }
    if (message.destinationPort !== '') {
      writer.uint32(18).string(message.destinationPort);
    }
    if (message.version !== '') {
      writer.uint32(26).string(message.version);
    }
    if (message.encoding !== '') {
      writer.uint32(34).string(message.encoding);
    }
    if (message.value.length !== 0) {
      writer.uint32(42).bytes(message.value);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Payload {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePayload();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sourcePort = reader.string();
          break;
        case 2:
          message.destinationPort = reader.string();
          break;
        case 3:
          message.version = reader.string();
          break;
        case 4:
          message.encoding = reader.string();
          break;
        case 5:
          message.value = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Payload {
    return {
      sourcePort: isSet(object.sourcePort) ? String(object.sourcePort) : '',
      destinationPort: isSet(object.destinationPort)
        ? String(object.destinationPort)
        : '',
      version: isSet(object.version) ? String(object.version) : '',
      encoding: isSet(object.encoding) ? String(object.encoding) : '',
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
    };
  },
  toJSON(message: Payload): JsonSafe<Payload> {
    const obj: any = {};
    message.sourcePort !== undefined && (obj.sourcePort = message.sourcePort);
    message.destinationPort !== undefined &&
      (obj.destinationPort = message.destinationPort);
    message.version !== undefined && (obj.version = message.version);
    message.encoding !== undefined && (obj.encoding = message.encoding);
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<Payload>): Payload {
    const message = createBasePayload();
    message.sourcePort = object.sourcePort ?? '';
    message.destinationPort = object.destinationPort ?? '';
    message.version = object.version ?? '';
    message.encoding = object.encoding ?? '';
    message.value = object.value ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: PayloadProtoMsg): Payload {
    return Payload.decode(message.value);
  },
  toProto(message: Payload): Uint8Array {
    return Payload.encode(message).finish();
  },
  toProtoMsg(message: Payload): PayloadProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.Payload',
      value: Payload.encode(message).finish(),
    };
  },
};
function createBaseAcknowledgement(): Acknowledgement {
  return {
    appAcknowledgements: [],
  };
}
/**
 * Acknowledgement contains a list of all ack results associated with a single packet.
 * In the case of a successful receive, the acknowledgement will contain an app acknowledgement
 * for each application that received a payload in the same order that the payloads were sent
 * in the packet.
 * If the receive is not successful, the acknowledgement will contain a single app acknowledgment
 * which will be a constant error acknowledgment as defined by the IBC v2 protocol.
 * @name Acknowledgement
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.Acknowledgement
 */
export const Acknowledgement = {
  typeUrl: '/ibc.core.channel.v2.Acknowledgement' as const,
  aminoType: 'cosmos-sdk/Acknowledgement' as const,
  is(o: any): o is Acknowledgement {
    return (
      o &&
      (o.$typeUrl === Acknowledgement.typeUrl ||
        (Array.isArray(o.appAcknowledgements) &&
          (!o.appAcknowledgements.length ||
            o.appAcknowledgements[0] instanceof Uint8Array ||
            typeof o.appAcknowledgements[0] === 'string')))
    );
  },
  isSDK(o: any): o is AcknowledgementSDKType {
    return (
      o &&
      (o.$typeUrl === Acknowledgement.typeUrl ||
        (Array.isArray(o.app_acknowledgements) &&
          (!o.app_acknowledgements.length ||
            o.app_acknowledgements[0] instanceof Uint8Array ||
            typeof o.app_acknowledgements[0] === 'string')))
    );
  },
  encode(
    message: Acknowledgement,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.appAcknowledgements) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Acknowledgement {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAcknowledgement();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.appAcknowledgements.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Acknowledgement {
    return {
      appAcknowledgements: Array.isArray(object?.appAcknowledgements)
        ? object.appAcknowledgements.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },
  toJSON(message: Acknowledgement): JsonSafe<Acknowledgement> {
    const obj: any = {};
    if (message.appAcknowledgements) {
      obj.appAcknowledgements = message.appAcknowledgements.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.appAcknowledgements = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Acknowledgement>): Acknowledgement {
    const message = createBaseAcknowledgement();
    message.appAcknowledgements = object.appAcknowledgements?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: AcknowledgementProtoMsg): Acknowledgement {
    return Acknowledgement.decode(message.value);
  },
  toProto(message: Acknowledgement): Uint8Array {
    return Acknowledgement.encode(message).finish();
  },
  toProtoMsg(message: Acknowledgement): AcknowledgementProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.Acknowledgement',
      value: Acknowledgement.encode(message).finish(),
    };
  },
};
function createBaseRecvPacketResult(): RecvPacketResult {
  return {
    status: 0,
    acknowledgement: new Uint8Array(),
  };
}
/**
 * RecvPacketResult speecifies the status of a packet as well as the acknowledgement bytes.
 * @name RecvPacketResult
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.RecvPacketResult
 */
export const RecvPacketResult = {
  typeUrl: '/ibc.core.channel.v2.RecvPacketResult' as const,
  aminoType: 'cosmos-sdk/RecvPacketResult' as const,
  is(o: any): o is RecvPacketResult {
    return (
      o &&
      (o.$typeUrl === RecvPacketResult.typeUrl ||
        (isSet(o.status) &&
          (o.acknowledgement instanceof Uint8Array ||
            typeof o.acknowledgement === 'string')))
    );
  },
  isSDK(o: any): o is RecvPacketResultSDKType {
    return (
      o &&
      (o.$typeUrl === RecvPacketResult.typeUrl ||
        (isSet(o.status) &&
          (o.acknowledgement instanceof Uint8Array ||
            typeof o.acknowledgement === 'string')))
    );
  },
  encode(
    message: RecvPacketResult,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    if (message.acknowledgement.length !== 0) {
      writer.uint32(18).bytes(message.acknowledgement);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RecvPacketResult {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRecvPacketResult();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.status = reader.int32() as any;
          break;
        case 2:
          message.acknowledgement = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RecvPacketResult {
    return {
      status: isSet(object.status) ? packetStatusFromJSON(object.status) : -1,
      acknowledgement: isSet(object.acknowledgement)
        ? bytesFromBase64(object.acknowledgement)
        : new Uint8Array(),
    };
  },
  toJSON(message: RecvPacketResult): JsonSafe<RecvPacketResult> {
    const obj: any = {};
    message.status !== undefined &&
      (obj.status = packetStatusToJSON(message.status));
    message.acknowledgement !== undefined &&
      (obj.acknowledgement = base64FromBytes(
        message.acknowledgement !== undefined
          ? message.acknowledgement
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RecvPacketResult>): RecvPacketResult {
    const message = createBaseRecvPacketResult();
    message.status = object.status ?? 0;
    message.acknowledgement = object.acknowledgement ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: RecvPacketResultProtoMsg): RecvPacketResult {
    return RecvPacketResult.decode(message.value);
  },
  toProto(message: RecvPacketResult): Uint8Array {
    return RecvPacketResult.encode(message).finish();
  },
  toProtoMsg(message: RecvPacketResult): RecvPacketResultProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.RecvPacketResult',
      value: RecvPacketResult.encode(message).finish(),
    };
  },
};
