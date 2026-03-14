//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * GenesisState defines the ibc channel/v2 submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.GenesisState
 */
export interface GenesisState {
  acknowledgements: PacketState[];
  commitments: PacketState[];
  receipts: PacketState[];
  asyncPackets: PacketState[];
  sendSequences: PacketSequence[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/ibc.core.channel.v2.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the ibc channel/v2 submodule's genesis state.
 * @name GenesisStateSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.GenesisState
 */
export interface GenesisStateSDKType {
  acknowledgements: PacketStateSDKType[];
  commitments: PacketStateSDKType[];
  receipts: PacketStateSDKType[];
  async_packets: PacketStateSDKType[];
  send_sequences: PacketSequenceSDKType[];
}
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketState
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketState
 */
export interface PacketState {
  /**
   * client unique identifier.
   */
  clientId: string;
  /**
   * packet sequence.
   */
  sequence: bigint;
  /**
   * embedded data that represents packet state.
   */
  data: Uint8Array;
}
export interface PacketStateProtoMsg {
  typeUrl: '/ibc.core.channel.v2.PacketState';
  value: Uint8Array;
}
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketStateSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketState
 */
export interface PacketStateSDKType {
  client_id: string;
  sequence: bigint;
  data: Uint8Array;
}
/**
 * PacketSequence defines the genesis type necessary to retrieve and store next send sequences.
 * @name PacketSequence
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketSequence
 */
export interface PacketSequence {
  /**
   * client unique identifier.
   */
  clientId: string;
  /**
   * packet sequence
   */
  sequence: bigint;
}
export interface PacketSequenceProtoMsg {
  typeUrl: '/ibc.core.channel.v2.PacketSequence';
  value: Uint8Array;
}
/**
 * PacketSequence defines the genesis type necessary to retrieve and store next send sequences.
 * @name PacketSequenceSDKType
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketSequence
 */
export interface PacketSequenceSDKType {
  client_id: string;
  sequence: bigint;
}
function createBaseGenesisState(): GenesisState {
  return {
    acknowledgements: [],
    commitments: [],
    receipts: [],
    asyncPackets: [],
    sendSequences: [],
  };
}
/**
 * GenesisState defines the ibc channel/v2 submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.GenesisState
 */
export const GenesisState = {
  typeUrl: '/ibc.core.channel.v2.GenesisState' as const,
  aminoType: 'cosmos-sdk/GenesisState' as const,
  is(o: any): o is GenesisState {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.acknowledgements) &&
          (!o.acknowledgements.length ||
            PacketState.is(o.acknowledgements[0])) &&
          Array.isArray(o.commitments) &&
          (!o.commitments.length || PacketState.is(o.commitments[0])) &&
          Array.isArray(o.receipts) &&
          (!o.receipts.length || PacketState.is(o.receipts[0])) &&
          Array.isArray(o.asyncPackets) &&
          (!o.asyncPackets.length || PacketState.is(o.asyncPackets[0])) &&
          Array.isArray(o.sendSequences) &&
          (!o.sendSequences.length || PacketSequence.is(o.sendSequences[0]))))
    );
  },
  isSDK(o: any): o is GenesisStateSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.acknowledgements) &&
          (!o.acknowledgements.length ||
            PacketState.isSDK(o.acknowledgements[0])) &&
          Array.isArray(o.commitments) &&
          (!o.commitments.length || PacketState.isSDK(o.commitments[0])) &&
          Array.isArray(o.receipts) &&
          (!o.receipts.length || PacketState.isSDK(o.receipts[0])) &&
          Array.isArray(o.async_packets) &&
          (!o.async_packets.length || PacketState.isSDK(o.async_packets[0])) &&
          Array.isArray(o.send_sequences) &&
          (!o.send_sequences.length ||
            PacketSequence.isSDK(o.send_sequences[0]))))
    );
  },
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.acknowledgements) {
      PacketState.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.commitments) {
      PacketState.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.receipts) {
      PacketState.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.asyncPackets) {
      PacketState.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.sendSequences) {
      PacketSequence.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.acknowledgements.push(
            PacketState.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.commitments.push(PacketState.decode(reader, reader.uint32()));
          break;
        case 4:
          message.receipts.push(PacketState.decode(reader, reader.uint32()));
          break;
        case 5:
          message.asyncPackets.push(
            PacketState.decode(reader, reader.uint32()),
          );
          break;
        case 6:
          message.sendSequences.push(
            PacketSequence.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      acknowledgements: Array.isArray(object?.acknowledgements)
        ? object.acknowledgements.map((e: any) => PacketState.fromJSON(e))
        : [],
      commitments: Array.isArray(object?.commitments)
        ? object.commitments.map((e: any) => PacketState.fromJSON(e))
        : [],
      receipts: Array.isArray(object?.receipts)
        ? object.receipts.map((e: any) => PacketState.fromJSON(e))
        : [],
      asyncPackets: Array.isArray(object?.asyncPackets)
        ? object.asyncPackets.map((e: any) => PacketState.fromJSON(e))
        : [],
      sendSequences: Array.isArray(object?.sendSequences)
        ? object.sendSequences.map((e: any) => PacketSequence.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.acknowledgements) {
      obj.acknowledgements = message.acknowledgements.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.acknowledgements = [];
    }
    if (message.commitments) {
      obj.commitments = message.commitments.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.commitments = [];
    }
    if (message.receipts) {
      obj.receipts = message.receipts.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.receipts = [];
    }
    if (message.asyncPackets) {
      obj.asyncPackets = message.asyncPackets.map(e =>
        e ? PacketState.toJSON(e) : undefined,
      );
    } else {
      obj.asyncPackets = [];
    }
    if (message.sendSequences) {
      obj.sendSequences = message.sendSequences.map(e =>
        e ? PacketSequence.toJSON(e) : undefined,
      );
    } else {
      obj.sendSequences = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.acknowledgements =
      object.acknowledgements?.map(e => PacketState.fromPartial(e)) || [];
    message.commitments =
      object.commitments?.map(e => PacketState.fromPartial(e)) || [];
    message.receipts =
      object.receipts?.map(e => PacketState.fromPartial(e)) || [];
    message.asyncPackets =
      object.asyncPackets?.map(e => PacketState.fromPartial(e)) || [];
    message.sendSequences =
      object.sendSequences?.map(e => PacketSequence.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
function createBasePacketState(): PacketState {
  return {
    clientId: '',
    sequence: BigInt(0),
    data: new Uint8Array(),
  };
}
/**
 * PacketState defines the generic type necessary to retrieve and store
 * packet commitments, acknowledgements, and receipts.
 * Caller is responsible for knowing the context necessary to interpret this
 * state as a commitment, acknowledgement, or a receipt.
 * @name PacketState
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketState
 */
export const PacketState = {
  typeUrl: '/ibc.core.channel.v2.PacketState' as const,
  aminoType: 'cosmos-sdk/PacketState' as const,
  is(o: any): o is PacketState {
    return (
      o &&
      (o.$typeUrl === PacketState.typeUrl ||
        (typeof o.clientId === 'string' &&
          typeof o.sequence === 'bigint' &&
          (o.data instanceof Uint8Array || typeof o.data === 'string')))
    );
  },
  isSDK(o: any): o is PacketStateSDKType {
    return (
      o &&
      (o.$typeUrl === PacketState.typeUrl ||
        (typeof o.client_id === 'string' &&
          typeof o.sequence === 'bigint' &&
          (o.data instanceof Uint8Array || typeof o.data === 'string')))
    );
  },
  encode(
    message: PacketState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.sequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.sequence);
    }
    if (message.data.length !== 0) {
      writer.uint32(26).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PacketState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePacketState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.sequence = reader.uint64();
          break;
        case 3:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PacketState {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
    };
  },
  toJSON(message: PacketState): JsonSafe<PacketState> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<PacketState>): PacketState {
    const message = createBasePacketState();
    message.clientId = object.clientId ?? '';
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: PacketStateProtoMsg): PacketState {
    return PacketState.decode(message.value);
  },
  toProto(message: PacketState): Uint8Array {
    return PacketState.encode(message).finish();
  },
  toProtoMsg(message: PacketState): PacketStateProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.PacketState',
      value: PacketState.encode(message).finish(),
    };
  },
};
function createBasePacketSequence(): PacketSequence {
  return {
    clientId: '',
    sequence: BigInt(0),
  };
}
/**
 * PacketSequence defines the genesis type necessary to retrieve and store next send sequences.
 * @name PacketSequence
 * @package ibc.core.channel.v2
 * @see proto type: ibc.core.channel.v2.PacketSequence
 */
export const PacketSequence = {
  typeUrl: '/ibc.core.channel.v2.PacketSequence' as const,
  aminoType: 'cosmos-sdk/PacketSequence' as const,
  is(o: any): o is PacketSequence {
    return (
      o &&
      (o.$typeUrl === PacketSequence.typeUrl ||
        (typeof o.clientId === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  isSDK(o: any): o is PacketSequenceSDKType {
    return (
      o &&
      (o.$typeUrl === PacketSequence.typeUrl ||
        (typeof o.client_id === 'string' && typeof o.sequence === 'bigint'))
    );
  },
  encode(
    message: PacketSequence,
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
  decode(input: BinaryReader | Uint8Array, length?: number): PacketSequence {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePacketSequence();
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
  fromJSON(object: any): PacketSequence {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(message: PacketSequence): JsonSafe<PacketSequence> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<PacketSequence>): PacketSequence {
    const message = createBasePacketSequence();
    message.clientId = object.clientId ?? '';
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: PacketSequenceProtoMsg): PacketSequence {
    return PacketSequence.decode(message.value);
  },
  toProto(message: PacketSequence): Uint8Array {
    return PacketSequence.encode(message).finish();
  },
  toProtoMsg(message: PacketSequence): PacketSequenceProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v2.PacketSequence',
      value: PacketSequence.encode(message).finish(),
    };
  },
};
