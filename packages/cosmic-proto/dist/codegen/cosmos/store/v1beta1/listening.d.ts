import { ResponseCommit, type ResponseCommitSDKType, RequestFinalizeBlock, type RequestFinalizeBlockSDKType, ResponseFinalizeBlock, type ResponseFinalizeBlockSDKType } from '../../../tendermint/abci/types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * StoreKVPair is a KVStore KVPair used for listening to state changes (Sets and Deletes)
 * It optionally includes the StoreKey for the originating KVStore and a Boolean flag to distinguish between Sets and
 * Deletes
 *
 * Since: cosmos-sdk 0.43
 * @name StoreKVPair
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreKVPair
 */
export interface StoreKVPair {
    /**
     * the store key for the KVStore this pair originates from
     */
    storeKey: string;
    /**
     * true indicates a delete operation, false indicates a set operation
     */
    delete: boolean;
    key: Uint8Array;
    value: Uint8Array;
}
export interface StoreKVPairProtoMsg {
    typeUrl: '/cosmos.store.v1beta1.StoreKVPair';
    value: Uint8Array;
}
/**
 * StoreKVPair is a KVStore KVPair used for listening to state changes (Sets and Deletes)
 * It optionally includes the StoreKey for the originating KVStore and a Boolean flag to distinguish between Sets and
 * Deletes
 *
 * Since: cosmos-sdk 0.43
 * @name StoreKVPairSDKType
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreKVPair
 */
export interface StoreKVPairSDKType {
    store_key: string;
    delete: boolean;
    key: Uint8Array;
    value: Uint8Array;
}
/**
 * BlockMetadata contains all the abci event data of a block
 * the file streamer dump them into files together with the state changes.
 * @name BlockMetadata
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.BlockMetadata
 */
export interface BlockMetadata {
    responseCommit?: ResponseCommit;
    requestFinalizeBlock?: RequestFinalizeBlock;
    /**
     * TODO: should we renumber this?
     */
    responseFinalizeBlock?: ResponseFinalizeBlock;
}
export interface BlockMetadataProtoMsg {
    typeUrl: '/cosmos.store.v1beta1.BlockMetadata';
    value: Uint8Array;
}
/**
 * BlockMetadata contains all the abci event data of a block
 * the file streamer dump them into files together with the state changes.
 * @name BlockMetadataSDKType
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.BlockMetadata
 */
export interface BlockMetadataSDKType {
    response_commit?: ResponseCommitSDKType;
    request_finalize_block?: RequestFinalizeBlockSDKType;
    response_finalize_block?: ResponseFinalizeBlockSDKType;
}
/**
 * StoreKVPair is a KVStore KVPair used for listening to state changes (Sets and Deletes)
 * It optionally includes the StoreKey for the originating KVStore and a Boolean flag to distinguish between Sets and
 * Deletes
 *
 * Since: cosmos-sdk 0.43
 * @name StoreKVPair
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.StoreKVPair
 */
export declare const StoreKVPair: {
    typeUrl: "/cosmos.store.v1beta1.StoreKVPair";
    aminoType: "cosmos-sdk/StoreKVPair";
    is(o: any): o is StoreKVPair;
    isSDK(o: any): o is StoreKVPairSDKType;
    encode(message: StoreKVPair, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StoreKVPair;
    fromJSON(object: any): StoreKVPair;
    toJSON(message: StoreKVPair): JsonSafe<StoreKVPair>;
    fromPartial(object: Partial<StoreKVPair>): StoreKVPair;
    fromProtoMsg(message: StoreKVPairProtoMsg): StoreKVPair;
    toProto(message: StoreKVPair): Uint8Array;
    toProtoMsg(message: StoreKVPair): StoreKVPairProtoMsg;
    registerTypeUrl(): void;
};
/**
 * BlockMetadata contains all the abci event data of a block
 * the file streamer dump them into files together with the state changes.
 * @name BlockMetadata
 * @package cosmos.store.v1beta1
 * @see proto type: cosmos.store.v1beta1.BlockMetadata
 */
export declare const BlockMetadata: {
    typeUrl: "/cosmos.store.v1beta1.BlockMetadata";
    aminoType: "cosmos-sdk/BlockMetadata";
    is(o: any): o is BlockMetadata;
    isSDK(o: any): o is BlockMetadataSDKType;
    encode(message: BlockMetadata, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BlockMetadata;
    fromJSON(object: any): BlockMetadata;
    toJSON(message: BlockMetadata): JsonSafe<BlockMetadata>;
    fromPartial(object: Partial<BlockMetadata>): BlockMetadata;
    fromProtoMsg(message: BlockMetadataProtoMsg): BlockMetadata;
    toProto(message: BlockMetadata): Uint8Array;
    toProtoMsg(message: BlockMetadata): BlockMetadataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=listening.d.ts.map