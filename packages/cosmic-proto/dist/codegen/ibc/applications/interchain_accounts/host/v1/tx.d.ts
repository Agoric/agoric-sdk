import { Params, type ParamsSDKType, QueryRequest, type QueryRequestSDKType } from './host.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParams
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * signer address
     */
    signer: string;
    /**
     * params defines the 27-interchain-accounts/host parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParamsSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    signer: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgModuleQuerySafe defines the payload for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafe
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafe
 */
export interface MsgModuleQuerySafe {
    /**
     * signer address
     */
    signer: string;
    /**
     * requests defines the module safe queries to execute.
     */
    requests: QueryRequest[];
}
export interface MsgModuleQuerySafeProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafe';
    value: Uint8Array;
}
/**
 * MsgModuleQuerySafe defines the payload for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafeSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafe
 */
export interface MsgModuleQuerySafeSDKType {
    signer: string;
    requests: QueryRequestSDKType[];
}
/**
 * MsgModuleQuerySafeResponse defines the response for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafeResponse
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafeResponse
 */
export interface MsgModuleQuerySafeResponse {
    /**
     * height at which the responses were queried
     */
    height: bigint;
    /**
     * protobuf encoded responses for each query
     */
    responses: Uint8Array[];
}
export interface MsgModuleQuerySafeResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafeResponse';
    value: Uint8Array;
}
/**
 * MsgModuleQuerySafeResponse defines the response for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafeResponseSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafeResponse
 */
export interface MsgModuleQuerySafeResponseSDKType {
    height: bigint;
    responses: Uint8Array[];
}
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParams
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/MsgUpdateParams";
    is(o: any): o is MsgUpdateParams;
    isSDK(o: any): o is MsgUpdateParamsSDKType;
    encode(message: MsgUpdateParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams;
    fromJSON(object: any): MsgUpdateParams;
    toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams>;
    fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams;
    fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams;
    toProto(message: MsgUpdateParams): Uint8Array;
    toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
    is(o: any): o is MsgUpdateParamsResponse;
    isSDK(o: any): o is MsgUpdateParamsResponseSDKType;
    encode(_: MsgUpdateParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParamsResponse;
    fromJSON(_: any): MsgUpdateParamsResponse;
    toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse>;
    fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse;
    fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg): MsgUpdateParamsResponse;
    toProto(message: MsgUpdateParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgModuleQuerySafe defines the payload for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafe
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafe
 */
export declare const MsgModuleQuerySafe: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafe";
    aminoType: "cosmos-sdk/MsgModuleQuerySafe";
    is(o: any): o is MsgModuleQuerySafe;
    isSDK(o: any): o is MsgModuleQuerySafeSDKType;
    encode(message: MsgModuleQuerySafe, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgModuleQuerySafe;
    fromJSON(object: any): MsgModuleQuerySafe;
    toJSON(message: MsgModuleQuerySafe): JsonSafe<MsgModuleQuerySafe>;
    fromPartial(object: Partial<MsgModuleQuerySafe>): MsgModuleQuerySafe;
    fromProtoMsg(message: MsgModuleQuerySafeProtoMsg): MsgModuleQuerySafe;
    toProto(message: MsgModuleQuerySafe): Uint8Array;
    toProtoMsg(message: MsgModuleQuerySafe): MsgModuleQuerySafeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgModuleQuerySafeResponse defines the response for Msg/ModuleQuerySafe
 * @name MsgModuleQuerySafeResponse
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafeResponse
 */
export declare const MsgModuleQuerySafeResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.MsgModuleQuerySafeResponse";
    aminoType: "cosmos-sdk/MsgModuleQuerySafeResponse";
    is(o: any): o is MsgModuleQuerySafeResponse;
    isSDK(o: any): o is MsgModuleQuerySafeResponseSDKType;
    encode(message: MsgModuleQuerySafeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgModuleQuerySafeResponse;
    fromJSON(object: any): MsgModuleQuerySafeResponse;
    toJSON(message: MsgModuleQuerySafeResponse): JsonSafe<MsgModuleQuerySafeResponse>;
    fromPartial(object: Partial<MsgModuleQuerySafeResponse>): MsgModuleQuerySafeResponse;
    fromProtoMsg(message: MsgModuleQuerySafeResponseProtoMsg): MsgModuleQuerySafeResponse;
    toProto(message: MsgModuleQuerySafeResponse): Uint8Array;
    toProtoMsg(message: MsgModuleQuerySafeResponse): MsgModuleQuerySafeResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map