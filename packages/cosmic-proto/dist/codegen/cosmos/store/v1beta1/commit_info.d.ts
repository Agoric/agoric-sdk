import { Timestamp, type TimestampSDKType } from '../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * CommitInfo defines commit information used by the multi-store when committing
 * a version/height.
 * @name CommitInfo
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitInfo
 */
export interface CommitInfo {
    version: bigint;
    storeInfos: StoreInfo[];
    timestamp: Timestamp;
}
export interface CommitInfoProtoMsg {
    typeUrl: '/cosmos.store.v1beta1.CommitInfo';
    value: Uint8Array;
}
/**
 * CommitInfo defines commit information used by the multi-store when committing
 * a version/height.
 * @name CommitInfoSDKType
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitInfo
 */
export interface CommitInfoSDKType {
    version: bigint;
    store_infos: StoreInfoSDKType[];
    timestamp: TimestampSDKType;
}
/**
 * StoreInfo defines store-specific commit information. It contains a reference
 * between a store name and the commit ID.
 * @name StoreInfo
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreInfo
 */
export interface StoreInfo {
    name: string;
    commitId: CommitID;
}
export interface StoreInfoProtoMsg {
    typeUrl: '/cosmos.store.v1beta1.StoreInfo';
    value: Uint8Array;
}
/**
 * StoreInfo defines store-specific commit information. It contains a reference
 * between a store name and the commit ID.
 * @name StoreInfoSDKType
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreInfo
 */
export interface StoreInfoSDKType {
    name: string;
    commit_id: CommitIDSDKType;
}
/**
 * CommitID defines the commitment information when a specific store is
 * committed.
 * @name CommitID
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitID
 */
export interface CommitID {
    version: bigint;
    hash: Uint8Array;
}
export interface CommitIDProtoMsg {
    typeUrl: '/cosmos.store.v1beta1.CommitID';
    value: Uint8Array;
}
/**
 * CommitID defines the commitment information when a specific store is
 * committed.
 * @name CommitIDSDKType
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitID
 */
export interface CommitIDSDKType {
    version: bigint;
    hash: Uint8Array;
}
/**
 * CommitInfo defines commit information used by the multi-store when committing
 * a version/height.
 * @name CommitInfo
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitInfo
 */
export declare const CommitInfo: {
    typeUrl: "/cosmos.store.v1beta1.CommitInfo";
    aminoType: "cosmos-sdk/CommitInfo";
    is(o: any): o is CommitInfo;
    isSDK(o: any): o is CommitInfoSDKType;
    encode(message: CommitInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CommitInfo;
    fromJSON(object: any): CommitInfo;
    toJSON(message: CommitInfo): JsonSafe<CommitInfo>;
    fromPartial(object: Partial<CommitInfo>): CommitInfo;
    fromProtoMsg(message: CommitInfoProtoMsg): CommitInfo;
    toProto(message: CommitInfo): Uint8Array;
    toProtoMsg(message: CommitInfo): CommitInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * StoreInfo defines store-specific commit information. It contains a reference
 * between a store name and the commit ID.
 * @name StoreInfo
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreInfo
 */
export declare const StoreInfo: {
    typeUrl: "/cosmos.store.v1beta1.StoreInfo";
    aminoType: "cosmos-sdk/StoreInfo";
    is(o: any): o is StoreInfo;
    isSDK(o: any): o is StoreInfoSDKType;
    encode(message: StoreInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StoreInfo;
    fromJSON(object: any): StoreInfo;
    toJSON(message: StoreInfo): JsonSafe<StoreInfo>;
    fromPartial(object: Partial<StoreInfo>): StoreInfo;
    fromProtoMsg(message: StoreInfoProtoMsg): StoreInfo;
    toProto(message: StoreInfo): Uint8Array;
    toProtoMsg(message: StoreInfo): StoreInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CommitID defines the commitment information when a specific store is
 * committed.
 * @name CommitID
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.CommitID
 */
export declare const CommitID: {
    typeUrl: "/cosmos.store.v1beta1.CommitID";
    aminoType: "cosmos-sdk/CommitID";
    is(o: any): o is CommitID;
    isSDK(o: any): o is CommitIDSDKType;
    encode(message: CommitID, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CommitID;
    fromJSON(object: any): CommitID;
    toJSON(message: CommitID): JsonSafe<CommitID>;
    fromPartial(object: Partial<CommitID>): CommitID;
    fromProtoMsg(message: CommitIDProtoMsg): CommitID;
    toProto(message: CommitID): Uint8Array;
    toProtoMsg(message: CommitID): CommitIDProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=commit_info.d.ts.map