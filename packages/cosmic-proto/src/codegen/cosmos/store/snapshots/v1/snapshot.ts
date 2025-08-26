//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../../json-safe.js';
/** Snapshot contains Tendermint state sync snapshot info. */
export interface Snapshot {
  height: bigint;
  format: number;
  chunks: number;
  hash: Uint8Array;
  metadata: Metadata;
}
export interface SnapshotProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.Snapshot';
  value: Uint8Array;
}
/** Snapshot contains Tendermint state sync snapshot info. */
export interface SnapshotSDKType {
  height: bigint;
  format: number;
  chunks: number;
  hash: Uint8Array;
  metadata: MetadataSDKType;
}
/** Metadata contains SDK-specific snapshot metadata. */
export interface Metadata {
  /** SHA-256 chunk hashes */
  chunkHashes: Uint8Array[];
}
export interface MetadataProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.Metadata';
  value: Uint8Array;
}
/** Metadata contains SDK-specific snapshot metadata. */
export interface MetadataSDKType {
  chunk_hashes: Uint8Array[];
}
/**
 * SnapshotItem is an item contained in a rootmulti.Store snapshot.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotItem {
  store?: SnapshotStoreItem;
  iavl?: SnapshotIAVLItem;
  extension?: SnapshotExtensionMeta;
  extensionPayload?: SnapshotExtensionPayload;
}
export interface SnapshotItemProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotItem';
  value: Uint8Array;
}
/**
 * SnapshotItem is an item contained in a rootmulti.Store snapshot.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotItemSDKType {
  store?: SnapshotStoreItemSDKType;
  iavl?: SnapshotIAVLItemSDKType;
  extension?: SnapshotExtensionMetaSDKType;
  extension_payload?: SnapshotExtensionPayloadSDKType;
}
/**
 * SnapshotStoreItem contains metadata about a snapshotted store.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotStoreItem {
  name: string;
}
export interface SnapshotStoreItemProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotStoreItem';
  value: Uint8Array;
}
/**
 * SnapshotStoreItem contains metadata about a snapshotted store.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotStoreItemSDKType {
  name: string;
}
/**
 * SnapshotIAVLItem is an exported IAVL node.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotIAVLItem {
  key: Uint8Array;
  value: Uint8Array;
  /** version is block height */
  version: bigint;
  /** height is depth of the tree. */
  height: number;
}
export interface SnapshotIAVLItemProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotIAVLItem';
  value: Uint8Array;
}
/**
 * SnapshotIAVLItem is an exported IAVL node.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotIAVLItemSDKType {
  key: Uint8Array;
  value: Uint8Array;
  version: bigint;
  height: number;
}
/**
 * SnapshotExtensionMeta contains metadata about an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotExtensionMeta {
  name: string;
  format: number;
}
export interface SnapshotExtensionMetaProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionMeta';
  value: Uint8Array;
}
/**
 * SnapshotExtensionMeta contains metadata about an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotExtensionMetaSDKType {
  name: string;
  format: number;
}
/**
 * SnapshotExtensionPayload contains payloads of an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotExtensionPayload {
  payload: Uint8Array;
}
export interface SnapshotExtensionPayloadProtoMsg {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionPayload';
  value: Uint8Array;
}
/**
 * SnapshotExtensionPayload contains payloads of an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 */
export interface SnapshotExtensionPayloadSDKType {
  payload: Uint8Array;
}
function createBaseSnapshot(): Snapshot {
  return {
    height: BigInt(0),
    format: 0,
    chunks: 0,
    hash: new Uint8Array(),
    metadata: Metadata.fromPartial({}),
  };
}
export const Snapshot = {
  typeUrl: '/cosmos.store.snapshots.v1.Snapshot' as const,
  encode(
    message: Snapshot,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).uint64(message.height);
    }
    if (message.format !== 0) {
      writer.uint32(16).uint32(message.format);
    }
    if (message.chunks !== 0) {
      writer.uint32(24).uint32(message.chunks);
    }
    if (message.hash.length !== 0) {
      writer.uint32(34).bytes(message.hash);
    }
    if (message.metadata !== undefined) {
      Metadata.encode(message.metadata, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Snapshot {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshot();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.uint64();
          break;
        case 2:
          message.format = reader.uint32();
          break;
        case 3:
          message.chunks = reader.uint32();
          break;
        case 4:
          message.hash = reader.bytes();
          break;
        case 5:
          message.metadata = Metadata.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Snapshot {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      format: isSet(object.format) ? Number(object.format) : 0,
      chunks: isSet(object.chunks) ? Number(object.chunks) : 0,
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      metadata: isSet(object.metadata)
        ? Metadata.fromJSON(object.metadata)
        : undefined,
    };
  },
  toJSON(message: Snapshot): JsonSafe<Snapshot> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.format !== undefined && (obj.format = Math.round(message.format));
    message.chunks !== undefined && (obj.chunks = Math.round(message.chunks));
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.metadata !== undefined &&
      (obj.metadata = message.metadata
        ? Metadata.toJSON(message.metadata)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<Snapshot>): Snapshot {
    const message = createBaseSnapshot();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.format = object.format ?? 0;
    message.chunks = object.chunks ?? 0;
    message.hash = object.hash ?? new Uint8Array();
    message.metadata =
      object.metadata !== undefined && object.metadata !== null
        ? Metadata.fromPartial(object.metadata)
        : undefined;
    return message;
  },
  fromProtoMsg(message: SnapshotProtoMsg): Snapshot {
    return Snapshot.decode(message.value);
  },
  toProto(message: Snapshot): Uint8Array {
    return Snapshot.encode(message).finish();
  },
  toProtoMsg(message: Snapshot): SnapshotProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.Snapshot',
      value: Snapshot.encode(message).finish(),
    };
  },
};
function createBaseMetadata(): Metadata {
  return {
    chunkHashes: [],
  };
}
export const Metadata = {
  typeUrl: '/cosmos.store.snapshots.v1.Metadata' as const,
  encode(
    message: Metadata,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.chunkHashes) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Metadata {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chunkHashes.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Metadata {
    return {
      chunkHashes: Array.isArray(object?.chunkHashes)
        ? object.chunkHashes.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },
  toJSON(message: Metadata): JsonSafe<Metadata> {
    const obj: any = {};
    if (message.chunkHashes) {
      obj.chunkHashes = message.chunkHashes.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.chunkHashes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Metadata>): Metadata {
    const message = createBaseMetadata();
    message.chunkHashes = object.chunkHashes?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: MetadataProtoMsg): Metadata {
    return Metadata.decode(message.value);
  },
  toProto(message: Metadata): Uint8Array {
    return Metadata.encode(message).finish();
  },
  toProtoMsg(message: Metadata): MetadataProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.Metadata',
      value: Metadata.encode(message).finish(),
    };
  },
};
function createBaseSnapshotItem(): SnapshotItem {
  return {
    store: undefined,
    iavl: undefined,
    extension: undefined,
    extensionPayload: undefined,
  };
}
export const SnapshotItem = {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotItem' as const,
  encode(
    message: SnapshotItem,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.store !== undefined) {
      SnapshotStoreItem.encode(
        message.store,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.iavl !== undefined) {
      SnapshotIAVLItem.encode(message.iavl, writer.uint32(18).fork()).ldelim();
    }
    if (message.extension !== undefined) {
      SnapshotExtensionMeta.encode(
        message.extension,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.extensionPayload !== undefined) {
      SnapshotExtensionPayload.encode(
        message.extensionPayload,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SnapshotItem {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshotItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.store = SnapshotStoreItem.decode(reader, reader.uint32());
          break;
        case 2:
          message.iavl = SnapshotIAVLItem.decode(reader, reader.uint32());
          break;
        case 3:
          message.extension = SnapshotExtensionMeta.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 4:
          message.extensionPayload = SnapshotExtensionPayload.decode(
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
  fromJSON(object: any): SnapshotItem {
    return {
      store: isSet(object.store)
        ? SnapshotStoreItem.fromJSON(object.store)
        : undefined,
      iavl: isSet(object.iavl)
        ? SnapshotIAVLItem.fromJSON(object.iavl)
        : undefined,
      extension: isSet(object.extension)
        ? SnapshotExtensionMeta.fromJSON(object.extension)
        : undefined,
      extensionPayload: isSet(object.extensionPayload)
        ? SnapshotExtensionPayload.fromJSON(object.extensionPayload)
        : undefined,
    };
  },
  toJSON(message: SnapshotItem): JsonSafe<SnapshotItem> {
    const obj: any = {};
    message.store !== undefined &&
      (obj.store = message.store
        ? SnapshotStoreItem.toJSON(message.store)
        : undefined);
    message.iavl !== undefined &&
      (obj.iavl = message.iavl
        ? SnapshotIAVLItem.toJSON(message.iavl)
        : undefined);
    message.extension !== undefined &&
      (obj.extension = message.extension
        ? SnapshotExtensionMeta.toJSON(message.extension)
        : undefined);
    message.extensionPayload !== undefined &&
      (obj.extensionPayload = message.extensionPayload
        ? SnapshotExtensionPayload.toJSON(message.extensionPayload)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<SnapshotItem>): SnapshotItem {
    const message = createBaseSnapshotItem();
    message.store =
      object.store !== undefined && object.store !== null
        ? SnapshotStoreItem.fromPartial(object.store)
        : undefined;
    message.iavl =
      object.iavl !== undefined && object.iavl !== null
        ? SnapshotIAVLItem.fromPartial(object.iavl)
        : undefined;
    message.extension =
      object.extension !== undefined && object.extension !== null
        ? SnapshotExtensionMeta.fromPartial(object.extension)
        : undefined;
    message.extensionPayload =
      object.extensionPayload !== undefined && object.extensionPayload !== null
        ? SnapshotExtensionPayload.fromPartial(object.extensionPayload)
        : undefined;
    return message;
  },
  fromProtoMsg(message: SnapshotItemProtoMsg): SnapshotItem {
    return SnapshotItem.decode(message.value);
  },
  toProto(message: SnapshotItem): Uint8Array {
    return SnapshotItem.encode(message).finish();
  },
  toProtoMsg(message: SnapshotItem): SnapshotItemProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.SnapshotItem',
      value: SnapshotItem.encode(message).finish(),
    };
  },
};
function createBaseSnapshotStoreItem(): SnapshotStoreItem {
  return {
    name: '',
  };
}
export const SnapshotStoreItem = {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotStoreItem' as const,
  encode(
    message: SnapshotStoreItem,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SnapshotStoreItem {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshotStoreItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SnapshotStoreItem {
    return {
      name: isSet(object.name) ? String(object.name) : '',
    };
  },
  toJSON(message: SnapshotStoreItem): JsonSafe<SnapshotStoreItem> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    return obj;
  },
  fromPartial(object: Partial<SnapshotStoreItem>): SnapshotStoreItem {
    const message = createBaseSnapshotStoreItem();
    message.name = object.name ?? '';
    return message;
  },
  fromProtoMsg(message: SnapshotStoreItemProtoMsg): SnapshotStoreItem {
    return SnapshotStoreItem.decode(message.value);
  },
  toProto(message: SnapshotStoreItem): Uint8Array {
    return SnapshotStoreItem.encode(message).finish();
  },
  toProtoMsg(message: SnapshotStoreItem): SnapshotStoreItemProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.SnapshotStoreItem',
      value: SnapshotStoreItem.encode(message).finish(),
    };
  },
};
function createBaseSnapshotIAVLItem(): SnapshotIAVLItem {
  return {
    key: new Uint8Array(),
    value: new Uint8Array(),
    version: BigInt(0),
    height: 0,
  };
}
export const SnapshotIAVLItem = {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotIAVLItem' as const,
  encode(
    message: SnapshotIAVLItem,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    if (message.version !== BigInt(0)) {
      writer.uint32(24).int64(message.version);
    }
    if (message.height !== 0) {
      writer.uint32(32).int32(message.height);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SnapshotIAVLItem {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshotIAVLItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        case 3:
          message.version = reader.int64();
          break;
        case 4:
          message.height = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SnapshotIAVLItem {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
      version: isSet(object.version)
        ? BigInt(object.version.toString())
        : BigInt(0),
      height: isSet(object.height) ? Number(object.height) : 0,
    };
  },
  toJSON(message: SnapshotIAVLItem): JsonSafe<SnapshotIAVLItem> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    message.version !== undefined &&
      (obj.version = (message.version || BigInt(0)).toString());
    message.height !== undefined && (obj.height = Math.round(message.height));
    return obj;
  },
  fromPartial(object: Partial<SnapshotIAVLItem>): SnapshotIAVLItem {
    const message = createBaseSnapshotIAVLItem();
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    message.version =
      object.version !== undefined && object.version !== null
        ? BigInt(object.version.toString())
        : BigInt(0);
    message.height = object.height ?? 0;
    return message;
  },
  fromProtoMsg(message: SnapshotIAVLItemProtoMsg): SnapshotIAVLItem {
    return SnapshotIAVLItem.decode(message.value);
  },
  toProto(message: SnapshotIAVLItem): Uint8Array {
    return SnapshotIAVLItem.encode(message).finish();
  },
  toProtoMsg(message: SnapshotIAVLItem): SnapshotIAVLItemProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.SnapshotIAVLItem',
      value: SnapshotIAVLItem.encode(message).finish(),
    };
  },
};
function createBaseSnapshotExtensionMeta(): SnapshotExtensionMeta {
  return {
    name: '',
    format: 0,
  };
}
export const SnapshotExtensionMeta = {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionMeta' as const,
  encode(
    message: SnapshotExtensionMeta,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.format !== 0) {
      writer.uint32(16).uint32(message.format);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SnapshotExtensionMeta {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshotExtensionMeta();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.format = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SnapshotExtensionMeta {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      format: isSet(object.format) ? Number(object.format) : 0,
    };
  },
  toJSON(message: SnapshotExtensionMeta): JsonSafe<SnapshotExtensionMeta> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.format !== undefined && (obj.format = Math.round(message.format));
    return obj;
  },
  fromPartial(object: Partial<SnapshotExtensionMeta>): SnapshotExtensionMeta {
    const message = createBaseSnapshotExtensionMeta();
    message.name = object.name ?? '';
    message.format = object.format ?? 0;
    return message;
  },
  fromProtoMsg(message: SnapshotExtensionMetaProtoMsg): SnapshotExtensionMeta {
    return SnapshotExtensionMeta.decode(message.value);
  },
  toProto(message: SnapshotExtensionMeta): Uint8Array {
    return SnapshotExtensionMeta.encode(message).finish();
  },
  toProtoMsg(message: SnapshotExtensionMeta): SnapshotExtensionMetaProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionMeta',
      value: SnapshotExtensionMeta.encode(message).finish(),
    };
  },
};
function createBaseSnapshotExtensionPayload(): SnapshotExtensionPayload {
  return {
    payload: new Uint8Array(),
  };
}
export const SnapshotExtensionPayload = {
  typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionPayload' as const,
  encode(
    message: SnapshotExtensionPayload,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.payload.length !== 0) {
      writer.uint32(10).bytes(message.payload);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SnapshotExtensionPayload {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshotExtensionPayload();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.payload = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SnapshotExtensionPayload {
    return {
      payload: isSet(object.payload)
        ? bytesFromBase64(object.payload)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: SnapshotExtensionPayload,
  ): JsonSafe<SnapshotExtensionPayload> {
    const obj: any = {};
    message.payload !== undefined &&
      (obj.payload = base64FromBytes(
        message.payload !== undefined ? message.payload : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<SnapshotExtensionPayload>,
  ): SnapshotExtensionPayload {
    const message = createBaseSnapshotExtensionPayload();
    message.payload = object.payload ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: SnapshotExtensionPayloadProtoMsg,
  ): SnapshotExtensionPayload {
    return SnapshotExtensionPayload.decode(message.value);
  },
  toProto(message: SnapshotExtensionPayload): Uint8Array {
    return SnapshotExtensionPayload.encode(message).finish();
  },
  toProtoMsg(
    message: SnapshotExtensionPayload,
  ): SnapshotExtensionPayloadProtoMsg {
    return {
      typeUrl: '/cosmos.store.snapshots.v1.SnapshotExtensionPayload',
      value: SnapshotExtensionPayload.encode(message).finish(),
    };
  },
};
