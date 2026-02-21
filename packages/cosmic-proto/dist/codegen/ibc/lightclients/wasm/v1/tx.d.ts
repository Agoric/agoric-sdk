import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCode
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export interface MsgStoreCode {
    /**
     * signer address
     */
    signer: string;
    /**
     * wasm byte code of light client contract. It can be raw or gzip compressed
     */
    wasmByteCode: Uint8Array;
}
export interface MsgStoreCodeProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCode';
    value: Uint8Array;
}
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCodeSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export interface MsgStoreCodeSDKType {
    signer: string;
    wasm_byte_code: Uint8Array;
}
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export interface MsgStoreCodeResponse {
    /**
     * checksum is the sha256 hash of the stored code
     */
    checksum: Uint8Array;
}
export interface MsgStoreCodeResponseProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCodeResponse';
    value: Uint8Array;
}
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export interface MsgStoreCodeResponseSDKType {
    checksum: Uint8Array;
}
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export interface MsgRemoveChecksum {
    /**
     * signer address
     */
    signer: string;
    /**
     * checksum is the sha256 hash to be removed from the store
     */
    checksum: Uint8Array;
}
export interface MsgRemoveChecksumProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksum';
    value: Uint8Array;
}
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksumSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export interface MsgRemoveChecksumSDKType {
    signer: string;
    checksum: Uint8Array;
}
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export interface MsgRemoveChecksumResponse {
}
export interface MsgRemoveChecksumResponseProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse';
    value: Uint8Array;
}
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export interface MsgRemoveChecksumResponseSDKType {
}
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export interface MsgMigrateContract {
    /**
     * signer address
     */
    signer: string;
    /**
     * the client id of the contract
     */
    clientId: string;
    /**
     * checksum is the sha256 hash of the new wasm byte code for the contract
     */
    checksum: Uint8Array;
    /**
     * the json encoded message to be passed to the contract on migration
     */
    msg: Uint8Array;
}
export interface MsgMigrateContractProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContract';
    value: Uint8Array;
}
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContractSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export interface MsgMigrateContractSDKType {
    signer: string;
    client_id: string;
    checksum: Uint8Array;
    msg: Uint8Array;
}
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export interface MsgMigrateContractResponse {
}
export interface MsgMigrateContractResponseProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContractResponse';
    value: Uint8Array;
}
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export interface MsgMigrateContractResponseSDKType {
}
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCode
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export declare const MsgStoreCode: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgStoreCode";
    aminoType: "cosmos-sdk/MsgStoreCode";
    is(o: any): o is MsgStoreCode;
    isSDK(o: any): o is MsgStoreCodeSDKType;
    encode(message: MsgStoreCode, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgStoreCode;
    fromJSON(object: any): MsgStoreCode;
    toJSON(message: MsgStoreCode): JsonSafe<MsgStoreCode>;
    fromPartial(object: Partial<MsgStoreCode>): MsgStoreCode;
    fromProtoMsg(message: MsgStoreCodeProtoMsg): MsgStoreCode;
    toProto(message: MsgStoreCode): Uint8Array;
    toProtoMsg(message: MsgStoreCode): MsgStoreCodeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export declare const MsgStoreCodeResponse: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgStoreCodeResponse";
    aminoType: "cosmos-sdk/MsgStoreCodeResponse";
    is(o: any): o is MsgStoreCodeResponse;
    isSDK(o: any): o is MsgStoreCodeResponseSDKType;
    encode(message: MsgStoreCodeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgStoreCodeResponse;
    fromJSON(object: any): MsgStoreCodeResponse;
    toJSON(message: MsgStoreCodeResponse): JsonSafe<MsgStoreCodeResponse>;
    fromPartial(object: Partial<MsgStoreCodeResponse>): MsgStoreCodeResponse;
    fromProtoMsg(message: MsgStoreCodeResponseProtoMsg): MsgStoreCodeResponse;
    toProto(message: MsgStoreCodeResponse): Uint8Array;
    toProtoMsg(message: MsgStoreCodeResponse): MsgStoreCodeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export declare const MsgRemoveChecksum: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgRemoveChecksum";
    aminoType: "cosmos-sdk/MsgRemoveChecksum";
    is(o: any): o is MsgRemoveChecksum;
    isSDK(o: any): o is MsgRemoveChecksumSDKType;
    encode(message: MsgRemoveChecksum, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRemoveChecksum;
    fromJSON(object: any): MsgRemoveChecksum;
    toJSON(message: MsgRemoveChecksum): JsonSafe<MsgRemoveChecksum>;
    fromPartial(object: Partial<MsgRemoveChecksum>): MsgRemoveChecksum;
    fromProtoMsg(message: MsgRemoveChecksumProtoMsg): MsgRemoveChecksum;
    toProto(message: MsgRemoveChecksum): Uint8Array;
    toProtoMsg(message: MsgRemoveChecksum): MsgRemoveChecksumProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export declare const MsgRemoveChecksumResponse: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse";
    aminoType: "cosmos-sdk/MsgRemoveChecksumResponse";
    is(o: any): o is MsgRemoveChecksumResponse;
    isSDK(o: any): o is MsgRemoveChecksumResponseSDKType;
    encode(_: MsgRemoveChecksumResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRemoveChecksumResponse;
    fromJSON(_: any): MsgRemoveChecksumResponse;
    toJSON(_: MsgRemoveChecksumResponse): JsonSafe<MsgRemoveChecksumResponse>;
    fromPartial(_: Partial<MsgRemoveChecksumResponse>): MsgRemoveChecksumResponse;
    fromProtoMsg(message: MsgRemoveChecksumResponseProtoMsg): MsgRemoveChecksumResponse;
    toProto(message: MsgRemoveChecksumResponse): Uint8Array;
    toProtoMsg(message: MsgRemoveChecksumResponse): MsgRemoveChecksumResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export declare const MsgMigrateContract: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgMigrateContract";
    aminoType: "cosmos-sdk/MsgMigrateContract";
    is(o: any): o is MsgMigrateContract;
    isSDK(o: any): o is MsgMigrateContractSDKType;
    encode(message: MsgMigrateContract, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgMigrateContract;
    fromJSON(object: any): MsgMigrateContract;
    toJSON(message: MsgMigrateContract): JsonSafe<MsgMigrateContract>;
    fromPartial(object: Partial<MsgMigrateContract>): MsgMigrateContract;
    fromProtoMsg(message: MsgMigrateContractProtoMsg): MsgMigrateContract;
    toProto(message: MsgMigrateContract): Uint8Array;
    toProtoMsg(message: MsgMigrateContract): MsgMigrateContractProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export declare const MsgMigrateContractResponse: {
    typeUrl: "/ibc.lightclients.wasm.v1.MsgMigrateContractResponse";
    aminoType: "cosmos-sdk/MsgMigrateContractResponse";
    is(o: any): o is MsgMigrateContractResponse;
    isSDK(o: any): o is MsgMigrateContractResponseSDKType;
    encode(_: MsgMigrateContractResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgMigrateContractResponse;
    fromJSON(_: any): MsgMigrateContractResponse;
    toJSON(_: MsgMigrateContractResponse): JsonSafe<MsgMigrateContractResponse>;
    fromPartial(_: Partial<MsgMigrateContractResponse>): MsgMigrateContractResponse;
    fromProtoMsg(message: MsgMigrateContractResponseProtoMsg): MsgMigrateContractResponse;
    toProto(message: MsgMigrateContractResponse): Uint8Array;
    toProtoMsg(message: MsgMigrateContractResponse): MsgMigrateContractResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map