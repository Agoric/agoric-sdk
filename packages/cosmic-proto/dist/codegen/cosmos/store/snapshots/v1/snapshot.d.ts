import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Snapshot contains Tendermint state sync snapshot info.
 * @name Snapshot
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Snapshot
 */
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
/**
 * Snapshot contains Tendermint state sync snapshot info.
 * @name SnapshotSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Snapshot
 */
export interface SnapshotSDKType {
    height: bigint;
    format: number;
    chunks: number;
    hash: Uint8Array;
    metadata: MetadataSDKType;
}
/**
 * Metadata contains SDK-specific snapshot metadata.
 * @name Metadata
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Metadata
 */
export interface Metadata {
    /**
     * SHA-256 chunk hashes
     */
    chunkHashes: Uint8Array[];
}
export interface MetadataProtoMsg {
    typeUrl: '/cosmos.store.snapshots.v1.Metadata';
    value: Uint8Array;
}
/**
 * Metadata contains SDK-specific snapshot metadata.
 * @name MetadataSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Metadata
 */
export interface MetadataSDKType {
    chunk_hashes: Uint8Array[];
}
/**
 * SnapshotItem is an item contained in a rootmulti.Store snapshot.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotItem
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
 * @name SnapshotItemSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotItem
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
 * @name SnapshotStoreItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotStoreItem
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
 * @name SnapshotStoreItemSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotStoreItem
 */
export interface SnapshotStoreItemSDKType {
    name: string;
}
/**
 * SnapshotIAVLItem is an exported IAVL node.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotIAVLItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotIAVLItem
 */
export interface SnapshotIAVLItem {
    key: Uint8Array;
    value: Uint8Array;
    /**
     * version is block height
     */
    version: bigint;
    /**
     * height is depth of the tree.
     */
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
 * @name SnapshotIAVLItemSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotIAVLItem
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
 * @name SnapshotExtensionMeta
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionMeta
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
 * @name SnapshotExtensionMetaSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionMeta
 */
export interface SnapshotExtensionMetaSDKType {
    name: string;
    format: number;
}
/**
 * SnapshotExtensionPayload contains payloads of an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotExtensionPayload
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionPayload
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
 * @name SnapshotExtensionPayloadSDKType
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionPayload
 */
export interface SnapshotExtensionPayloadSDKType {
    payload: Uint8Array;
}
/**
 * Snapshot contains Tendermint state sync snapshot info.
 * @name Snapshot
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Snapshot
 */
export declare const Snapshot: {
    typeUrl: "/cosmos.store.snapshots.v1.Snapshot";
    aminoType: "cosmos-sdk/Snapshot";
    is(o: any): o is Snapshot;
    isSDK(o: any): o is SnapshotSDKType;
    encode(message: Snapshot, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Snapshot;
    fromJSON(object: any): Snapshot;
    toJSON(message: Snapshot): JsonSafe<Snapshot>;
    fromPartial(object: Partial<Snapshot>): Snapshot;
    fromProtoMsg(message: SnapshotProtoMsg): Snapshot;
    toProto(message: Snapshot): Uint8Array;
    toProtoMsg(message: Snapshot): SnapshotProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Metadata contains SDK-specific snapshot metadata.
 * @name Metadata
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.Metadata
 */
export declare const Metadata: {
    typeUrl: "/cosmos.store.snapshots.v1.Metadata";
    aminoType: "cosmos-sdk/Metadata";
    is(o: any): o is Metadata;
    isSDK(o: any): o is MetadataSDKType;
    encode(message: Metadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Metadata;
    fromJSON(object: any): Metadata;
    toJSON(message: Metadata): JsonSafe<Metadata>;
    fromPartial(object: Partial<Metadata>): Metadata;
    fromProtoMsg(message: MetadataProtoMsg): Metadata;
    toProto(message: Metadata): Uint8Array;
    toProtoMsg(message: Metadata): MetadataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SnapshotItem is an item contained in a rootmulti.Store snapshot.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotItem
 */
export declare const SnapshotItem: {
    typeUrl: "/cosmos.store.snapshots.v1.SnapshotItem";
    aminoType: "cosmos-sdk/SnapshotItem";
    is(o: any): o is SnapshotItem;
    isSDK(o: any): o is SnapshotItemSDKType;
    encode(message: SnapshotItem, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SnapshotItem;
    fromJSON(object: any): SnapshotItem;
    toJSON(message: SnapshotItem): JsonSafe<SnapshotItem>;
    fromPartial(object: Partial<SnapshotItem>): SnapshotItem;
    fromProtoMsg(message: SnapshotItemProtoMsg): SnapshotItem;
    toProto(message: SnapshotItem): Uint8Array;
    toProtoMsg(message: SnapshotItem): SnapshotItemProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SnapshotStoreItem contains metadata about a snapshotted store.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotStoreItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotStoreItem
 */
export declare const SnapshotStoreItem: {
    typeUrl: "/cosmos.store.snapshots.v1.SnapshotStoreItem";
    aminoType: "cosmos-sdk/SnapshotStoreItem";
    is(o: any): o is SnapshotStoreItem;
    isSDK(o: any): o is SnapshotStoreItemSDKType;
    encode(message: SnapshotStoreItem, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SnapshotStoreItem;
    fromJSON(object: any): SnapshotStoreItem;
    toJSON(message: SnapshotStoreItem): JsonSafe<SnapshotStoreItem>;
    fromPartial(object: Partial<SnapshotStoreItem>): SnapshotStoreItem;
    fromProtoMsg(message: SnapshotStoreItemProtoMsg): SnapshotStoreItem;
    toProto(message: SnapshotStoreItem): Uint8Array;
    toProtoMsg(message: SnapshotStoreItem): SnapshotStoreItemProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SnapshotIAVLItem is an exported IAVL node.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotIAVLItem
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotIAVLItem
 */
export declare const SnapshotIAVLItem: {
    typeUrl: "/cosmos.store.snapshots.v1.SnapshotIAVLItem";
    aminoType: "cosmos-sdk/SnapshotIAVLItem";
    is(o: any): o is SnapshotIAVLItem;
    isSDK(o: any): o is SnapshotIAVLItemSDKType;
    encode(message: SnapshotIAVLItem, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SnapshotIAVLItem;
    fromJSON(object: any): SnapshotIAVLItem;
    toJSON(message: SnapshotIAVLItem): JsonSafe<SnapshotIAVLItem>;
    fromPartial(object: Partial<SnapshotIAVLItem>): SnapshotIAVLItem;
    fromProtoMsg(message: SnapshotIAVLItemProtoMsg): SnapshotIAVLItem;
    toProto(message: SnapshotIAVLItem): Uint8Array;
    toProtoMsg(message: SnapshotIAVLItem): SnapshotIAVLItemProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SnapshotExtensionMeta contains metadata about an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotExtensionMeta
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionMeta
 */
export declare const SnapshotExtensionMeta: {
    typeUrl: "/cosmos.store.snapshots.v1.SnapshotExtensionMeta";
    aminoType: "cosmos-sdk/SnapshotExtensionMeta";
    is(o: any): o is SnapshotExtensionMeta;
    isSDK(o: any): o is SnapshotExtensionMetaSDKType;
    encode(message: SnapshotExtensionMeta, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SnapshotExtensionMeta;
    fromJSON(object: any): SnapshotExtensionMeta;
    toJSON(message: SnapshotExtensionMeta): JsonSafe<SnapshotExtensionMeta>;
    fromPartial(object: Partial<SnapshotExtensionMeta>): SnapshotExtensionMeta;
    fromProtoMsg(message: SnapshotExtensionMetaProtoMsg): SnapshotExtensionMeta;
    toProto(message: SnapshotExtensionMeta): Uint8Array;
    toProtoMsg(message: SnapshotExtensionMeta): SnapshotExtensionMetaProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SnapshotExtensionPayload contains payloads of an external snapshotter.
 *
 * Since: cosmos-sdk 0.46
 * @name SnapshotExtensionPayload
 * @package cosmos.store.snapshots.v1
 * @see proto type: cosmos.store.snapshots.v1.SnapshotExtensionPayload
 */
export declare const SnapshotExtensionPayload: {
    typeUrl: "/cosmos.store.snapshots.v1.SnapshotExtensionPayload";
    aminoType: "cosmos-sdk/SnapshotExtensionPayload";
    is(o: any): o is SnapshotExtensionPayload;
    isSDK(o: any): o is SnapshotExtensionPayloadSDKType;
    encode(message: SnapshotExtensionPayload, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SnapshotExtensionPayload;
    fromJSON(object: any): SnapshotExtensionPayload;
    toJSON(message: SnapshotExtensionPayload): JsonSafe<SnapshotExtensionPayload>;
    fromPartial(object: Partial<SnapshotExtensionPayload>): SnapshotExtensionPayload;
    fromProtoMsg(message: SnapshotExtensionPayloadProtoMsg): SnapshotExtensionPayload;
    toProto(message: SnapshotExtensionPayload): Uint8Array;
    toProtoMsg(message: SnapshotExtensionPayload): SnapshotExtensionPayloadProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=snapshot.d.ts.map