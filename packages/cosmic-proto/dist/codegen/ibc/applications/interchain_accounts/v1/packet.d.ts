import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Type defines a classification of message issued from a controller chain to its associated interchain accounts
 * host
 */
export declare enum Type {
    /** TYPE_UNSPECIFIED - Default zero value enumeration */
    TYPE_UNSPECIFIED = 0,
    /** TYPE_EXECUTE_TX - Execute a transaction on an interchain accounts host chain */
    TYPE_EXECUTE_TX = 1,
    UNRECOGNIZED = -1
}
export declare const TypeSDKType: typeof Type;
export declare function typeFromJSON(object: any): Type;
export declare function typeToJSON(object: Type): string;
/**
 * InterchainAccountPacketData is comprised of a raw transaction, type of transaction and optional memo field.
 * @name InterchainAccountPacketData
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccountPacketData
 */
export interface InterchainAccountPacketData {
    type: Type;
    data: Uint8Array;
    memo: string;
}
export interface InterchainAccountPacketDataProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.v1.InterchainAccountPacketData';
    value: Uint8Array;
}
/**
 * InterchainAccountPacketData is comprised of a raw transaction, type of transaction and optional memo field.
 * @name InterchainAccountPacketDataSDKType
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccountPacketData
 */
export interface InterchainAccountPacketDataSDKType {
    type: Type;
    data: Uint8Array;
    memo: string;
}
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending transactions to an SDK host chain.
 * @name CosmosTx
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.CosmosTx
 */
export interface CosmosTx {
    messages: Any[];
}
export interface CosmosTxProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.v1.CosmosTx';
    value: Uint8Array;
}
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending transactions to an SDK host chain.
 * @name CosmosTxSDKType
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.CosmosTx
 */
export interface CosmosTxSDKType {
    messages: AnySDKType[];
}
/**
 * InterchainAccountPacketData is comprised of a raw transaction, type of transaction and optional memo field.
 * @name InterchainAccountPacketData
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccountPacketData
 */
export declare const InterchainAccountPacketData: {
    typeUrl: "/ibc.applications.interchain_accounts.v1.InterchainAccountPacketData";
    aminoType: "cosmos-sdk/InterchainAccountPacketData";
    is(o: any): o is InterchainAccountPacketData;
    isSDK(o: any): o is InterchainAccountPacketDataSDKType;
    encode(message: InterchainAccountPacketData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): InterchainAccountPacketData;
    fromJSON(object: any): InterchainAccountPacketData;
    toJSON(message: InterchainAccountPacketData): JsonSafe<InterchainAccountPacketData>;
    fromPartial(object: Partial<InterchainAccountPacketData>): InterchainAccountPacketData;
    fromProtoMsg(message: InterchainAccountPacketDataProtoMsg): InterchainAccountPacketData;
    toProto(message: InterchainAccountPacketData): Uint8Array;
    toProtoMsg(message: InterchainAccountPacketData): InterchainAccountPacketDataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending transactions to an SDK host chain.
 * @name CosmosTx
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.CosmosTx
 */
export declare const CosmosTx: {
    typeUrl: "/ibc.applications.interchain_accounts.v1.CosmosTx";
    aminoType: "cosmos-sdk/CosmosTx";
    is(o: any): o is CosmosTx;
    isSDK(o: any): o is CosmosTxSDKType;
    encode(message: CosmosTx, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CosmosTx;
    fromJSON(object: any): CosmosTx;
    toJSON(message: CosmosTx): JsonSafe<CosmosTx>;
    fromPartial(object: Partial<CosmosTx>): CosmosTx;
    fromProtoMsg(message: CosmosTxProtoMsg): CosmosTx;
    toProto(message: CosmosTx): Uint8Array;
    toProtoMsg(message: CosmosTx): CosmosTxProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=packet.d.ts.map