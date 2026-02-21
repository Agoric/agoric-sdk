import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { BIP44Params, type BIP44ParamsSDKType } from '../../hd/v1/hd.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Record is used for representing a key in the keyring.
 * @name Record
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Record
 */
export interface Record {
    /**
     * name represents a name of Record
     */
    name: string;
    /**
     * pub_key represents a public key in any format
     */
    pubKey?: Any;
    /**
     * local stores the private key locally.
     */
    local?: Record_Local;
    /**
     * ledger stores the information about a Ledger key.
     */
    ledger?: Record_Ledger;
    /**
     * Multi does not store any other information.
     */
    multi?: Record_Multi;
    /**
     * Offline does not store any other information.
     */
    offline?: Record_Offline;
}
export interface RecordProtoMsg {
    typeUrl: '/cosmos.crypto.keyring.v1.Record';
    value: Uint8Array;
}
/**
 * Record is used for representing a key in the keyring.
 * @name RecordSDKType
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Record
 */
export interface RecordSDKType {
    name: string;
    pub_key?: AnySDKType;
    local?: Record_LocalSDKType;
    ledger?: Record_LedgerSDKType;
    multi?: Record_MultiSDKType;
    offline?: Record_OfflineSDKType;
}
/**
 * Item is a keyring item stored in a keyring backend.
 * Local item
 * @name Record_Local
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Local
 */
export interface Record_Local {
    privKey?: Any;
}
export interface Record_LocalProtoMsg {
    typeUrl: '/cosmos.crypto.keyring.v1.Local';
    value: Uint8Array;
}
/**
 * Item is a keyring item stored in a keyring backend.
 * Local item
 * @name Record_LocalSDKType
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Local
 */
export interface Record_LocalSDKType {
    priv_key?: AnySDKType;
}
/**
 * Ledger item
 * @name Record_Ledger
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Ledger
 */
export interface Record_Ledger {
    path?: BIP44Params;
}
export interface Record_LedgerProtoMsg {
    typeUrl: '/cosmos.crypto.keyring.v1.Ledger';
    value: Uint8Array;
}
/**
 * Ledger item
 * @name Record_LedgerSDKType
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Ledger
 */
export interface Record_LedgerSDKType {
    path?: BIP44ParamsSDKType;
}
/**
 * Multi item
 * @name Record_Multi
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Multi
 */
export interface Record_Multi {
}
export interface Record_MultiProtoMsg {
    typeUrl: '/cosmos.crypto.keyring.v1.Multi';
    value: Uint8Array;
}
/**
 * Multi item
 * @name Record_MultiSDKType
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Multi
 */
export interface Record_MultiSDKType {
}
/**
 * Offline item
 * @name Record_Offline
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Offline
 */
export interface Record_Offline {
}
export interface Record_OfflineProtoMsg {
    typeUrl: '/cosmos.crypto.keyring.v1.Offline';
    value: Uint8Array;
}
/**
 * Offline item
 * @name Record_OfflineSDKType
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Offline
 */
export interface Record_OfflineSDKType {
}
/**
 * Record is used for representing a key in the keyring.
 * @name Record
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Record
 */
export declare const Record: {
    typeUrl: "/cosmos.crypto.keyring.v1.Record";
    aminoType: "cosmos-sdk/Record";
    is(o: any): o is Record;
    isSDK(o: any): o is RecordSDKType;
    encode(message: Record, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Record;
    fromJSON(object: any): Record;
    toJSON(message: Record): JsonSafe<Record>;
    fromPartial(object: Partial<Record>): Record;
    fromProtoMsg(message: RecordProtoMsg): Record;
    toProto(message: Record): Uint8Array;
    toProtoMsg(message: Record): RecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Item is a keyring item stored in a keyring backend.
 * Local item
 * @name Record_Local
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Local
 */
export declare const Record_Local: {
    typeUrl: "/cosmos.crypto.keyring.v1.Local";
    aminoType: "cosmos-sdk/Local";
    is(o: any): o is Record_Local;
    isSDK(o: any): o is Record_LocalSDKType;
    encode(message: Record_Local, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Record_Local;
    fromJSON(object: any): Record_Local;
    toJSON(message: Record_Local): JsonSafe<Record_Local>;
    fromPartial(object: Partial<Record_Local>): Record_Local;
    fromProtoMsg(message: Record_LocalProtoMsg): Record_Local;
    toProto(message: Record_Local): Uint8Array;
    toProtoMsg(message: Record_Local): Record_LocalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Ledger item
 * @name Record_Ledger
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Ledger
 */
export declare const Record_Ledger: {
    typeUrl: "/cosmos.crypto.keyring.v1.Ledger";
    aminoType: "cosmos-sdk/Ledger";
    is(o: any): o is Record_Ledger;
    isSDK(o: any): o is Record_LedgerSDKType;
    encode(message: Record_Ledger, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Record_Ledger;
    fromJSON(object: any): Record_Ledger;
    toJSON(message: Record_Ledger): JsonSafe<Record_Ledger>;
    fromPartial(object: Partial<Record_Ledger>): Record_Ledger;
    fromProtoMsg(message: Record_LedgerProtoMsg): Record_Ledger;
    toProto(message: Record_Ledger): Uint8Array;
    toProtoMsg(message: Record_Ledger): Record_LedgerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Multi item
 * @name Record_Multi
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Multi
 */
export declare const Record_Multi: {
    typeUrl: "/cosmos.crypto.keyring.v1.Multi";
    aminoType: "cosmos-sdk/Multi";
    is(o: any): o is Record_Multi;
    isSDK(o: any): o is Record_MultiSDKType;
    encode(_: Record_Multi, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Record_Multi;
    fromJSON(_: any): Record_Multi;
    toJSON(_: Record_Multi): JsonSafe<Record_Multi>;
    fromPartial(_: Partial<Record_Multi>): Record_Multi;
    fromProtoMsg(message: Record_MultiProtoMsg): Record_Multi;
    toProto(message: Record_Multi): Uint8Array;
    toProtoMsg(message: Record_Multi): Record_MultiProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Offline item
 * @name Record_Offline
 * @package cosmos.crypto.keyring.v1
 * @see proto type: cosmos.crypto.keyring.v1.Offline
 */
export declare const Record_Offline: {
    typeUrl: "/cosmos.crypto.keyring.v1.Offline";
    aminoType: "cosmos-sdk/Offline";
    is(o: any): o is Record_Offline;
    isSDK(o: any): o is Record_OfflineSDKType;
    encode(_: Record_Offline, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Record_Offline;
    fromJSON(_: any): Record_Offline;
    toJSON(_: Record_Offline): JsonSafe<Record_Offline>;
    fromPartial(_: Partial<Record_Offline>): Record_Offline;
    fromProtoMsg(message: Record_OfflineProtoMsg): Record_Offline;
    toProto(message: Record_Offline): Uint8Array;
    toProtoMsg(message: Record_Offline): Record_OfflineProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=record.d.ts.map