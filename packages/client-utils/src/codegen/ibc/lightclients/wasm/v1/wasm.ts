//@ts-nocheck
import { Height, type HeightSDKType } from '../../../core/client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../../json-safe.js';
/** Wasm light client's Client state */
export interface ClientState {
  /**
   * bytes encoding the client state of the underlying light client
   * implemented as a Wasm contract.
   */
  data: Uint8Array;
  checksum: Uint8Array;
  latestHeight: Height;
}
export interface ClientStateProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.ClientState';
  value: Uint8Array;
}
/** Wasm light client's Client state */
export interface ClientStateSDKType {
  data: Uint8Array;
  checksum: Uint8Array;
  latest_height: HeightSDKType;
}
/** Wasm light client's ConsensusState */
export interface ConsensusState {
  /**
   * bytes encoding the consensus state of the underlying light client
   * implemented as a Wasm contract.
   */
  data: Uint8Array;
}
export interface ConsensusStateProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.ConsensusState';
  value: Uint8Array;
}
/** Wasm light client's ConsensusState */
export interface ConsensusStateSDKType {
  data: Uint8Array;
}
/** Wasm light client message (either header(s) or misbehaviour) */
export interface ClientMessage {
  data: Uint8Array;
}
export interface ClientMessageProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.ClientMessage';
  value: Uint8Array;
}
/** Wasm light client message (either header(s) or misbehaviour) */
export interface ClientMessageSDKType {
  data: Uint8Array;
}
/**
 * Checksums defines a list of all checksums that are stored
 *
 * Deprecated: This message is deprecated in favor of storing the checksums
 * using a Collections.KeySet.
 */
/** @deprecated */
export interface Checksums {
  checksums: Uint8Array[];
}
export interface ChecksumsProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.Checksums';
  value: Uint8Array;
}
/**
 * Checksums defines a list of all checksums that are stored
 *
 * Deprecated: This message is deprecated in favor of storing the checksums
 * using a Collections.KeySet.
 */
/** @deprecated */
export interface ChecksumsSDKType {
  checksums: Uint8Array[];
}
function createBaseClientState(): ClientState {
  return {
    data: new Uint8Array(),
    checksum: new Uint8Array(),
    latestHeight: Height.fromPartial({}),
  };
}
export const ClientState = {
  typeUrl: '/ibc.lightclients.wasm.v1.ClientState',
  encode(
    message: ClientState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(18).bytes(message.checksum);
    }
    if (message.latestHeight !== undefined) {
      Height.encode(message.latestHeight, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ClientState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseClientState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        case 2:
          message.checksum = reader.bytes();
          break;
        case 3:
          message.latestHeight = Height.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ClientState {
    return {
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      checksum: isSet(object.checksum)
        ? bytesFromBase64(object.checksum)
        : new Uint8Array(),
      latestHeight: isSet(object.latestHeight)
        ? Height.fromJSON(object.latestHeight)
        : undefined,
    };
  },
  toJSON(message: ClientState): JsonSafe<ClientState> {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(
        message.checksum !== undefined ? message.checksum : new Uint8Array(),
      ));
    message.latestHeight !== undefined &&
      (obj.latestHeight = message.latestHeight
        ? Height.toJSON(message.latestHeight)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<ClientState>): ClientState {
    const message = createBaseClientState();
    message.data = object.data ?? new Uint8Array();
    message.checksum = object.checksum ?? new Uint8Array();
    message.latestHeight =
      object.latestHeight !== undefined && object.latestHeight !== null
        ? Height.fromPartial(object.latestHeight)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ClientStateProtoMsg): ClientState {
    return ClientState.decode(message.value);
  },
  toProto(message: ClientState): Uint8Array {
    return ClientState.encode(message).finish();
  },
  toProtoMsg(message: ClientState): ClientStateProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.ClientState',
      value: ClientState.encode(message).finish(),
    };
  },
};
function createBaseConsensusState(): ConsensusState {
  return {
    data: new Uint8Array(),
  };
}
export const ConsensusState = {
  typeUrl: '/ibc.lightclients.wasm.v1.ConsensusState',
  encode(
    message: ConsensusState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ConsensusState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConsensusState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConsensusState {
    return {
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
    };
  },
  toJSON(message: ConsensusState): JsonSafe<ConsensusState> {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ConsensusState>): ConsensusState {
    const message = createBaseConsensusState();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ConsensusStateProtoMsg): ConsensusState {
    return ConsensusState.decode(message.value);
  },
  toProto(message: ConsensusState): Uint8Array {
    return ConsensusState.encode(message).finish();
  },
  toProtoMsg(message: ConsensusState): ConsensusStateProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.ConsensusState',
      value: ConsensusState.encode(message).finish(),
    };
  },
};
function createBaseClientMessage(): ClientMessage {
  return {
    data: new Uint8Array(),
  };
}
export const ClientMessage = {
  typeUrl: '/ibc.lightclients.wasm.v1.ClientMessage',
  encode(
    message: ClientMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ClientMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseClientMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ClientMessage {
    return {
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
    };
  },
  toJSON(message: ClientMessage): JsonSafe<ClientMessage> {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ClientMessage>): ClientMessage {
    const message = createBaseClientMessage();
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ClientMessageProtoMsg): ClientMessage {
    return ClientMessage.decode(message.value);
  },
  toProto(message: ClientMessage): Uint8Array {
    return ClientMessage.encode(message).finish();
  },
  toProtoMsg(message: ClientMessage): ClientMessageProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.ClientMessage',
      value: ClientMessage.encode(message).finish(),
    };
  },
};
function createBaseChecksums(): Checksums {
  return {
    checksums: [],
  };
}
export const Checksums = {
  typeUrl: '/ibc.lightclients.wasm.v1.Checksums',
  encode(
    message: Checksums,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.checksums) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Checksums {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseChecksums();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.checksums.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Checksums {
    return {
      checksums: Array.isArray(object?.checksums)
        ? object.checksums.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },
  toJSON(message: Checksums): JsonSafe<Checksums> {
    const obj: any = {};
    if (message.checksums) {
      obj.checksums = message.checksums.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.checksums = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Checksums>): Checksums {
    const message = createBaseChecksums();
    message.checksums = object.checksums?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: ChecksumsProtoMsg): Checksums {
    return Checksums.decode(message.value);
  },
  toProto(message: Checksums): Uint8Array {
    return Checksums.encode(message).finish();
  },
  toProtoMsg(message: Checksums): ChecksumsProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.Checksums',
      value: Checksums.encode(message).finish(),
    };
  },
};
