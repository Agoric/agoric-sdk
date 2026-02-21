import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BasicAllowance, type BasicAllowanceSDKType, PeriodicAllowance, type PeriodicAllowanceSDKType, AllowedMsgAllowance, type AllowedMsgAllowanceSDKType } from './feegrant.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export interface MsgGrantAllowance {
    /**
     * granter is the address of the user granting an allowance of their funds.
     */
    granter: string;
    /**
     * grantee is the address of the user being granted an allowance of another user's funds.
     */
    grantee: string;
    /**
     * allowance can be any of basic, periodic, allowed fee allowance.
     */
    allowance?: BasicAllowance | PeriodicAllowance | AllowedMsgAllowance | Any | undefined;
}
export interface MsgGrantAllowanceProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance';
    value: Uint8Array;
}
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export interface MsgGrantAllowanceSDKType {
    granter: string;
    grantee: string;
    allowance?: BasicAllowanceSDKType | PeriodicAllowanceSDKType | AllowedMsgAllowanceSDKType | AnySDKType | undefined;
}
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export interface MsgGrantAllowanceResponse {
}
export interface MsgGrantAllowanceResponseProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse';
    value: Uint8Array;
}
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export interface MsgGrantAllowanceResponseSDKType {
}
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export interface MsgRevokeAllowance {
    /**
     * granter is the address of the user granting an allowance of their funds.
     */
    granter: string;
    /**
     * grantee is the address of the user being granted an allowance of another user's funds.
     */
    grantee: string;
}
export interface MsgRevokeAllowanceProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowance';
    value: Uint8Array;
}
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowanceSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export interface MsgRevokeAllowanceSDKType {
    granter: string;
    grantee: string;
}
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export interface MsgRevokeAllowanceResponse {
}
export interface MsgRevokeAllowanceResponseProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse';
    value: Uint8Array;
}
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export interface MsgRevokeAllowanceResponseSDKType {
}
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export interface MsgPruneAllowances {
    /**
     * pruner is the address of the user pruning expired allowances.
     */
    pruner: string;
}
export interface MsgPruneAllowancesProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowances';
    value: Uint8Array;
}
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export interface MsgPruneAllowancesSDKType {
    pruner: string;
}
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export interface MsgPruneAllowancesResponse {
}
export interface MsgPruneAllowancesResponseProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse';
    value: Uint8Array;
}
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponseSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export interface MsgPruneAllowancesResponseSDKType {
}
/**
 * MsgGrantAllowance adds permission for Grantee to spend up to Allowance
 * of fees from the account of Granter.
 * @name MsgGrantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export declare const MsgGrantAllowance: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance";
    aminoType: "cosmos-sdk/MsgGrantAllowance";
    is(o: any): o is MsgGrantAllowance;
    isSDK(o: any): o is MsgGrantAllowanceSDKType;
    encode(message: MsgGrantAllowance, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgGrantAllowance;
    fromJSON(object: any): MsgGrantAllowance;
    toJSON(message: MsgGrantAllowance): JsonSafe<MsgGrantAllowance>;
    fromPartial(object: Partial<MsgGrantAllowance>): MsgGrantAllowance;
    fromProtoMsg(message: MsgGrantAllowanceProtoMsg): MsgGrantAllowance;
    toProto(message: MsgGrantAllowance): Uint8Array;
    toProtoMsg(message: MsgGrantAllowance): MsgGrantAllowanceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgGrantAllowanceResponse defines the Msg/GrantAllowanceResponse response type.
 * @name MsgGrantAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse
 */
export declare const MsgGrantAllowanceResponse: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowanceResponse";
    aminoType: "cosmos-sdk/MsgGrantAllowanceResponse";
    is(o: any): o is MsgGrantAllowanceResponse;
    isSDK(o: any): o is MsgGrantAllowanceResponseSDKType;
    encode(_: MsgGrantAllowanceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgGrantAllowanceResponse;
    fromJSON(_: any): MsgGrantAllowanceResponse;
    toJSON(_: MsgGrantAllowanceResponse): JsonSafe<MsgGrantAllowanceResponse>;
    fromPartial(_: Partial<MsgGrantAllowanceResponse>): MsgGrantAllowanceResponse;
    fromProtoMsg(message: MsgGrantAllowanceResponseProtoMsg): MsgGrantAllowanceResponse;
    toProto(message: MsgGrantAllowanceResponse): Uint8Array;
    toProtoMsg(message: MsgGrantAllowanceResponse): MsgGrantAllowanceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRevokeAllowance removes any existing Allowance from Granter to Grantee.
 * @name MsgRevokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowance
 */
export declare const MsgRevokeAllowance: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgRevokeAllowance";
    aminoType: "cosmos-sdk/MsgRevokeAllowance";
    is(o: any): o is MsgRevokeAllowance;
    isSDK(o: any): o is MsgRevokeAllowanceSDKType;
    encode(message: MsgRevokeAllowance, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeAllowance;
    fromJSON(object: any): MsgRevokeAllowance;
    toJSON(message: MsgRevokeAllowance): JsonSafe<MsgRevokeAllowance>;
    fromPartial(object: Partial<MsgRevokeAllowance>): MsgRevokeAllowance;
    fromProtoMsg(message: MsgRevokeAllowanceProtoMsg): MsgRevokeAllowance;
    toProto(message: MsgRevokeAllowance): Uint8Array;
    toProtoMsg(message: MsgRevokeAllowance): MsgRevokeAllowanceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRevokeAllowanceResponse defines the Msg/RevokeAllowanceResponse response type.
 * @name MsgRevokeAllowanceResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse
 */
export declare const MsgRevokeAllowanceResponse: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgRevokeAllowanceResponse";
    aminoType: "cosmos-sdk/MsgRevokeAllowanceResponse";
    is(o: any): o is MsgRevokeAllowanceResponse;
    isSDK(o: any): o is MsgRevokeAllowanceResponseSDKType;
    encode(_: MsgRevokeAllowanceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeAllowanceResponse;
    fromJSON(_: any): MsgRevokeAllowanceResponse;
    toJSON(_: MsgRevokeAllowanceResponse): JsonSafe<MsgRevokeAllowanceResponse>;
    fromPartial(_: Partial<MsgRevokeAllowanceResponse>): MsgRevokeAllowanceResponse;
    fromProtoMsg(message: MsgRevokeAllowanceResponseProtoMsg): MsgRevokeAllowanceResponse;
    toProto(message: MsgRevokeAllowanceResponse): Uint8Array;
    toProtoMsg(message: MsgRevokeAllowanceResponse): MsgRevokeAllowanceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgPruneAllowances prunes expired fee allowances.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowances
 */
export declare const MsgPruneAllowances: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgPruneAllowances";
    aminoType: "cosmos-sdk/MsgPruneAllowances";
    is(o: any): o is MsgPruneAllowances;
    isSDK(o: any): o is MsgPruneAllowancesSDKType;
    encode(message: MsgPruneAllowances, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPruneAllowances;
    fromJSON(object: any): MsgPruneAllowances;
    toJSON(message: MsgPruneAllowances): JsonSafe<MsgPruneAllowances>;
    fromPartial(object: Partial<MsgPruneAllowances>): MsgPruneAllowances;
    fromProtoMsg(message: MsgPruneAllowancesProtoMsg): MsgPruneAllowances;
    toProto(message: MsgPruneAllowances): Uint8Array;
    toProtoMsg(message: MsgPruneAllowances): MsgPruneAllowancesProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgPruneAllowancesResponse defines the Msg/PruneAllowancesResponse response type.
 *
 * Since cosmos-sdk 0.50
 * @name MsgPruneAllowancesResponse
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse
 */
export declare const MsgPruneAllowancesResponse: {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgPruneAllowancesResponse";
    aminoType: "cosmos-sdk/MsgPruneAllowancesResponse";
    is(o: any): o is MsgPruneAllowancesResponse;
    isSDK(o: any): o is MsgPruneAllowancesResponseSDKType;
    encode(_: MsgPruneAllowancesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPruneAllowancesResponse;
    fromJSON(_: any): MsgPruneAllowancesResponse;
    toJSON(_: MsgPruneAllowancesResponse): JsonSafe<MsgPruneAllowancesResponse>;
    fromPartial(_: Partial<MsgPruneAllowancesResponse>): MsgPruneAllowancesResponse;
    fromProtoMsg(message: MsgPruneAllowancesResponseProtoMsg): MsgPruneAllowancesResponse;
    toProto(message: MsgPruneAllowancesResponse): Uint8Array;
    toProtoMsg(message: MsgPruneAllowancesResponse): MsgPruneAllowancesResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map