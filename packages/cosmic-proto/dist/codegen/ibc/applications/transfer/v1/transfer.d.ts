import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 */
export interface DenomTrace {
    /**
     * path defines the chain of port/channel identifiers used for tracing the
     * source of the fungible token.
     */
    path: string;
    /**
     * base denomination of the relayed fungible token.
     */
    baseDenom: string;
}
export interface DenomTraceProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.DenomTrace';
    value: Uint8Array;
}
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTraceSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 */
export interface DenomTraceSDKType {
    path: string;
    base_denom: string;
}
/**
 * Params defines the set of IBC transfer parameters.
 * NOTE: To prevent a single token from being transferred, set the
 * TransfersEnabled parameter to true and then set the bank module's SendEnabled
 * parameter for the denomination to false.
 * @name Params
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Params
 */
export interface Params {
    /**
     * send_enabled enables or disables all cross-chain token transfers from this
     * chain.
     */
    sendEnabled: boolean;
    /**
     * receive_enabled enables or disables all cross-chain token transfers to this
     * chain.
     */
    receiveEnabled: boolean;
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of IBC transfer parameters.
 * NOTE: To prevent a single token from being transferred, set the
 * TransfersEnabled parameter to true and then set the bank module's SendEnabled
 * parameter for the denomination to false.
 * @name ParamsSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Params
 */
export interface ParamsSDKType {
    send_enabled: boolean;
    receive_enabled: boolean;
}
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 */
export declare const DenomTrace: {
    typeUrl: "/ibc.applications.transfer.v1.DenomTrace";
    aminoType: "cosmos-sdk/DenomTrace";
    is(o: any): o is DenomTrace;
    isSDK(o: any): o is DenomTraceSDKType;
    encode(message: DenomTrace, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DenomTrace;
    fromJSON(object: any): DenomTrace;
    toJSON(message: DenomTrace): JsonSafe<DenomTrace>;
    fromPartial(object: Partial<DenomTrace>): DenomTrace;
    fromProtoMsg(message: DenomTraceProtoMsg): DenomTrace;
    toProto(message: DenomTrace): Uint8Array;
    toProtoMsg(message: DenomTrace): DenomTraceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the set of IBC transfer parameters.
 * NOTE: To prevent a single token from being transferred, set the
 * TransfersEnabled parameter to true and then set the bank module's SendEnabled
 * parameter for the denomination to false.
 * @name Params
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.applications.transfer.v1.Params";
    aminoType: "cosmos-sdk/Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(message: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(object: any): Params;
    toJSON(message: Params): JsonSafe<Params>;
    fromPartial(object: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=transfer.d.ts.map